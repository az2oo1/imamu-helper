/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { Home } from './pages/Home';
import { Tools } from './pages/Tools';
import { GpaToolPage } from './pages/GpaToolPage';
import { PlansToolPage } from './pages/PlansToolPage';
import { Resources } from './pages/Resources';
import { CalendarPage } from './pages/CalendarPage';
import { NewsPage } from './pages/NewsPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  const location = useLocation();
  const isCalendar = location.pathname.startsWith('/calendar');
  const isNews = location.pathname.startsWith('/news');

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <TopBar />
      <main className={`flex-1 w-full mx-auto flex flex-col ${isCalendar ? 'max-w-full overflow-hidden' : isNews ? 'max-w-full bg-gray-50/30' : 'max-w-7xl p-4 sm:p-6 lg:p-8'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tools/gpa" element={<GpaToolPage />} />
          <Route path="/tools/plans" element={<PlansToolPage />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
