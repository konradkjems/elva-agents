import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return <Component {...pageProps} />;
}
