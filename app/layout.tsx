import React from 'react';
import { AuthProvider } from '../src/lib/AuthContext';
import { ThemeProvider } from '../src/lib/ThemeContext';
import '../src/index.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://imamu.app'),
  title: {
    default: 'مساعد الإمام - المنصة الطلابية الشاملة',
    template: '%s | مساعد الإمام',
  },
  description: 'المساعد الأكاديمي والطلابي الشامل لطلاب جامعة الإمام محمد بن سعود الإسلامية - مصادر، أدوات، تقويم أكاديمي، وأخبار',
  keywords: ['جامعة الإمام', 'مساعد الإمام', 'مواد جامعة الإمام', 'حاسبة المعدل', 'التقويم الأكاديمي', 'ملفات طلابية'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'مساعد الإمام',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: '/',
    siteName: 'مساعد الإمام - IMAMU Helper',
    title: 'مساعد الإمام - المنصة الطلابية الشاملة',
    description: 'المساعد الأكاديمي والطلابي الشامل لطلاب جامعة الإمام محمد بن سعود الإسلامية',
    images: [
      {
        url: '/logo_light.png',
        width: 800,
        height: 800,
        alt: 'شعار مساعد الإمام',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مساعد الإمام - المنصة الطلابية الشاملة',
    description: 'المساعد الأكاديمي والطلابي الشامل لطلاب جامعة الإمام محمد بن سعود الإسلامية',
    images: ['/logo_light.png'],
  },
  icons: {
    icon: '/logo_light.png',
    apple: '/logo_light.png',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F2EC' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const dynamic = 'force-dynamic';

import { TopBar } from '../src/components/TopBar';
import { Footer } from '../src/components/Footer';
import { PwaRegister } from '../src/components/PwaRegister';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('imamu_theme');
                  var isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.style.backgroundColor = '#000000';
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.backgroundColor = '#F5F1EB';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased min-h-screen relative font-sans transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col font-sans relative z-0">
              <TopBar />
              <div className="flex-1 flex flex-col min-h-0">
                {children}
              </div>
              <Footer />
              <PwaRegister />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
