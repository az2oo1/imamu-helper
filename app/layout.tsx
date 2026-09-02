import React from 'react';
import { AuthProvider } from '../src/lib/AuthContext';
import { ThemeProvider } from '../src/lib/ThemeContext';
import '../src/index.css';

export const metadata = {
  title: 'مساعد الإمام - المنصة الطلابية الشاملة',
  description: 'المساعد الأكاديمي والطلابي الشامل لطلاب جامعة الإمام محمد بن سعود الإسلامية',
};

import { TopBar } from '../src/components/TopBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen relative font-sans transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col font-sans relative z-0">
              <TopBar />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
