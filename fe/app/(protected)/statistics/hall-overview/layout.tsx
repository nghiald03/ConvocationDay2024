import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thống kê tổng quan ',
  description: 'Thống kê tổng quan',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
