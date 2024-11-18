// components/ClientQueryProvider.tsx
'use client'; // Ensures the component is a client component

import { redirect } from 'next/navigation';
import React from 'react';

export default function ProtectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (window !== undefined) {
    const accessToken = window.localStorage.getItem('accessToken');
    if (!accessToken) {
      redirect('/');
    }
  }
  return <>{children}</>;
}
