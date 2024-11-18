import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lí chuồng trại',
  description: 'Quản lí chuồng trại',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
