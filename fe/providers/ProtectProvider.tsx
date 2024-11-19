'use client';

import { isAccessTokenValid } from '@/utils/isLogin';
import { redirect } from 'next/navigation';
import React from 'react';

export default function ProtectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (window !== undefined) {
    if (!isAccessTokenValid()) {
      redirect('/');
    }
  }
  return <>{children}</>;
}
