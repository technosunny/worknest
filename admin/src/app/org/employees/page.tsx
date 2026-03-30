'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  status: string;
  createdAt: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/api/org/employees');
        const list = res.data.employees || res.data || [];
        setEmployees(list);
        const depts = [...new Set(list.map((e: Employee) => e.department).filter(Boolean))] as string[];
        setDepartments(depts);
      } catch {
        toast.error('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filtered = employees.filter((emp) => {
    const deptMatch = deptFilter === 'all' || emp.department === deptFilter;
    const statusMatch = statusFilter === 'all' || emp.status === statusFilter;
    return deptMatch && statusMatch;
  });

  const columns = [
    {
      key: 'first_name',
      label: 'Employee',
      sortable: true,
      render: (_: unknown, row: Employee) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
            {row.first_name?.[0]?.toUpperCase()}{row.last_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{row.first_name} {row.last_name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      label: 'Designation',
      render: (value: unknown) => <span className="text-sm">{value ? String(value) : '—'}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          {value ? String(value) : '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value: unknown) => <span className="text-sm text-gray-600">{value ? String(value) : '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => <StatusBadge status={String(value)} />,
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(String(value)).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{employees.length} total employees</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/org/employees/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          searchPlaceholder="Search employees..."
          searchKey="email"
          loading={loading}
          onRowClick={(row) => router.push(`/org/employees/${(row as unknown as Employee).id}`)}
          filterContent={
            <div className="flex gap-2">
              <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  );
}
