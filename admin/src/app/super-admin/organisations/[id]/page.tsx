'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Loader2, Edit2, X, Building2, Users } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2),
  plan: z.string().min(1),
  status: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  employeeCount?: number;
  adminEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function OrgDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await api.get(`/api/super-admin/organisations/${id}`);
        setOrg(res.data.organisation || res.data);
        const data = res.data.organisation || res.data;
        reset({ name: data.name, plan: data.plan, status: data.status });
      } catch {
        toast.error('Failed to load organisation');
        router.push('/super-admin/organisations');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrg();
  }, [id, reset, router]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const res = await api.patch(`/api/super-admin/organisations/${id}`, data);
      setOrg(res.data.organisation || res.data);
      setIsEditing(false);
      toast.success('Organisation updated');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Failed to update organisation');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/organisations">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
              <StatusBadge status={org.status} />
            </div>
            <p className="text-sm text-gray-500">/{org.slug}</p>
          </div>
        </div>
        <Button
          variant={isEditing ? 'outline' : 'default'}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className={isEditing ? '' : 'bg-blue-600 hover:bg-blue-700'}
        >
          {isEditing ? (
            <><X className="w-4 h-4 mr-1" /> Cancel</>
          ) : (
            <><Edit2 className="w-4 h-4 mr-1" /> Edit</>
          )}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Plan', value: org.plan, icon: Building2 },
          { label: 'Employees', value: org.employeeCount ?? 0, icon: Users },
          { label: 'Created', value: new Date(org.createdAt).toLocaleDateString(), icon: null },
          { label: 'Admin Email', value: org.adminEmail || '—', icon: null },
        ].map((item) => (
          <Card key={item.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="font-semibold text-gray-900 text-sm capitalize truncate">{String(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit / View Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{isEditing ? 'Edit Details' : 'Organisation Details'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Organisation Name</Label>
                <Input {...register('name')} disabled={!isEditing} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={org.slug} disabled className="bg-gray-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                {isEditing ? (
                  <Select defaultValue={org.plan} onValueChange={(val) => val && setValue('plan', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={org.plan} disabled className="bg-gray-50 capitalize" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                {isEditing ? (
                  <Select defaultValue={org.status} onValueChange={(val) => val && setValue('status', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1"><StatusBadge status={org.status} /></div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
