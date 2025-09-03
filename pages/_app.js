import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return <Component {...pageProps} />;
}
