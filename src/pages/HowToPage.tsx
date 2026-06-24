import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Play, FileText, ChevronRight } from 'lucide-react';

export function HowToPage() {
  const guides = [
    {
      title: 'كيف أحسب معدلي التراكمي؟',
      description: 'دليل خطوة بخطوة لاستخدام حاسبة المعدل التراكمي والفصلي.',
      icon: <FileText className="w-6 h-6 text-blue-500" />
    },
    {
      title: 'كيف أجد مصادر مادتي؟',
      description: 'تعرف على كيفية تصفح قسم المصادر للحصول على الملخصات والاختبارات السابقة.',
      icon: <HelpCircle className="w-6 h-6 text-purple-500" />
    },
    {
      title: 'كيف أعرف موعد نزول المكافأة؟',
      description: 'طريقة التحقق من العد التنازلي وتاريخ نزول المكافآت.',
      icon: <Play className="w-6 h-6 text-emerald-500" />
    }
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">الشروحات والدليل</h1>
        <p className="text-lg text-gray-500">
          تعرف على كيفية استخدام منصة مساعد الإمام والاستفادة القصوى من خدماتها.
        </p>
      </motion.div>

      <div className="w-full grid gap-6">
        {guides.map((guide, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 flex items-start gap-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
            dir="rtl"
          >
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              {guide.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{guide.title}</h3>
              <p className="text-gray-500">{guide.description}</p>
            </div>
            <div className="mt-auto mb-auto bg-gray-50 p-2 rounded-full text-gray-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
