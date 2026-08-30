import DashCodeFooter from '@/components/partials/footer';
import DashCodeHeader from '@/components/partials/header';
import DashCodeSidebar from '@/components/partials/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuthentificationProvider from '@/providers/AuthentificationProvider';
import LayoutContentProvider from '@/providers/content.provider';
import LayoutProvider from '@/providers/layout.provider';
import ProtectProvider from '@/providers/ProtectProvider';
import { getServerSession } from '@/features/auth/api/server-session';
import { SessionProvider } from '@/features/auth/queries/session-provider';
import { redirect } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Khu vực quản trị',
  description: '',
};

const layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession();
  if (!session) redirect('/');
  return (
    <SessionProvider initialSession={session}>
    <LayoutProvider>
      <DashCodeHeader />
      <DashCodeSidebar />
      <LayoutContentProvider>
        <AuthentificationProvider>
          <TooltipProvider delayDuration={200}>
            <ProtectProvider>{children}</ProtectProvider>
          </TooltipProvider>
        </AuthentificationProvider>
      </LayoutContentProvider>
      <DashCodeFooter />
      <Toaster />
    </LayoutProvider>
    </SessionProvider>
  );
};

export default layout;
