import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import ClientQueryProvider from '@/providers/ClientQueryProvider';
import DirectionProvider from '@/providers/direction-provider';
import MountedProvider from '@/providers/mounted.provider';
import { ThemeProvider } from '@/providers/theme-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLangDir } from 'rtl-detect';
import './globals.css';
import './theme.css';

const inter = Inter({ subsets: ['latin'] });

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
        className={`${inter.className} dashcode-app h-[100vh] w-[100vw] bg-white`}
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
