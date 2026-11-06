import LoginForm from '@/components/partials/auth/login-form';
import { getServerSession } from '@/features/auth/api/server-session';
import { redirect } from 'next/navigation';
import { pathAfterLogin } from '@/features/auth/model/login-redirect';
const Login = async ({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) => {
  const session = await getServerSession();
  if (session) {
    const returnTo = searchParams?.returnTo;
    redirect(pathAfterLogin(typeof returnTo === 'string' ? returnTo : undefined, session.role));
  }
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
            <div className='h-auto w-full max-w-[480px] mb-3 border border-border/60 bg-card/95 p-8 text-default-900 shadow-base2 backdrop-blur-sm md:rounded-2xl md:p-10'>
              {/* <div className='flex justify-center items-center text-center mb-6 lg:hidden '>
                <Link href='/'>
                  <Logo />
                </Link>
              </div> */}
              <div className='text-center 2xl:mb-10 mb-5'>
                <h4 className='text-2xl font-semibold tracking-tight'>Đăng nhập</h4>
                <div className='text-muted-foreground text-base mt-3'>
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
