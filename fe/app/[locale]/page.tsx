import { Link } from '@/i18n/routing';
import LoginForm from '@/components/partials/auth/login-form';
import Image from 'next/image';
import Social from '@/components/partials/auth/social';
import Copyright from '@/components/partials/auth/copyright';
import Logo from '@/components/partials/auth/logo';
import Typography from './(protected)/components/typography/page';
const Login = () => {
  return (
    <>
      <div
        className='flex w-full items-center overflow-hidden min-h-dvh h-dvh basis-full bg-cover bg-no-repeat bg-center'
        style={{
          backgroundImage: `url(/images/all-img/page-bg.jpg)`,
        }}
      >
        <div className='overflow-y-auto flex flex-wrap w-full h-dvh justify-center items-center'>
          <div className=' w-full flex flex-col items-center justify-center'>
            <div className='bg-default-50   h-auto  p-10 md:rounded-md max-w-[520px] w-full  text-2xl text-default-900  mb-3'>
              {/* <div className='flex justify-center items-center text-center mb-6 lg:hidden '>
                <Link href='/'>
                  <Logo />
                </Link>
              </div> */}
              <div className='text-center 2xl:mb-10 mb-5'>
                <h4 className='font-medium'>Đăng nhập</h4>
                <div className='text-default-500 text-base mt-3'>
                  Chào mừng bạn đến với{' '}
                  <span className='!font-bold text-primary'>
                    Convocation Day {new Date().getFullYear()}
                  </span>
                </div>
              </div>
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
