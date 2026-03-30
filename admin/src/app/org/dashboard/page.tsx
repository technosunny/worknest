'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Users, UserCheck, UserX, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import StatusBadge from '@/components/StatusBadge';

interface DashboardStats {
  totalEmployees?: number;
  activeEmployees?: number;
  inactiveEmployees?: number;
  todayAttendance?: number;
  presentToday?: number;
  absentToday?: number;
  recentEmployees?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    designation?: string;
    department?: string;
    status: string;
  }>;
}

export default function OrgDashboard() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/org/dashboard');
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organisation Overview</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/org/employees/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees ?? 0}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatsCard
          title="Active Employees"
          value={stats.activeEmployees ?? 0}
          icon={UserCheck}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatsCard
          title="Present Today"
          value={stats.presentToday ?? 0}
          icon={Calendar}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <StatsCard
          title="Absent Today"
          value={stats.absentToday ?? 0}
          icon={UserX}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Recent Employees */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Employees</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/org/employees" className="text-blue-600">View all &rarr;</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentEmployees && stats.recentEmployees.length > 0 ? (
            <div className="space-y-2">
              {stats.recentEmployees.slice(0, 5).map((emp) => (
                <Link key={emp.id} href={`/org/employees/${emp.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {emp.first_name?.[0]?.toUpperCase()}{emp.last_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {emp.designation || '—'} &middot; {emp.department || '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-400 text-sm">No employees yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
