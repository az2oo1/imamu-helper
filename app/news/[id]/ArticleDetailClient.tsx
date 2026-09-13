'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewsArticleModal } from '../../../src/components/NewsArticleModal';
import { ArrowRight, Newspaper } from 'lucide-react';

interface ArticleDetailClientProps {
  articleId: string;
  initialArticle?: any;
}

export default function ArticleDetailClient({ articleId, initialArticle }: ArticleDetailClientProps) {
  const router = useRouter();
  const [article, setArticle] = useState<any>(initialArticle || null);
  const [loading, setLoading] = useState(!initialArticle);

  useEffect(() => {
    if (!initialArticle && articleId) {
      setLoading(true);
      fetch(`/api/news/${articleId}`)
        .then(res => res.json())
        .then(data => {
          if (data.article || data.id) {
            setArticle(data.article || data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [articleId, initialArticle]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل المقال...</span>
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl">
          <Newspaper className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">المقال غير موجود</h2>
          <p className="text-xs text-neutral-400 mb-6">تعذر العثور على المقال المطلوب أو تم حذفه.</p>
          <button
            onClick={() => router.push('/news')}
            className="px-6 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold text-xs rounded-2xl border border-neutral-700/60 shadow-lg flex items-center justify-center gap-2 mx-auto transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>العودة للأخبار</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white w-full py-6">
      <NewsArticleModal
        article={article}
        isOpen={true}
        isStandalonePage={true}
        onClose={() => router.push('/news')}
      />
    </main>
  );
}
