'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const WarningDialog = () => {
  const [open, setOpen] = React.useState(true);
  const [hasAccepted, setHasAccepted] = React.useState(false);

  React.useEffect(() => {
    // Kiểm tra xem người dùng đã chấp nhận chưa trong phiên này
    // Nếu bạn muốn dùng sessionStorage trong môi trường thực:
    // const accepted = sessionStorage.getItem('warningAccepted');
    // if (accepted === 'true') {
    //   setOpen(false);
    //   setHasAccepted(true);
    // }
  }, []);

  const handleAccept = () => {
    setHasAccepted(true);
    setOpen(false);
    // Lưu vào sessionStorage trong môi trường thực:
    // sessionStorage.setItem('warningAccepted', 'true');
  };

  const handleCancel = () => {
    // Đóng trang web
    if (window.confirm('Bạn có chắc muốn thoát khỏi ứng dụng?')) {
      window.close();
      // Nếu window.close() không hoạt động (do bảo mật trình duyệt)
      // có thể chuyển hướng về trang trống hoặc trang đăng xuất
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 100);
    }
  };

  // Không cho phép đóng dialog bằng cách click bên ngoài hoặc ESC
  return (
    <Dialog open={open && !hasAccepted}>
      <DialogContent
        className='sm:max-w-[550px]'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <AlertTriangle className='h-6 w-6 text-amber-500' />
            Lưu ý quan trọng
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4'>
            <ul className='space-y-3 text-sm'>
              <li className='flex gap-2'>
                <span className='text-amber-600 dark:text-amber-500 font-bold mt-0.5'>
                  •
                </span>
                <span>
                  <strong>
                    Bạn không được phép chia sẻ tài khoản cho người khác.
                  </strong>{' '}
                  Tất cả hành vi đều được ghi log. Nếu người khác sử dụng tài
                  khoản của bạn thao tác trên hệ thống thì bạn sẽ bị cảnh cáo.
                </span>
              </li>
              <li className='flex gap-2'>
                <span className='text-amber-600 dark:text-amber-500 font-bold mt-0.5'>
                  •
                </span>
                <span>
                  <strong>
                    Chỉ được thao tác các chức năng theo role đã phân sẵn.
                  </strong>
                </span>
              </li>
              <li className='flex gap-2'>
                <span className='text-amber-600 dark:text-amber-500 font-bold mt-0.5'>
                  •
                </span>
                <span>
                  Nếu có bất kỳ thắc mắc, xin vui lòng{' '}
                  <strong>liên hệ admin</strong>.
                </span>
              </li>
            </ul>
          </div>

          <p className='text-sm text-muted-foreground text-center'>
            Vui lòng đọc kỹ và xác nhận để tiếp tục sử dụng hệ thống
          </p>
        </div>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={handleCancel}
            className='border-destructive/50 text-destructive hover:bg-destructive/10'
          >
            Hủy
          </Button>
          <Button onClick={handleAccept} className='min-w-[120px]'>
            Tôi đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WarningDialog;
