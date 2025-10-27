import React from 'react';
import FooterContent from './footer-content';

import Image from 'next/image';
import { Icon } from '@/components/ui/icon';

import Link from 'next/link';

const DashCodeFooter = async () => {
  return (
    <FooterContent>
      <div className=' md:flex  justify-between text-default-600 '>
        <div className='text-center ltr:md:text-start rtl:md:text-right text-sm'>
          COPYRIGHT &copy; {new Date().getFullYear()} ConvocationDay, All rights
          Reserved | Powered by Chals HauNguyenDev BaoThien ThinhNguyen
        </div>
      </div>
    </FooterContent>
  );
};

export default DashCodeFooter;
