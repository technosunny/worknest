'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, Edit2, Save, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  shift?: string;
  employee_id?: string;
  status: string;
  createdAt: string;
}

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  employee_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await api.get(`/api/org/employees/${id}`);
        const emp: Employee = res.data.data;
        setEmployee(emp);
        reset({
          first_name: emp.first_name,
          last_name: emp.last_name,
          phone: emp.phone || '',
          designation: emp.designation || '',
          department: emp.department || '',
          shift: emp.shift || '',
          employee_id: emp.employee_id || '',
        });
      } catch {
        toast.error('Failed to load employee');
        router.push('/org/employees');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, reset, router]);

  const onSave = async (data: FormValues) => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      const res = await api.patch(`/api/org/employees/${id}`, payload);
      const updated: Employee = res.data.data;
      setEmployee(updated);
      reset({
        first_name: updated.first_name,
        last_name: updated.last_name,
        phone: updated.phone || '',
        designation: updated.designation || '',
        department: updated.department || '',
        shift: updated.shift || '',
        employee_id: updated.employee_id || '',
      });
      setEditing(false);
      toast.success('Employee updated');
    } catch {
      toast.error('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await api.delete(`/api/org/employees/${id}`);
      toast.success('Employee deactivated');
      router.push('/org/employees');
    } catch {
      toast.error('Failed to deactivate employee');
      setDeactivating(false);
      setShowDeactivate(false);
    }
  };

  const cancelEdit = () => {
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        phone: employee.phone || '',
        designation: employee.designation || '',
        department: employee.department || '',
        shift: employee.shift || '',
        employee_id: employee.employee_id || '',
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="text-gray-500 hover:text-gray-900">
          <Link href="/org/employees">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
            {employee.first_name?.[0]?.toUpperCase()}
            {employee.last_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{employee.email}</p>
          </div>
        </div>
        <StatusBadge status={employee.status} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Employee Information</CardTitle>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-8 text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEdit}
              className="h-8 text-xs text-gray-500"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSave)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={employee.email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="—"
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  {...register('employee_id')}
                  placeholder="—"
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  {...register('designation')}
                  placeholder="—"
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  {...register('department')}
                  placeholder="—"
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="shift">Shift</Label>
                <Input
                  id="shift"
                  {...register('shift')}
                  placeholder="—"
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Joined</Label>
                <Input
                  value={new Date(employee.createdAt).toLocaleDateString()}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {employee.status !== 'inactive' && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Deactivate Employee</p>
              <p className="text-xs text-gray-500 mt-0.5">
                This will deactivate the employee&apos;s account.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowDeactivate(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Deactivate
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-gray-900">
                {employee.first_name} {employee.last_name}
              </span>
              ? Their account will be disabled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeactivate(false)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
