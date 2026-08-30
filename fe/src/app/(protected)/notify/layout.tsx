import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông báo',
  description: 'Hệ thống quản lý thông báo',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;