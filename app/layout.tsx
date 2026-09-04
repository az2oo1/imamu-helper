import React from 'react';
import { AuthProvider } from '../src/lib/AuthContext';
import { ThemeProvider } from '../src/lib/ThemeContext';
import '../src/index.css';

export const metadata = {
  title: 'مساعد الإمام - المنصة الطلابية الشاملة',
  description: 'المساعد الأكاديمي والطلابي الشامل لطلاب جامعة الإمام محمد بن سعود الإسلامية',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'مساعد الإمام',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen relative font-sans transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col font-sans relative z-0">
              <TopBar />
              <div className="flex-1 flex flex-col min-h-0">
                {children}
              </div>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
