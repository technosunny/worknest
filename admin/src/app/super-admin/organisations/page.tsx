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

interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  employeeCount?: number;
  adminEmail?: string;
  createdAt: string;
}

export default function OrganisationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get('/api/super-admin/organisations');
        setOrgs(res.data.data || []);
      } catch {
        toast.error('Failed to load organisations');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  const filtered = orgs.filter((org) => {
    const planMatch = planFilter === 'all' || org.plan === planFilter;
    const statusMatch = statusFilter === 'all' || org.status === statusFilter;
    return planMatch && statusMatch;
  });

  const columns = [
    {
      key: 'name',
      label: 'Organisation',
      sortable: true,
      render: (value: unknown, row: Organisation) => (
        <div>
          <p className="font-medium text-gray-900">{String(value)}</p>
          <p className="text-xs text-gray-500">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      sortable: true,
      render: (value: unknown) => (
        <span className="capitalize text-sm px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
          {String(value)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => <StatusBadge status={String(value)} />,
    },
    {
      key: 'employeeCount',
      label: 'Employees',
      render: (value: unknown) => (
        <span className="text-sm font-medium">{value != null ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'adminEmail',
      label: 'Admin Email',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
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
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orgs.length} total organisations</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/super-admin/organisations/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Organisation
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-0 p-5">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          searchPlaceholder="Search organisations..."
          searchKey="name"
          loading={loading}
          onRowClick={(row) => router.push(`/super-admin/organisations/${(row as unknown as Organisation).id}`)}
          filterContent={
            <div className="flex gap-2">
              <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? "all")}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>
    </div>
  );
}
