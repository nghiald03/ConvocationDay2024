import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NGUY HIỂM',
  description:
    'TRANG NÀY RẤT NGUY HIỂM, VUI LÒNG KHÔNG TRUY CẬP KHI KHÔNG CÓ SỰ CHO PHÉP',
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
