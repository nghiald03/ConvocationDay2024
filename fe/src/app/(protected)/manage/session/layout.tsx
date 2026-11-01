import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý phiên',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
