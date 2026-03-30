'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug: lowercase letters, numbers, hyphens only'),
  plan: z.string().min(1, 'Plan is required'),
  adminEmail: z.string().email('Valid email required'),
  adminName: z.string().min(2, 'Admin name required'),
  adminPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreatedOrg {
  organisation: { name: string; slug: string };
  admin: { email: string; temporaryPassword: string };
}

export default function NewOrganisationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState<CreatedOrg | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'trial' },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/super-admin/organisations', data);
      setCreated(res.data);
      toast.success('Organisation created successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Failed to create organisation');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = () => {
    if (created?.admin?.temporaryPassword) {
      navigator.clipboard.writeText(created.admin.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/organisations">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Organisation</h1>
          <p className="text-sm text-gray-500">Create a new organisation and admin account</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Organisation Details</CardTitle>
          <CardDescription>Fill in the details to set up a new organisation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Organisation Name *</Label>
                <Input id="name" placeholder="Acme Corp" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" placeholder="acme-corp" {...register('slug')} />
                {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Plan *</Label>
              <Select defaultValue="trial" onValueChange={(val) => val && setValue('plan', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              {errors.plan && <p className="text-xs text-red-500">{errors.plan.message}</p>}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Admin Account</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="adminName">Admin Name *</Label>
                    <Input id="adminName" placeholder="John Doe" {...register('adminName')} />
                    {errors.adminName && <p className="text-xs text-red-500">{errors.adminName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adminPhone">Admin Phone</Label>
                    <Input id="adminPhone" placeholder="+1234567890" {...register('adminPhone')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input id="adminEmail" type="email" placeholder="admin@acmecorp.com" {...register('adminEmail')} />
                  {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/super-admin/organisations">Cancel</Link>
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  'Create Organisation'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={!!created} onOpenChange={() => setCreated(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <DialogTitle>Organisation Created!</DialogTitle>
            </div>
            <DialogDescription>
              Save these credentials &mdash; the password won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          {created && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Organisation</p>
                  <p className="font-semibold text-gray-900">{created.organisation?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Admin Email</p>
                  <p className="font-medium text-gray-900">{created.admin?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Temporary Password</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white border rounded px-3 py-1.5 text-sm font-mono">
                      {created.admin?.temporaryPassword}
                    </code>
                    <Button size="sm" variant="outline" onClick={copyPassword}>
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/super-admin/organisations/new">Create Another</Link>
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" asChild>
                  <Link href="/super-admin/organisations">View All Orgs</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
