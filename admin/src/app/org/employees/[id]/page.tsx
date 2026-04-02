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
  father_or_guardian_name?: string;
  gender?: string;
  date_of_birth?: string;
  current_address?: string;
  permanent_address?: string;
  date_of_joining?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  personal_email?: string;
  pan_number?: string;
  aadhaar_number?: string;
  highest_qualification?: string;
  uan_number?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc_code?: string;
}

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  father_or_guardian_name: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  date_of_joining: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  personal_email: z.string().optional(),
  pan_number: z.string().optional(),
  aadhaar_number: z.string().optional(),
  highest_qualification: z.string().optional(),
  uan_number: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_ifsc_code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toDateInput(val?: string | null): string {
  if (!val) return '';
  try {
    return new Date(val).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formDefaults(emp: Employee): FormValues {
  return {
    first_name: emp.first_name,
    last_name: emp.last_name || '',
    phone: emp.phone || '',
    designation: emp.designation || '',
    department: emp.department || '',
    shift: emp.shift || '',
    father_or_guardian_name: emp.father_or_guardian_name || '',
    gender: emp.gender || '',
    date_of_birth: toDateInput(emp.date_of_birth),
    current_address: emp.current_address || '',
    permanent_address: emp.permanent_address || '',
    date_of_joining: toDateInput(emp.date_of_joining),
    emergency_contact_name: emp.emergency_contact_name || '',
    emergency_contact_phone: emp.emergency_contact_phone || '',
    emergency_contact_relation: emp.emergency_contact_relation || '',
    personal_email: emp.personal_email || '',
    pan_number: emp.pan_number || '',
    aadhaar_number: emp.aadhaar_number || '',
    highest_qualification: emp.highest_qualification || '',
    uan_number: emp.uan_number || '',
    bank_account_number: emp.bank_account_number || '',
    bank_name: emp.bank_name || '',
    bank_ifsc_code: emp.bank_ifsc_code || '',
  };
}

function Field({
  label, id, register, disabled, error, type = 'text', placeholder = '—',
}: {
  label: string; id: string; register: ReturnType<typeof useForm<FormValues>>['register'];
  disabled: boolean; error?: string; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Input id={id} type={type} placeholder={placeholder} disabled={disabled} className={disabled ? 'bg-gray-50' : ''} {...(register as any)(id)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

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
        reset(formDefaults(emp));
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
      reset(formDefaults(updated));
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
    if (employee) reset(formDefaults(employee));
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

  const dis = !editing;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
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

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8 text-xs">
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 text-xs text-gray-500">
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" id="first_name" register={register} disabled={dis} error={errors.first_name?.message} />
              <Field label="Last Name" id="last_name" register={register} disabled={dis} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={employee.email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" id="phone" register={register} disabled={dis} />
              <Field label="Employee ID" id="employee_id" register={register} disabled={true} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Designation" id="designation" register={register} disabled={dis} />
              <Field label="Department" id="department" register={register} disabled={dis} />
              <Field label="Shift" id="shift" register={register} disabled={dis} />
            </div>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Father's / Guardian Name" id="father_or_guardian_name" register={register} disabled={dis} />
              <Field label="Gender" id="gender" register={register} disabled={dis} />
              <Field label="Date of Birth" id="date_of_birth" register={register} disabled={dis} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Joining" id="date_of_joining" register={register} disabled={dis} type="date" />
              <Field label="Highest Qualification" id="highest_qualification" register={register} disabled={dis} />
            </div>
            <Field label="Current Address" id="current_address" register={register} disabled={dis} />
            <Field label="Permanent Address" id="permanent_address" register={register} disabled={dis} />
            <Field label="Personal Email" id="personal_email" register={register} disabled={dis} />
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Contact Name" id="emergency_contact_name" register={register} disabled={dis} />
              <Field label="Contact Phone" id="emergency_contact_phone" register={register} disabled={dis} />
              <Field label="Relation" id="emergency_contact_relation" register={register} disabled={dis} />
            </div>
          </CardContent>
        </Card>

        {/* Documents & Banking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Documents & Banking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Field label="PAN Number" id="pan_number" register={register} disabled={dis} />
              <Field label="Aadhaar Number" id="aadhaar_number" register={register} disabled={dis} />
              <Field label="UAN Number" id="uan_number" register={register} disabled={dis} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Bank Account No." id="bank_account_number" register={register} disabled={dis} />
              <Field label="Bank Name" id="bank_name" register={register} disabled={dis} />
              <Field label="IFSC Code" id="bank_ifsc_code" register={register} disabled={dis} />
            </div>
          </CardContent>
        </Card>

        {editing && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        )}
      </form>

      {employee.status !== 'inactive' && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Deactivate Employee</p>
              <p className="text-xs text-gray-500 mt-0.5">This will deactivate the employee&apos;s account.</p>
            </div>
            <Button
              variant="outline" size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowDeactivate(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Deactivate
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
            <Button variant="outline" onClick={() => setShowDeactivate(false)} disabled={deactivating}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating}>
              {deactivating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deactivating...</> : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
