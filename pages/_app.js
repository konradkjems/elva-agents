import { useEffect } from 'react';
import Head from 'next/head';
import { AuthProvider } from '@/lib/supabase/auth-context';
import { Toaster } from '@/components/ui/toaster';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return (
    <AuthProvider>
      <Head>
        <title>Elva Agents - AI Chat Platform</title>
      </Head>
      <Component {...pageProps} />
      <Toaster />
    </AuthProvider>
  );
}
