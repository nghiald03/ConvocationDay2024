'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/routing';
import { Icon } from '@/components/ui/icon';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { loginUser } from '@/action/auth-action';
import { toast } from 'sonner';
import { useRouter } from '@/components/navigation';
import { useMutation } from '@tanstack/react-query';
import { loginAPI } from '@/config/axios';

const schema = z.object({
  email: z.string().email({ message: 'Email bạn nhập không hợp lệ' }),
  password: z.string().min(4, { message: 'Mật khẩu phải có ít nhất 4 ký tự' }),
});
const LoginForm = () => {
  const router = useRouter();
  const [passwordType, setPasswordType] = React.useState('password');

  const togglePasswordType = () => {
    if (passwordType === 'text') {
      setPasswordType('password');
    } else if (passwordType === 'password') {
      setPasswordType('text');
    }
  };
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'all',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  type FormValues = {
    email: string;
    password: string;
  };

  const getDriverVerifyMutation = useMutation({
    mutationFn: ({ email, password }: FormValues) => {
      const user = {
        userName: email,
        password: password,
      };
      return loginAPI.login(user);
    },
    onSuccess: (data) => {
      toast.success('Đăng nhập thành công', { position: 'top-right' });
      localStorage.setItem('accessToken', data.data.accessToken);
      router.push('/tutorial');
    },
    onError: (error: { response: any }) => {
      setError('email', {
        type: 'manual',
        message: 'Email hoặc mật khẩu không đúng',
      });
      setError('password', {
        type: 'manual',
        message: 'Email hoặc mật khẩu không đúng',
      });
      console.log(error);
      toast.error('Email hoặc mật khẩu không đúng!', {
        position: 'top-right',

        style: {
          color: '#FFFFFF',
          backgroundColor: '#F87171',
        },
      });
    },
  });
  const onSubmit = (data: z.infer<typeof schema>) => {
    // startTransition(async () => {
    //   try {
    //     const response = await loginUser(data);

    //     if (!!response.error) {
    //       toast('Event has been created', {
    //         description: 'Sunday, December 03, 2023 at 9:00 AM',
    //       });
    //     } else {
    //       router.push('/dashboard/analytics');
    //       toast.success('Successfully logged in');
    //     }
    //   } catch (err: any) {
    //     toast.error(err.message);
    //   }
    // });
    getDriverVerifyMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='mt-5 2xl:mt-7 space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor='email' className=' font-medium text-default-600'>
          Email{' '}
        </Label>
        <Input
          size='lg'
          disabled={getDriverVerifyMutation.isPending}
          {...register('email')}
          type='email'
          id='email'
          className={cn('', {
            'border-destructive ': errors.email,
          })}
        />
      </div>
      {errors.email && (
        <div className=' text-destructive mt-2 text-sm'>
          {errors.email.message}
        </div>
      )}

      <div className='mt-3.5 space-y-2'>
        <Label htmlFor='password' className='mb-2 font-medium text-default-600'>
          Mật khẩu{' '}
        </Label>
        <div className='relative'>
          <Input
            size='lg'
            disabled={getDriverVerifyMutation.isPending}
            {...register('password')}
            type={passwordType}
            id='password'
            className={cn('', {
              'border-destructive ': errors.email,
            })}
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
        <div className=' text-destructive mt-2 text-sm'>
          {errors.password.message}
        </div>
      )}

      <Button
        fullWidth
        disabled={getDriverVerifyMutation.isPending}
        color='primary'
        className=' mt-5'
      >
        {getDriverVerifyMutation.isPending && (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        )}
        {getDriverVerifyMutation.isPending ? 'Loading...' : 'Sign In'}
      </Button>
    </form>
  );
};
export default LoginForm;
