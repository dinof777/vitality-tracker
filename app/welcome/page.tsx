import ConsumerMarketing from '@/components/home/ConsumerMarketing';
import UtilityStrip from '@/components/home/UtilityStrip';

// Standalone host for ConsumerMarketing — shareable/revisitable, reachable
// from returning-Home's low-key "See everything Vitality can do →" link and
// linkable on its own (a future footer, email, socials). No auth wiring
// needed — middleware.ts only protects /dashboard, /onboarding, /admin, and
// /g/*/branding. See .design/consumer-sales-home/DESIGN_BRIEF.md.
export default function Welcome() {
  return (
    <div className="min-h-dvh bg-background pb-28 text-text-primary">
      <div className="mx-auto max-w-6xl px-5 pt-4">
        <UtilityStrip />
      </div>
      <ConsumerMarketing />
    </div>
  );
}
