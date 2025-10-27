import DashCodeFooter from '@/components/partials/footer';
import DashCodeHeader from '@/components/partials/header';
import DashCodeSidebar from '@/components/partials/sidebar';
import AuthentificationProvider from '@/providers/AuthentificationProvider';
import LayoutContentProvider from '@/providers/content.provider';
import LayoutProvider from '@/providers/layout.provider';
import ProtectProvider from '@/providers/ProtectProvider';
import { Toaster } from 'react-hot-toast';

const layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <LayoutProvider>
      <DashCodeHeader />
      <DashCodeSidebar />
      <LayoutContentProvider>
        <AuthentificationProvider>
          <ProtectProvider>{children}</ProtectProvider>
        </AuthentificationProvider>
      </LayoutContentProvider>
      <DashCodeFooter />
      <Toaster />
    </LayoutProvider>
  );
};

export default layout;
