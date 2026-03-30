'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface Branding {
  name: string;
  slug: string;
  logo_url: string | null;
  brand_colour: string | null;
}

interface BrandingContextValue {
  branding: Branding | null;
  isLoaded: boolean;
}

const DEFAULT_BRANDING: Branding = {
  name: 'WorkNest HR',
  slug: '',
  logo_url: null,
  brand_colour: '#2563eb',
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  isLoaded: false,
});

export function useBranding() {
  return useContext(BrandingContext);
}

function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  // e.g. acme.hr360flow.com → parts = ['acme', 'hr360flow', 'com']
  // ignore: localhost, admin, www, or single-part hostnames
  if (parts.length < 2) return null;
  const sub = parts[0].toLowerCase();
  if (sub === 'localhost' || sub === 'admin' || sub === 'www') return null;
  // Only treat as subdomain if there's a parent domain (not just bare IP or localhost)
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  return sub;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      const slug = getSubdomain();

      if (!slug) {
        setBranding(DEFAULT_BRANDING);
        setIsLoaded(true);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/public/branding/${slug}`);

        if (res.ok) {
          const json = await res.json();
          const data = json.data as Branding;
          setBranding(data);

          // Apply CSS variables for dynamic theming
          if (data.brand_colour) {
            document.documentElement.style.setProperty('--brand-primary', data.brand_colour);
            document.documentElement.style.setProperty('--brand-accent', data.brand_colour);
          }
        } else {
          setBranding(DEFAULT_BRANDING);
        }
      } catch {
        setBranding(DEFAULT_BRANDING);
      } finally {
        setIsLoaded(true);
      }
    }

    loadBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, isLoaded }}>
      {children}
    </BrandingContext.Provider>
  );
}
