import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lí vacines',
  description: 'Quản lí vacines',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
