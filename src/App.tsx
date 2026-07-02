/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import ScrollToTop from './components/ScrollToTop';

// Lazy load pages for code splitting
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Tools = React.lazy(() => import('./pages/Tools').then(m => ({ default: m.Tools })));
const GpaToolPage = React.lazy(() => import('./pages/GpaToolPage').then(m => ({ default: m.GpaToolPage })));
const PlansToolPage = React.lazy(() => import('./pages/PlansToolPage').then(m => ({ default: m.PlansToolPage })));
const Resources = React.lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const NewsPage = React.lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HowToPage = React.lazy(() => import('./pages/HowToPage').then(m => ({ default: m.HowToPage })));
const NewbiePage = React.lazy(() => import('./pages/NewbiePage').then(m => ({ default: m.NewbiePage })));
const EmailsPage = React.lazy(() => import('./pages/EmailsPage').then(m => ({ default: m.EmailsPage })));
const NumbersPage = React.lazy(() => import('./pages/NumbersPage').then(m => ({ default: m.NumbersPage })));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
    <div className="w-10 h-10 border-3 border-t-transparent border-[var(--color-imamu-blue)] rounded-full animate-spin" />
    <span className="text-xs font-bold text-gray-500">جاري تحميل الصفحة...</span>
  </div>
);

export default function App() {
  const location = useLocation();
  const isCalendar = location.pathname.startsWith('/calendar');
  const isNews = location.pathname.startsWith('/news');
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#121214]">
      <ScrollToTop />
      <TopBar />
      <main className={`flex-1 w-full mx-auto flex flex-col ${isCalendar ? 'max-w-full overflow-hidden' : isNews ? 'max-w-full bg-transparent' : isAdmin ? 'max-w-full p-4 sm:p-6 lg:p-8' : 'max-w-7xl p-4 sm:p-6 lg:p-8'}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/gpa" element={<GpaToolPage />} />
            <Route path="/tools/plans" element={<PlansToolPage />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/how-to" element={<HowToPage />} />
            <Route path="/newbie" element={<NewbiePage />} />
            <Route path="/emails" element={<EmailsPage />} />
            <Route path="/numbers" element={<NumbersPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
