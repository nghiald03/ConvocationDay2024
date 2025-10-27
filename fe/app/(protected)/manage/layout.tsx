import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkin Page',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
