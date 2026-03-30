'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Menu,
  Briefcase,
  ChevronRight,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const superAdminLinks = [
  { href: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/organisations', label: 'Organisations', icon: Building2 },
];

const orgAdminLinks = [
  { href: '/org/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/org/employees', label: 'Employees', icon: Users },
  { href: '/org/attendance', label: 'Attendance', icon: ClipboardList },
  { href: '/org/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = user?.role === 'super_admin' ? superAdminLinks : orgAdminLinks;

  const logoUrl = branding?.logo_url;
  const orgName = branding?.name || 'WorkNest HR';
  const brandColour = branding?.brand_colour || '#2563eb';
  const isOrgAdmin = user?.role === 'org_admin';

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        {isOrgAdmin && logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${orgName} logo`}
            width={32}
            height={32}
            className="rounded-lg object-contain bg-white p-0.5 flex-shrink-0"
          />
        ) : (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ backgroundColor: brandColour }}
          >
            <Briefcase className="w-4 h-4 text-white" />
          </div>
        )}
        <div>
          <h1 className="font-bold text-base leading-tight">{isOrgAdmin ? orgName : 'WorkNest HR'}</h1>
          <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
              style={active && isOrgAdmin && branding?.brand_colour ? { backgroundColor: brandColour } : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {link.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.email}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {isOrgAdmin && logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${orgName} logo`}
                width={20}
                height={20}
                className="rounded object-contain"
              />
            ) : (
              <Briefcase className="w-5 h-5 text-blue-600" />
            )}
            <span className="font-bold text-sm">{isOrgAdmin ? orgName : 'WorkNest HR'}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
