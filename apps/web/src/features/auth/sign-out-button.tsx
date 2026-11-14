'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api/client';
import { signOutFromFirebase } from '@/lib/firebase/client';

export function SignOutButton() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await Promise.all([api.POST('/api/v1/auth/sign-out'), signOutFromFirebase()]);
        router.replace('/login');
        router.refresh();
      }}
    >
      <LogOut aria-hidden="true" />
      {t('signOut')}
    </Button>
  );
}
