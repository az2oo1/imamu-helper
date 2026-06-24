import React from 'react';
import { motion } from 'motion/react';
import { Calculator, BookOpen, Calendar, Newspaper, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    name: 'GPA Calculator & Plans',
    description: 'Calculate your GPA accurately and download study plans for every major.',
    icon: Calculator,
    path: '/tools',
    color: 'bg-sky-50 text-[var(--color-imamu-blue)]',
  },
  {
    name: 'Student Resources',
    description: 'Access curated PDFs, past exams, and community WhatsApp groups for every subject.',
    icon: BookOpen,
    path: '/resources',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    name: 'Campus Calendar',
    description: 'Stay updated with important university events and academic deadlines.',
    icon: Calendar,
    path: '/calendar',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'IMAMU News',
    description: 'The latest updates and announcements directly from top university sources.',
    icon: Newspaper,
    path: '/news',
    color: 'bg-purple-50 text-purple-700',
  },
];

export function Home() {
  return (
    <div className="flex flex-col items-center flex-1 w-full pt-16 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-3xl px-4"
      >
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-gray-900 mb-6">
          Your Academic Journey,<br />
          <span className="text-[var(--color-imamu-blue)]">Simplified with IMAMU Helper.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed font-light">
          An intuitive platform designed by students, for students. Calculate your GPA, find essential resources, and stay connected with Imam University events.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/tools" className="px-8 py-4 rounded-full bg-[var(--color-imamu-blue)] text-white font-medium shadow-lg shadow-[var(--color-imamu-blue)]/10 hover:bg-[var(--color-imamu-blue-light)] transition px-8 py-3 w-full sm:w-auto text-center">
            Explore Tools
          </Link>
          <Link to="/resources" className="px-8 py-4 rounded-full bg-white text-gray-900 border border-gray-200 font-medium hover:bg-gray-50 transition w-full sm:w-auto text-center">
            Browse Resources
          </Link>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-24 w-full max-w-5xl px-4"
      >
        {features.map((feat) => (
          <Link key={feat.name} to={feat.path} className="group relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
            <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center mb-6`}>
              <feat.icon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-gray-900 mb-3">{feat.name}</h3>
            <p className="text-gray-500 leading-relaxed">{feat.description}</p>
            <div className="absolute bottom-8 right-8 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
