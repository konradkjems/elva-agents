import { useEffect } from 'react';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import '../styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return (
    <SessionProvider
      session={session}
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <Head>
        <title>Elva Agents - AI Chat Platform</title>
      </Head>
      <Component {...pageProps} />
      <Toaster />
    </SessionProvider>
  );
}
