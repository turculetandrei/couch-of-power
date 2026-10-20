import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n/context';
import { ServiceWorker } from '@/components/service-worker';
import './globals.css';

const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Couch of Power',
  description: 'Jocul cu canapeaua: împarte bilețele cu nume pe un singur telefon sau joacă online cu prietenii.',
  applicationName: 'Couch of Power',
  appleWebApp: { capable: true, title: 'Couch of Power', statusBarStyle: 'black' },
  icons: {
    icon: [
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro" className={onest.variable}>
      <body className="min-h-dvh antialiased">
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
