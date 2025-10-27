import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LED Page',
  description: '',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
