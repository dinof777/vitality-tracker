import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <SignIn forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </div>
  );
}
