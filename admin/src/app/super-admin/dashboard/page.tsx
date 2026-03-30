'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Building2, Users, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

interface DashboardStats {
  totalOrganisations?: number;
  totalEmployees?: number;
  activeOrgs?: number;
  trialOrgs?: number;
  suspendedOrgs?: number;
  recentOrgs?: Array<{
    id: string;
    name: string;
    plan: string;
    status: string;
    employeeCount?: number;
    createdAt: string;
  }>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/super-admin/dashboard');
        setStats(res.data);
      } catch {
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Super Admin Dashboard</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/super-admin/organisations/new">+ New Organisation</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Organisations"
          value={stats.totalOrganisations ?? 0}
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees ?? 0}
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatsCard
          title="Active"
          value={stats.activeOrgs ?? 0}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          subtitle="Organisations"
        />
        <StatsCard
          title="Trial"
          value={stats.trialOrgs ?? 0}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
          subtitle="Organisations"
        />
      </div>

      {/* Recent Organisations */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Organisations</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/organisations" className="text-blue-600">View all &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentOrgs && stats.recentOrgs.length > 0 ? (
            <div className="space-y-3">
              {stats.recentOrgs.slice(0, 5).map((org) => (
                <Link key={org.id} href={`/super-admin/organisations/${org.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{org.plan} plan</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      org.status === 'active' ? 'bg-green-100 text-green-700' :
                      org.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {org.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-400 text-sm">No organisations yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
