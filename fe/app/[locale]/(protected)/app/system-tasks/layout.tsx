import { Metadata } from 'next';
import TodoWrapper from './todo-wrapper';

export const metadata: Metadata = {
  title: 'Tasks management',
  description: 'Tasks management',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
