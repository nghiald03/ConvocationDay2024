'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useMutation } from '@tanstack/react-query';
import { loginAPI } from '@/config/axios';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email({ message: 'Email bạn nhập không hợp lệ' }),
  password: z.string().min(4, { message: 'Mật khẩu phải có ít nhất 4 ký tự' }),
});

type FormValues = z.infer<typeof schema>;

// ===== Utils: parse lỗi Axios & show toast gọn gàng =====
function parseAxiosError(err: any): {
  title: string;
  desc?: string;
  status?: number;
  fieldErrors?: Partial<Record<keyof FormValues, string>>;
} {
  // Lỗi mạng/timeout (không có response)
  if (!err?.response) {
    const isTimeout =
      err?.code === 'ECONNABORTED' ||
      String(err?.message || '')
        .toLowerCase()
        .includes('timeout');
    return {
      title: isTimeout ? 'Kết nối quá hạn' : 'Lỗi kết nối',
      desc: isTimeout
        ? 'Yêu cầu đăng nhập bị quá thời gian. Vui lòng thử lại.'
        : 'Không thể kết nối tới máy chủ. Kiểm tra mạng hoặc thử lại sau.',
    };
  }

  const status = err.response.status as number | undefined;
  const data = err.response.data;

  // Thử đọc các trường phổ biến từ backend
  const serverMsg =
    data?.message || data?.error || data?.title || data?.detail || '';
  const serverDesc =
    typeof data?.description === 'string' ? data.description : undefined;

  // Nếu backend trả validation chi tiết
  const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
  const errsObj = data?.errors || data?.fieldErrors;
  if (errsObj && typeof errsObj === 'object') {
    if (errsObj.email) fieldErrors.email = String(errsObj.email);
    if (errsObj.password) fieldErrors.password = String(errsObj.password);
  }

  // Map theo status code
  switch (status) {
    case 400:
      return {
        title: 'Dữ liệu không hợp lệ',
        desc: serverMsg || 'Vui lòng kiểm tra lại thông tin.',
        status,
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      };
    case 401:
      return {
        title: 'Không thể đăng nhập',
        desc: serverMsg || 'Email hoặc mật khẩu không đúng.',
        status,
        fieldErrors: {
          email: 'Email hoặc mật khẩu không đúng',
          password: 'Email hoặc mật khẩu không đúng',
        },
      };
    case 403:
      return {
        title: 'Bị từ chối truy cập',
        desc: serverMsg || 'Tài khoản chưa có quyền sử dụng.',
        status,
      };
    case 404:
      return {
        title: 'Không tìm thấy máy chủ',
        desc: serverMsg || 'Đường dẫn đăng nhập không tồn tại.',
        status,
      };
    case 422:
      return {
        title: 'Thiếu/ sai thông tin',
        desc: serverMsg || 'Một số trường thông tin chưa đúng.',
        status,
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      };
    case 429:
      return {
        title: 'Quá nhiều yêu cầu',
        desc:
          serverMsg || 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
        status,
      };
    case 500:
    default:
      return {
        title: 'Lỗi hệ thống',
        desc: serverMsg || 'Máy chủ đang gặp sự cố. Vui lòng thử lại.',
        status,
      };
  }
}

function showErrorToast(payload: {
  title: string;
  desc?: string;
  status?: number;
}) {
  toast.error(payload.title, {
    position: 'top-right',
    description: payload.desc,
    style: {
      color: '#FFFFFF',
      backgroundColor: '#F87171',
    },
  });
}

// ========================================================

const LoginForm = () => {
  const router = useRouter();
  const [passwordType, setPasswordType] = React.useState<'text' | 'password'>(
    'password'
  );

  const togglePasswordType = () =>
    setPasswordType((t) => (t === 'text' ? 'password' : 'text'));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: FormValues) => {
      const user = { userName: email, password };
      return loginAPI.login(user);
    },
    onSuccess: (res) => {
      toast.success('Đăng nhập thành công', { position: 'top-right' });
      localStorage.setItem('accessToken', res.data.accessToken);

      // Role-based redirect
      try {
        const decodedToken = jwtDecode(res.data.accessToken) as any;
        // Check both old format ('role') and new format (ClaimTypes.Role)
        const userRole =
          decodedToken?.role ||
          decodedToken?.[
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
          ];

        // Redirect Noticer users to notification page, others to tutorial
        if (userRole === 'NO') {
          router.push('/notify');
        } else {
          router.push('/tutorial');
        }
      } catch (error) {
        // Fallback to tutorial if token decode fails
        router.push('/tutorial');
      }
    },
    onError: (error: any) => {
      const parsed = parseAxiosError(error);

      // Set field errors nếu có
      if (parsed.fieldErrors?.email) {
        setError('email', {
          type: 'server',
          message: parsed.fieldErrors.email,
        });
      }
      if (parsed.fieldErrors?.password) {
        setError('password', {
          type: 'server',
          message: parsed.fieldErrors.password,
        });
      }

      // Toast gọn + chi tiết
      showErrorToast(parsed);
    },
  });

  const onSubmit = (data: FormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='mt-5 2xl:mt-7 space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor='email' className='font-medium text-default-600'>
          Email
        </Label>
        <Input
          size='lg'
          disabled={loginMutation.isPending}
          {...register('email')}
          type='email'
          id='email'
          className={cn('', { 'border-destructive': !!errors.email })}
        />
      </div>
      {errors.email && (
        <div className='text-destructive mt-2 text-sm'>
          {errors.email.message}
        </div>
      )}

      <div className='mt-3.5 space-y-2'>
        <Label htmlFor='password' className='mb-2 font-medium text-default-600'>
          Mật khẩu
        </Label>
        <div className='relative'>
          <Input
            size='lg'
            disabled={loginMutation.isPending}
            {...register('password')}
            type={passwordType}
            id='password'
            className={cn('', { 'border-destructive': !!errors.password })}
            placeholder=' '
          />
          <div
            className='absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 cursor-pointer'
            onClick={togglePasswordType}
          >
            {passwordType === 'password' ? (
              <Icon icon='heroicons:eye' className='w-5 h-5 text-default-400' />
            ) : (
              <Icon
                icon='heroicons:eye-slash'
                className='w-5 h-5 text-default-400'
              />
            )}
          </div>
        </div>
      </div>
      {errors.password && (
        <div className='text-destructive mt-2 text-sm'>
          {errors.password.message}
        </div>
      )}

      <Button
        fullWidth
        disabled={loginMutation.isPending}
        color='primary'
        className='mt-5'
      >
        {loginMutation.isPending && (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        )}
        {loginMutation.isPending ? 'Loading...' : 'Đăng nhập'}
      </Button>
    </form>
  );
};

export default LoginForm;
