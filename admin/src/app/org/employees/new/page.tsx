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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Loader2, UserPlus, Copy, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  employee_id: z.string().optional(),
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

export default function NewEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      const res = await api.post('/api/org/employees', payload);
      const emp = res.data.data;
      setCreatedEmployee({
        email: data.email,
        password: data.password || `Welcome@${new Date().getFullYear()}`,
        name: `${data.first_name} ${data.last_name}`,
      });
      toast.success('Employee created successfully');
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

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Leave blank for default (Welcome@2026)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
              <p className="text-xs text-gray-400">Min 8 characters. Default: Welcome@2026</p>
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

            {/* Personal Details */}
            <div className="border-t pt-5 mt-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Personal Details</p>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="father_or_guardian_name">Father&apos;s / Guardian Name</Label>
                    <Input id="father_or_guardian_name" {...register('father_or_guardian_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Input id="gender" {...register('gender')} placeholder="Male / Female" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date_of_joining">Date of Joining</Label>
                    <Input id="date_of_joining" type="date" {...register('date_of_joining')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="highest_qualification">Highest Qualification</Label>
                    <Input id="highest_qualification" {...register('highest_qualification')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current_address">Current Address</Label>
                  <Input id="current_address" {...register('current_address')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="permanent_address">Permanent Address</Label>
                  <Input id="permanent_address" {...register('permanent_address')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input id="personal_email" type="email" {...register('personal_email')} />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="border-t pt-5 mt-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Emergency Contact</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_contact_name">Name</Label>
                  <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_contact_phone">Phone</Label>
                  <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_contact_relation">Relation</Label>
                  <Input id="emergency_contact_relation" {...register('emergency_contact_relation')} />
                </div>
              </div>
            </div>

            {/* Documents & Banking */}
            <div className="border-t pt-5 mt-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Documents & Banking</p>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input id="pan_number" {...register('pan_number')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                    <Input id="aadhaar_number" {...register('aadhaar_number')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="uan_number">UAN Number</Label>
                    <Input id="uan_number" {...register('uan_number')} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank_account_number">Bank Account No.</Label>
                    <Input id="bank_account_number" {...register('bank_account_number')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input id="bank_name" {...register('bank_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                    <Input id="bank_ifsc_code" {...register('bank_ifsc_code')} />
                  </div>
                </div>
              </div>
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
      {/* Success Dialog */}
      <Dialog open={!!createdEmployee} onOpenChange={() => { setCreatedEmployee(null); router.push('/org/employees'); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <DialogTitle>Employee Created!</DialogTitle>
            </div>
            <DialogDescription>
              Share these login credentials with the employee.
            </DialogDescription>
          </DialogHeader>
          {createdEmployee && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Name</p>
                  <p className="font-semibold text-gray-900">{createdEmployee.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="font-medium text-gray-900">{createdEmployee.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Password</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white border rounded px-3 py-1.5 text-sm font-mono">
                      {createdEmployee.password}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(createdEmployee.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}>
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setCreatedEmployee(null); router.push('/org/employees/new'); }}>
                  Add Another
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => { setCreatedEmployee(null); router.push('/org/employees'); }}>
                  View Employees
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
