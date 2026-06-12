import { useUser } from '@clerk/clerk-react';

export function useRole() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const isAdmin =
    email.endsWith('@neoaistriq.com') ||
    (user?.publicMetadata as any)?.role === 'admin';
  return { isAdmin, isCustomer: !isAdmin, email };
}
