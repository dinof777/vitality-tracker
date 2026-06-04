import { redirect } from 'next/navigation';

// The home CTA points here; start a fresh active workout session.
export default function LogPage() {
  redirect('/workout/active');
}
