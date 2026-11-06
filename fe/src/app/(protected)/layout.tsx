import DashCodeFooter from '@/components/partials/footer';
import DashCodeHeader from '@/components/partials/header';
import DashCodeSidebar from '@/components/partials/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import LayoutContentProvider from '@/components/partials/layout/layout-content';
import LayoutShell from '@/components/partials/layout/layout-shell';
import AuthenticationGuard from '@/features/auth/ui/authentication-guard';
import AuthorizationGuard from '@/features/auth/ui/authorization-guard';
import { getServerSession } from '@/features/auth/api/server-session';
import { SessionProvider } from '@/features/auth/queries/session-provider';
import { DataSignals } from '@/features/realtime/data-signals';
import { redirect } from 'next/navigation';
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
    <DataSignals />
    <LayoutShell>
      <DashCodeHeader />
      <DashCodeSidebar />
      <LayoutContentProvider>
        <AuthorizationGuard>
          <TooltipProvider delayDuration={200}>
            <AuthenticationGuard>{children}</AuthenticationGuard>
          </TooltipProvider>
        </AuthorizationGuard>
      </LayoutContentProvider>
      <DashCodeFooter />
    </LayoutShell>
    </SessionProvider>
  );
};

export default layout;
