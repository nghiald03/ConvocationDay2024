import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trang hướng dẫn',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
