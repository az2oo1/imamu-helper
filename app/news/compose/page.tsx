'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ArticleComposePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/news');
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">جاري التوجيه...</span>
      </div>
    </main>
  );
}

