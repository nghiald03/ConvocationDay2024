import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nhật ký thao tác',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
