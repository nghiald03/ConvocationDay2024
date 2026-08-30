import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import ClientQueryProvider from '@/app/providers/client-query-provider';
import DirectionProvider from '@/app/providers/direction-provider';
import MountedProvider from '@/app/providers/mounted-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { getLangDir } from 'rtl-detect';
import './globals.css';
import './theme.css';

const montserrat = Montserrat({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Login',
  description: 'Manage your future farm',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const direction = getLangDir('en');

  return (
    <html lang='en' dir={direction}>
      <body
        className={`${montserrat.className} dashcode-app h-[100vh] w-[100vw] bg-white`}
      >
        <ThemeProvider attribute='class' defaultTheme='light'>
          <MountedProvider>
            <DirectionProvider direction={direction}>
              <ClientQueryProvider>{children}</ClientQueryProvider>
            </DirectionProvider>
          </MountedProvider>
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
