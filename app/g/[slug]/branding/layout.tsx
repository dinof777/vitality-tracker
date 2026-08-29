import { tenantMetadata } from '@/lib/tenant-metadata';

// This layout exists only to carry metadata: page.tsx is a Client Component
// ('use client'), and a Client Component cannot export generateMetadata. The
// gym's name belongs in this tab like every other /g/<slug> surface.
export function generateMetadata({ params }: { params: { slug: string } }) {
  return tenantMetadata(params.slug, 'branding');
}

export default function BrandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
