import LayoutProvider from '@/fe/providers/layout.provider';
import LayoutContentProvider from '@/fe/providers/content.provider';
import DashCodeSidebar from '@/components/partials/sidebar';
import DashCodeFooter from '@/components/partials/footer';
import ThemeCustomize from '@/components/partials/customizer';
import DashCodeHeader from '@/components/partials/header';
import { auth } from '@/lib/auth';
import { redirect } from '@/components/navigation';
import { useEffect } from 'react';
import ProtectProvider from '@/fe/providers/ProtectProvider';
import { Toaster } from 'react-hot-toast';

const layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <LayoutProvider>
      <DashCodeHeader />
      <DashCodeSidebar />
      <LayoutContentProvider>
        <ProtectProvider>{children}</ProtectProvider>
      </LayoutContentProvider>
      <DashCodeFooter />
      <Toaster />
    </LayoutProvider>
  );
};

export default layout;
