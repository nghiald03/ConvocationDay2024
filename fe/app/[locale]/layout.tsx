import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './theme.css';
import { ThemeProvider } from '@/providers/theme-provider';
import MountedProvider from '@/providers/mounted.provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { getLangDir } from 'rtl-detect';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import DirectionProvider from '@/providers/direction-provider';
import AuthProvider from '@/providers/auth.provider';
import ClientQueryProvider from '@/providers/ClientQueryProvider';
import URLProvider from '@/providers/URLProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Login',
  description: 'Manage your future farm',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const messages = await getMessages();
  const direction = getLangDir('en');

  return (
    <html lang='en' dir={direction}>
      <body className={`${inter.className} dashcode-app`}>
        <NextIntlClientProvider messages={messages} locale='en'>
          <ThemeProvider attribute='class' defaultTheme='light'>
            <MountedProvider>
              <DirectionProvider direction={direction}>
                <ClientQueryProvider>{children}</ClientQueryProvider>
              </DirectionProvider>
            </MountedProvider>
            <Toaster />
            <SonnerToaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
