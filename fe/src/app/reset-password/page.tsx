'use client';

import { confirmPasswordReset } from '@/features/auth/api/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const email = params?.get('email') ?? '';
  const token = params?.get('token') ?? '';
  return <main className='min-h-dvh grid place-items-center p-6 bg-slate-50'>
    <form className='w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow-sm' onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError('');
      try { await confirmPasswordReset({ email, token, newPassword }); router.replace('/'); }
      catch { setError('Liên kết không hợp lệ hoặc đã hết hạn.'); }
      finally { setPending(false); }
    }}>
      <h1 className='text-2xl font-semibold'>Đặt mật khẩu mới</h1>
      <p className='text-sm text-slate-600'>Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
      <Input type='password' required minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      <Button fullWidth disabled={pending || !email || !token}>{pending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</Button>
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </form>
  </main>;
}
