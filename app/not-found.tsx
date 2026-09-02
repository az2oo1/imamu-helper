import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4" dir="rtl">
      <h1 className="text-6xl font-display font-black text-blue-600 mb-4">404</h1>
      <h2 className="text-xl font-bold mb-2">الصفحة غير موجودة</h2>
      <p className="text-sm text-slate-500 mb-6">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md"
      >
        العودة للصفحة الرئيسية
      </Link>
    </div>
  );
}
