import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sơ đồ chỗ ngồi',
  description: 'Sơ đồ chỗ ngồi',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
