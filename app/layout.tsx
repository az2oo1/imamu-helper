import React from 'react';
import { AuthProvider } from '../src/lib/AuthContext';
import { TopBar } from '../src/components/TopBar';
import '../src/index.css';

export const metadata = {
  title: 'Imamu Helper',
  description: 'مساعد طالب جامعة الإمام محمد بن سعود الإسلامية',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        <AuthProvider>
          <div className="min-h-screen flex flex-col font-sans bg-[#121214]">
            <TopBar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
