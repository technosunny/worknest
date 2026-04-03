'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/contexts/BrandingContext';
import api from '@/lib/api';
import Image from 'next/image';

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_colour: string | null;
  timezone: string;
  plan: string;
  office_lat: number | null;
  office_lng: number | null;
}

export default function OrgSettingsPage() {
  const { branding } = useBranding();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColour, setBrandColour] = useState('#2563eb');
  const [officeLat, setOfficeLat] = useState('');
  const [officeLng, setOfficeLng] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const colourInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get<{ data: OrgSettings }>('/api/org/settings');
        const data = res.data.data;
        setSettings(data);
        setLogoUrl(data.logo_url || '');
        setBrandColour(data.brand_colour || '#2563eb');
        setOfficeLat(data.office_lat?.toString() || '');
        setOfficeLng(data.office_lng?.toString() || '');
      } catch {
        toast.error('Failed to load organisation settings');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: { logo_url?: string | null; brand_colour?: string | null } = {};

      if (logoUrl.trim() !== (settings?.logo_url || '')) {
        payload.logo_url = logoUrl.trim() || null;
      }
      if (brandColour !== (settings?.brand_colour || '#2563eb')) {
        payload.brand_colour = brandColour;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        return;
      }

      const res = await api.patch<{ data: OrgSettings }>('/api/org/settings', payload);
      const updated = res.data.data;
      setSettings(updated);
      setLogoUrl(updated.logo_url || '');
      setBrandColour(updated.brand_colour || '#2563eb');

      if (updated.brand_colour) {
        document.documentElement.style.setProperty('--brand-primary', updated.brand_colour);
        document.documentElement.style.setProperty('--brand-accent', updated.brand_colour);
      }

      toast.success('Branding settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    setIsSavingLocation(true);
    try {
      const lat = officeLat.trim() ? parseFloat(officeLat) : null;
      const lng = officeLng.trim() ? parseFloat(officeLng) : null;

      if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
        toast.error('Latitude must be between -90 and 90');
        return;
      }
      if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
        toast.error('Longitude must be between -180 and 180');
        return;
      }

      const res = await api.patch<{ data: OrgSettings }>('/api/org/settings', {
        office_lat: lat,
        office_lng: lng,
      });
      const updated = res.data.data;
      setSettings(updated);
      setOfficeLat(updated.office_lat?.toString() || '');
      setOfficeLng(updated.office_lng?.toString() || '');
      toast.success('Office location saved');
    } catch {
      toast.error('Failed to save location');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLat(pos.coords.latitude.toFixed(6));
        setOfficeLng(pos.coords.longitude.toFixed(6));
        toast.success('Location detected');
      },
      () => toast.error('Failed to get location'),
      { enableHighAccuracy: true }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const previewColour = brandColour || '#2563eb';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organisation Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organisation&apos;s branding, location, and appearance</p>
      </div>

      {/* Org Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisation Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="font-medium w-20">Name:</span>
            <span>{settings?.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium w-20">Slug:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{settings?.slug}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium w-20">Plan:</span>
            <span className="capitalize">{settings?.plan}</span>
          </div>
        </CardContent>
      </Card>

      {/* Office Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Office Location
          </CardTitle>
          <CardDescription>Set your office coordinates to track check-in distance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="office_lat">Latitude</Label>
              <Input
                id="office_lat"
                type="text"
                placeholder="e.g. 28.6139"
                value={officeLat}
                onChange={(e) => setOfficeLat(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="office_lng">Longitude</Label>
              <Input
                id="office_lng"
                type="text"
                placeholder="e.g. 77.2090"
                value={officeLng}
                onChange={(e) => setOfficeLng(e.target.value)}
              />
            </div>
          </div>

          {officeLat && officeLng && (
            <div className="text-xs text-gray-500">
              <a
                href={`https://www.google.com/maps?q=${officeLat},${officeLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on Google Maps
              </a>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleDetectLocation}>
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Use Current Location
            </Button>
            <Button size="sm" onClick={handleSaveLocation} disabled={isSavingLocation}>
              {isSavingLocation ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Location</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
          <CardDescription>Customise how your organisation appears in the admin portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-gray-400">Enter a publicly accessible URL for your logo image</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_colour">Brand Colour</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => colourInputRef.current?.click()}
                className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: previewColour }}
                aria-label="Pick brand colour"
              />
              <input
                ref={colourInputRef}
                type="color"
                value={previewColour}
                onChange={(e) => setBrandColour(e.target.value)}
                className="sr-only"
              />
              <Input
                id="brand_colour"
                type="text"
                value={brandColour}
                onChange={(e) => setBrandColour(e.target.value)}
                placeholder="#2563eb"
                className="font-mono w-36"
                maxLength={7}
              />
              <span className="text-xs text-gray-400">Hex format, e.g. #2563eb</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Preview</p>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo preview"
                  width={40}
                  height={40}
                  className="rounded-lg object-contain bg-white border border-gray-200 p-0.5"
                  onError={() => {}}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: previewColour }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900">{settings?.name}</p>
                <p className="text-xs" style={{ color: previewColour }}>Admin Portal</p>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: previewColour }}
              >
                Sample Button
              </button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Save Branding</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
