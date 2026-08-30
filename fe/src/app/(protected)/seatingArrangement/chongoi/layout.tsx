import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sơ đồ chỗ ngồi 2',
    description: 'Sơ đồ chỗ ngồi 2',
};

const Layout = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export default Layout;