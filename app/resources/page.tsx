import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { Resources } from '../../src/views/Resources';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    redirect('/login');
  }

  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-7xl p-4 sm:p-6 lg:p-8">
      <Resources />
    </main>
  );
}
