'use client';

import { requestPasswordReset } from '@/features/auth/api/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [developmentToken, setDevelopmentToken] = useState('');
  const [pending, setPending] = useState(false);
  return <main className='min-h-dvh grid place-items-center p-6 bg-slate-50'>
    <form className='w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow-sm' onSubmit={async (event) => {
      event.preventDefault(); setPending(true);
      try { const result = await requestPasswordReset(email); setMessage(result.message); setDevelopmentToken(result.token ?? ''); }
      finally { setPending(false); }
    }}>
      <h1 className='text-2xl font-semibold'>Khôi phục mật khẩu</h1>
      <p className='text-sm text-slate-600'>Nhập email tài khoản. Hệ thống sẽ gửi liên kết đặt lại mật khẩu.</p>
      <Input type='email' required value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button fullWidth disabled={pending}>{pending ? 'Đang gửi…' : 'Gửi hướng dẫn'}</Button>
      {message ? <p className='text-sm text-slate-700'>{message}</p> : null}
      {developmentToken ? <Link className='block break-all text-sm text-primary underline' href={`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(developmentToken)}`}>Mở liên kết reset development</Link> : null}
      <Link className='block text-center text-sm text-primary' href='/'>Quay lại đăng nhập</Link>
    </form>
  </main>;
}
