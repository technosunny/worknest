'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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

  // Bulk import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; defaultPassword: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/api/org/employees', { params: { limit: 1000 } });
      const list = res.data.data || [];
      setEmployees(list);
      const depts = [...new Set(list.map((e: Employee) => e.department).filter(Boolean))] as string[];
      setDepartments(depts);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter((emp) => {
    const deptMatch = deptFilter === 'all' || emp.department === deptFilter;
    const statusMatch = statusFilter === 'all' || emp.status === statusFilter;
    return deptMatch && statusMatch;
  });

  const handleDownloadTemplate = () => {
    const headers = [
      'EMP CODE','Emp First Name','Emp last Name','Father\'s/CO Name','Gender','DOB','Current Address',
      'Permanent Address','Phone Number','DOJ','Emergency contact Person Name','Emergency contact Person No.',
      'Emergency contact Person Relation','Personal Email ID','PAN','Adhaar','Highest Qualification',
      'UAN No.','Designation','Department','Bank Account No','Bank Name','Bank IFSC Code','Official Email ID'
    ];
    const sample = [
      'EMP001','John','Doe','Robert Doe','Male','15/06/1995','123 Main St, City',
      '456 Home St, Town','9876543210','01/01/2026','Jane Doe','9876543211',
      'Spouse','john.personal@gmail.com','ABCDE1234F','123456789012','B.Tech',
      '100200300400','Software Engineer','Engineering','1234567890','HDFC Bank','HDFC0001234','john.doe@company.com'
    ];
    const csv = headers.join(',') + '\n' + sample.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError(null);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/api/org/employees/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(res.data.data);
      toast.success(res.data.message || `Imported ${res.data.data.imported} employees`);
      fetchEmployees();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Import failed';
      setImportError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const resetImportDialog = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { resetImportDialog(); setImportOpen(true); }}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Bulk Import
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/org/employees/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Employee
            </Link>
          </Button>
        </div>
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

      {/* Bulk Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Import Employees</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple employees at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template download */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download CSV template
            </button>

            {/* Expected format */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-700 mb-1.5">CSV supports all employee fields:</p>
              <code className="text-[10px] block bg-white rounded px-2 py-1.5 border leading-relaxed">
                EMP CODE, Emp First Name, Emp last Name, Official Email ID, Phone Number, Designation, Department, Gender, DOB, DOJ, Father&apos;s/CO Name, Address, PAN, Adhaar, Bank details, Emergency contact, etc.
              </code>
              <p className="mt-1.5 text-gray-500">Download the template for the full list of columns.</p>
            </div>

            {/* Success result */}
            {importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">
                      {importResult.imported} employees imported
                    </p>
                    <p className="text-green-700 mt-1">
                      Default password: <code className="bg-green-100 px-1.5 py-0.5 rounded font-mono text-xs">{importResult.defaultPassword}</code>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{importError}</p>
                </div>
              </div>
            )}

            {/* File input */}
            {!importResult && (
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
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-800">{importFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to select CSV file</p>
                      <p className="text-xs text-gray-400 mt-1">Max 500 employees per import</p>
                    </>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={!importFile || importing}
                  onClick={handleImport}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Employees
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Close after success */}
            {importResult && (
              <Button
                className="w-full"
                onClick={() => setImportOpen(false)}
              >
                Done
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
