'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  employee_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)
      );
      await api.post('/api/org/employees', payload);
      toast.success('Employee created successfully');
      router.push('/org/employees');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create employee';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new employee account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Employee Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                <Input id="first_name" {...register('first_name')} placeholder="John" />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                <Input id="last_name" {...register('last_name')} placeholder="Doe" />
                {errors.last_name && (
                  <p className="text-xs text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" {...register('email')} placeholder="john.doe@company.com" />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" {...register('employee_id')} placeholder="EMP-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" {...register('designation')} placeholder="Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input id="department" {...register('department')} placeholder="Engineering" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift">Shift</Label>
              <Input id="shift" {...register('shift')} placeholder="Morning / Evening / Night" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Employee
                  </>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/org/employees">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
