'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import Image from 'next/image';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  department?: string;
  designation?: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_selfie_url: string | null;
  total_hours: number | null;
  status: string;
  user: User;
}

interface TodayRecord {
  user: User;
  attendance: {
    id: string;
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_selfie_url: string | null;
    total_hours: number | null;
    status: string;
  } | null;
  attendance_status: 'checked_in' | 'checked_out' | 'not_checked_in';
}

interface TodaySummary {
  total: number;
  checked_in: number;
  checked_out: number;
  not_checked_in: number;
}

interface ReportRow {
  user: User;
  total_days_present: number;
  total_hours: number;
  avg_hours: number;
  late_count: number;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtHours(h: number | null): string {
  if (!h) return '—';
  return `${h.toFixed(1)}h`;
}

const attendanceStatusStyle: Record<string, string> = {
  checked_in: 'bg-green-100 text-green-700 border border-green-200',
  checked_out: 'bg-blue-100 text-blue-700 border border-blue-200',
  not_checked_in: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const attendanceStatusLabel: Record<string, string> = {
  checked_in: 'Checked In',
  checked_out: 'Completed',
  not_checked_in: 'Not Yet',
};

const recordStatusStyle: Record<string, string> = {
  present: 'bg-green-100 text-green-700 border border-green-200',
  half_day: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  absent: 'bg-red-100 text-red-700 border border-red-200',
  weekend: 'bg-gray-100 text-gray-500 border border-gray-200',
  holiday: 'bg-purple-100 text-purple-700 border border-purple-200',
};

function StatusChip({ status, label }: { status: string; label?: string }) {
  const style = recordStatusStyle[status] || attendanceStatusStyle[status] || 'bg-gray-100 text-gray-500 border border-gray-200';
  const text = label || (status === 'half_day' ? 'Half Day' : status.charAt(0).toUpperCase() + status.slice(1));
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {text}
    </span>
  );
}

function selfieUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${base}/${url}`;
}

function SelfieThumb({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-gray-400 text-xs">—</span>;
  const fullUrl = selfieUrl(url);
  return (
    <>
      <Image
        src={fullUrl}
        alt="Check-in selfie"
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover cursor-pointer ring-1 ring-gray-200"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <Image src={fullUrl} alt="Selfie" width={400} height={400} className="max-w-sm max-h-screen rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

function EmployeeCell({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
        {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{user.first_name} {user.last_name}</p>
        <p className="text-xs text-gray-500">{user.employee_id}</p>
      </div>
    </div>
  );
}

// ─── Today Tab ───────────────────────────────────────────────────────────────

function TodayTab() {
  const [records, setRecords] = useState<TodayRecord[]>([]);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/org/attendance/today');
        const data = res.data.data;
        setRecords(data.records || []);
        setSummary(data.summary);
        const depts = [...new Set((data.records as TodayRecord[]).map((r) => r.user.department).filter(Boolean))] as string[];
        setDepartments(depts);
      } catch {
        toast.error('Failed to load today\'s attendance');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = records.filter((r) =>
    deptFilter === 'all' || r.user.department === deptFilter
  );

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      sortable: false,
      render: (_: unknown, row: TodayRecord) => <EmployeeCell user={row.user} />,
    },
    {
      key: 'user.department',
      label: 'Department',
      render: (_: unknown, row: TodayRecord) => (
        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-700">{row.user.department || '—'}</span>
      ),
    },
    {
      key: 'check_in_time',
      label: 'Check In',
      render: (_: unknown, row: TodayRecord) => (
        <span className="text-sm">{fmtTime(row.attendance?.check_in_time ?? null)}</span>
      ),
    },
    {
      key: 'check_out_time',
      label: 'Check Out',
      render: (_: unknown, row: TodayRecord) => (
        <span className="text-sm">{fmtTime(row.attendance?.check_out_time ?? null)}</span>
      ),
    },
    {
      key: 'total_hours',
      label: 'Hours',
      render: (_: unknown, row: TodayRecord) => (
        <span className="text-sm">{fmtHours(row.attendance?.total_hours ?? null)}</span>
      ),
    },
    {
      key: 'selfie',
      label: 'Selfie',
      render: (_: unknown, row: TodayRecord) => <SelfieThumb url={row.attendance?.check_in_selfie_url ?? null} />,
    },
    {
      key: 'attendance_status',
      label: 'Status',
      render: (_: unknown, row: TodayRecord) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${attendanceStatusStyle[row.attendance_status]}`}>
          {attendanceStatusLabel[row.attendance_status]}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Employees', value: summary.total, color: 'text-gray-900' },
            { label: 'Checked In', value: summary.checked_in, color: 'text-green-600' },
            { label: 'Checked Out', value: summary.checked_out, color: 'text-blue-600' },
            { label: 'Not Yet', value: summary.not_checked_in, color: 'text-gray-400' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color} mt-0.5`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
          searchPlaceholder="Search employees..."
          loading={loading}
          filterContent={
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? 'all')}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          }
        />
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  const fetchRecords = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get('/api/org/attendance', { params: { date: d, limit: 200 } });
      const list: AttendanceRecord[] = res.data.data || [];
      setRecords(list);
      const depts = [...new Set(list.map((r) => r.user?.department).filter(Boolean))] as string[];
      setDepartments(depts);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(date); }, [date, fetchRecords]);

  const filtered = records.filter((r) => {
    const deptMatch = deptFilter === 'all' || r.user?.department === deptFilter;
    const statusMatch = statusFilter === 'all' || r.status === statusFilter;
    return deptMatch && statusMatch;
  });

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      sortable: false,
      render: (_: unknown, row: AttendanceRecord) => <EmployeeCell user={row.user} />,
    },
    {
      key: 'user.department',
      label: 'Department',
      render: (_: unknown, row: AttendanceRecord) => (
        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-700">{row.user?.department || '—'}</span>
      ),
    },
    {
      key: 'check_in_time',
      label: 'Check In',
      render: (v: unknown) => <span className="text-sm">{fmtTime(v as string | null)}</span>,
    },
    {
      key: 'check_out_time',
      label: 'Check Out',
      render: (v: unknown) => <span className="text-sm">{fmtTime(v as string | null)}</span>,
    },
    {
      key: 'total_hours',
      label: 'Hours',
      render: (v: unknown) => <span className="text-sm">{fmtHours(v as number | null)}</span>,
    },
    {
      key: 'check_in_selfie_url',
      label: 'Selfie',
      render: (v: unknown) => <SelfieThumb url={v as string | null} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: unknown) => <StatusChip status={String(v)} />,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? 'all')}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="half_day">Half Day</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="weekend">Weekend</SelectItem>
            <SelectItem value="holiday">Holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
        searchPlaceholder="Search employees..."
        loading={loading}
      />
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [deptFilter, setDeptFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (m: string, dept: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { month: m };
      if (dept !== 'all') params.department = dept;
      const res = await api.get('/api/org/attendance/report', { params });
      const data: ReportRow[] = res.data.data?.report || [];
      setReport(data);
      const depts = [...new Set(data.map((r) => r.user.department).filter(Boolean))] as string[];
      setDepartments(depts);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(month, deptFilter); }, [month, deptFilter, fetchReport]);

  const exportCsv = () => {
    const rows = [
      ['Employee Name', 'Employee ID', 'Department', 'Days Present', 'Total Hours', 'Avg Hours/Day', 'Late Days'],
      ...report.map((r) => [
        `${r.user.first_name} ${r.user.last_name}`,
        r.user.employee_id,
        r.user.department || '',
        String(r.total_days_present),
        String(r.total_hours),
        String(r.avg_hours),
        String(r.late_count),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      sortable: false,
      render: (_: unknown, row: ReportRow) => <EmployeeCell user={row.user} />,
    },
    {
      key: 'user.department',
      label: 'Department',
      render: (_: unknown, row: ReportRow) => (
        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-700">{row.user.department || '—'}</span>
      ),
    },
    {
      key: 'total_days_present',
      label: 'Days Present',
      sortable: true,
      render: (v: unknown) => <span className="text-sm font-medium">{String(v)}</span>,
    },
    {
      key: 'total_hours',
      label: 'Total Hours',
      sortable: true,
      render: (v: unknown) => <span className="text-sm">{Number(v).toFixed(1)}h</span>,
    },
    {
      key: 'avg_hours',
      label: 'Avg Hours/Day',
      sortable: true,
      render: (v: unknown) => <span className="text-sm">{Number(v).toFixed(1)}h</span>,
    },
    {
      key: 'late_count',
      label: 'Late Days',
      sortable: true,
      render: (v: unknown) => (
        <span className={`text-sm font-medium ${Number(v) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
          {String(v)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          />
          <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? 'all')}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={report.length === 0}>
          <Download className="w-4 h-4 mr-1.5" />
          Export CSV
        </Button>
      </div>
      <DataTable
        data={report as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Parameters<typeof DataTable>[0]['columns']}
        searchPlaceholder="Search employees..."
        loading={loading}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track employee attendance, view history and monthly reports</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <TodayTab />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
