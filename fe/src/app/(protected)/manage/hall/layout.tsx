import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý side',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
