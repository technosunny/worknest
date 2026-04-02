'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string | null;
  department: string | null;
}

interface RosterEntry {
  employee: Employee;
  shifts: Record<string, string>; // "2026-03-01" -> "dayshift"
}

const SHIFT_COLORS: Record<string, string> = {
  dayshift: 'bg-blue-100 text-blue-800',
  nightshift: 'bg-purple-100 text-purple-800',
  wof: 'bg-gray-100 text-gray-500',
};

const SHIFT_LABELS: Record<string, string> = {
  dayshift: 'Day',
  nightshift: 'Night',
  wof: 'WOF',
};

function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { day: '2-digit', weekday: 'short' });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ uploaded: number; employees: number; dates: number; warnings?: { row: number; message: string }[] } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dates = useMemo(() => getMonthDates(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const startDate = toISODate(dates[0]);
      const endDate = toISODate(dates[dates.length - 1]);
      const params: Record<string, string> = { start_date: startDate, end_date: endDate };
      if (deptFilter !== 'all') params.department = deptFilter;

      const res = await api.get('/api/org/roster', { params });
      const data = res.data.data;
      setRoster(data.roster || []);

      // Extract departments
      const depts = [...new Set(
        (data.roster || [])
          .map((r: RosterEntry) => r.employee.department)
          .filter(Boolean)
      )] as string[];
      if (depts.length > 0) setDepartments(depts);
    } catch {
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, deptFilter]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDownloadTemplate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dateCols = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dateCols.push(`${String(d).padStart(2, '0')}-${monthNames[month]}-${year}`);
    }

    const header = ['Employee Email ID/Employee ID', ...dateCols].join(',');
    const sample = ['employee@company.com', ...dateCols.map((_, i) => (i % 7 === 0 ? 'WOF' : 'dayshift'))].join(',');
    const csv = `${header}\n${sample}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster_template_${monthNames[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await api.post('/api/org/roster/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadResult(res.data.data);
      toast.success(res.data.message);
      fetchRoster();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Upload failed';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadDialog = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 space-y-5 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employee shift schedules</p>
        </div>
        <Button onClick={() => { resetUploadDialog(); setUploadOpen(true); }}>
          <Upload className="w-4 h-4 mr-1.5" />
          Upload Roster
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold w-40 text-center">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-200" /> Day (6am-6pm)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-purple-200" /> Night (6pm-6am)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-200" /> WOF
            </span>
          </div>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : roster.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <CalendarClockIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No roster data for {monthLabel}</p>
            <p className="text-sm mt-1">Upload a CSV to populate the roster</p>
          </div>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[180px]">
                  Employee
                </th>
                {dates.map((d) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={d.toISOString()}
                      className={`px-1 py-2.5 text-center font-medium min-w-[52px] ${isWeekend ? 'bg-gray-100 text-gray-500' : 'text-gray-600'}`}
                    >
                      <div>{d.getDate()}</div>
                      <div className="text-[10px] font-normal">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.employee.id} className="border-b hover:bg-gray-50/50">
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r">
                    <div className="font-medium text-gray-900">
                      {entry.employee.first_name} {entry.employee.last_name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {entry.employee.employee_id || '—'}
                    </div>
                  </td>
                  {dates.map((d) => {
                    const dateKey = toISODate(d);
                    const shift = entry.shifts[dateKey];
                    const colorClass = shift ? SHIFT_COLORS[shift] || 'bg-gray-100 text-gray-600' : '';
                    const label = shift ? SHIFT_LABELS[shift] || shift : '';
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    return (
                      <td
                        key={dateKey}
                        className={`px-0.5 py-1.5 text-center ${isWeekend && !shift ? 'bg-gray-50' : ''}`}
                      >
                        {shift && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                            {label}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Roster</DialogTitle>
            <DialogDescription>
              Upload a CSV file with employee shifts for the month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download CSV template for current month
            </button>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-1.5">CSV format:</p>
              <code className="text-[10px] block bg-white rounded px-2 py-1.5 border leading-relaxed">
                Employee Email ID/Employee ID, 01-Mar-2026, 02-Mar-2026, ...<br />
                140634, WOF, dayshift, nightshift, ...
              </code>
              <p className="mt-2 text-gray-500">
                Shift values: <strong>dayshift</strong> (6am-6pm), <strong>nightshift</strong> (6pm-6am), <strong>WOF</strong> (weekly off)
              </p>
            </div>

            {uploadResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">
                      {uploadResult.uploaded} shifts uploaded for {uploadResult.employees} employees across {uploadResult.dates} days
                    </p>
                    {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                      <div className="mt-2 text-xs text-amber-700">
                        <p className="font-medium">Warnings:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {uploadResult.warnings.slice(0, 5).map((w, i) => (
                            <li key={i}>Row {w.row}: {w.message}</li>
                          ))}
                          {uploadResult.warnings.length > 5 && (
                            <li>...and {uploadResult.warnings.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              </div>
            )}

            {!uploadResult && (
              <>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-800">{uploadFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to select roster CSV</p>
                    </>
                  )}
                </div>

                <Button className="w-full" disabled={!uploadFile || uploading} onClick={handleUpload}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Roster
                    </>
                  )}
                </Button>
              </>
            )}

            {uploadResult && (
              <Button className="w-full" onClick={() => setUploadOpen(false)}>
                Done
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple icon component for empty state
function CalendarClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h5" />
      <path d="M17.5 17.5 16 16.3V14" />
      <circle cx="16" cy="16" r="6" />
    </svg>
  );
}
