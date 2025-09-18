import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import '../styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <Toaster />
    </SessionProvider>
  );
}
