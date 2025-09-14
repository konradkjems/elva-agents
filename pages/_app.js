import { useEffect } from 'react';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // Add any global initialization logic here
  }, []);

  return (
    <SessionProvider session={session}>
      <Head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Basic Tailwind-like styles */
            .min-h-screen { min-height: 100vh; }
            .bg-gray-50 { background-color: #f9fafb; }
            .hidden { display: none; }
            .lg\\:fixed { position: fixed; }
            .lg\\:inset-y-0 { top: 0; bottom: 0; }
            .lg\\:z-50 { z-index: 50; }
            .lg\\:flex { display: flex; }
            .lg\\:w-64 { width: 16rem; }
            .lg\\:flex-col { flex-direction: column; }
            .flex { display: flex; }
            .grow { flex-grow: 1; }
            .flex-col { flex-direction: column; }
            .gap-y-5 > * + * { margin-top: 1.25rem; }
            .overflow-y-auto { overflow-y: auto; }
            .border-r { border-right-width: 1px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .bg-white { background-color: #ffffff; }
            .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
            .h-16 { height: 4rem; }
            .shrink-0 { flex-shrink: 0; }
            .items-center { align-items: center; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .font-bold { font-weight: 700; }
            .text-gray-900 { color: #111827; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .-mx-2 { margin-left: -0.5rem; margin-right: -0.5rem; }
            .gap-x-3 { gap: 0.75rem; }
            .rounded-md { border-radius: 0.375rem; }
            .p-2 { padding: 0.5rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .leading-6 { line-height: 1.5rem; }
            .font-semibold { font-weight: 600; }
            .bg-blue-50 { background-color: #eff6ff; }
            .text-blue-700 { color: #1d4ed8; }
            .h-6 { height: 1.5rem; }
            .w-6 { width: 1.5rem; }
            .text-gray-700 { color: #374151; }
            .hover\\:text-blue-700:hover { color: #1d4ed8; }
            .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
            .text-gray-400 { color: #9ca3af; }
            .group:hover .group-hover\\:text-blue-700 { color: #1d4ed8; }
            .lg\\:pl-64 { padding-left: 16rem; }
            .sticky { position: sticky; }
            .top-0 { top: 0; }
            .z-40 { z-index: 40; }
            .gap-x-4 { gap: 1rem; }
            .border-b { border-bottom-width: 1px; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
            .sm\\:gap-x-6 { gap: 1.5rem; }
            .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
            .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
            .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .self-stretch { align-self: stretch; }
            .flex-1 { flex: 1 1 0%; }
            .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .max-w-7xl { max-width: 80rem; }
            .md\\:flex { display: flex; }
            .md\\:items-center { align-items: center; }
            .md\\:justify-between { justify-content: space-between; }
            .min-w-0 { min-width: 0; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .leading-7 { line-height: 1.75rem; }
            .sm\\:truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .sm\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .sm\\:tracking-tight { letter-spacing: -0.025em; }
            .mt-1 { margin-top: 0.25rem; }
            .text-gray-500 { color: #6b7280; }
            .mt-4 { margin-top: 1rem; }
            .md\\:ml-4 { margin-left: 1rem; }
            .md\\:mt-0 { margin-top: 0; }
            .ml-3 { margin-left: 0.75rem; }
            .inline-flex { display: inline-flex; }
            .bg-blue-600 { background-color: #2563eb; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .text-white { color: #ffffff; }
            .hover\\:bg-blue-500:hover { background-color: #3b82f6; }
            .focus-visible\\:outline:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }
            .focus-visible\\:outline-2:focus-visible { outline-width: 2px; }
            .focus-visible\\:outline-offset-2:focus-visible { outline-offset: 2px; }
            .focus-visible\\:outline-blue-600:focus-visible { outline-color: #2563eb; }
            .mt-8 { margin-top: 2rem; }
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            .gap-5 { gap: 1.25rem; }
            .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .overflow-hidden { overflow: hidden; }
            .shadow { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
            .rounded-lg { border-radius: 0.5rem; }
            .p-5 { padding: 1.25rem; }
            .flex-shrink-0 { flex-shrink: 0; }
            .w-8 { width: 2rem; }
            .h-8 { height: 2rem; }
            .bg-blue-500 { background-color: #3b82f6; }
            .justify-center { justify-content: center; }
            .w-5 { width: 1.25rem; }
            .h-5 { height: 1.25rem; }
            .ml-5 { margin-left: 1.25rem; }
            .w-0 { width: 0; }
            .font-medium { font-weight: 500; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .bg-green-500 { background-color: #10b981; }
            .bg-purple-500 { background-color: #8b5cf6; }
            .bg-orange-500 { background-color: #f97316; }
            .text-center { text-align: center; }
            .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
            .hover\\:bg-blue-400:hover { background-color: #60a5fa; }
            .transition { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
            .duration-150 { transition-duration: 150ms; }
            .cursor-not-allowed { cursor: not-allowed; }
            .animate-spin { animation: spin 1s linear infinite; }
            .-ml-1 { margin-left: -0.25rem; }
            .mr-3 { margin-right: 0.75rem; }
            .opacity-25 { opacity: 0.25; }
            .opacity-75 { opacity: 0.75; }
            .mb-4 { margin-bottom: 1rem; }
            
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            
            @media (min-width: 640px) {
              .sm\\:gap-x-6 { gap: 1.5rem; }
              .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
              .sm\\:truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .sm\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
              .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            
            @media (min-width: 768px) {
              .md\\:flex { display: flex; }
              .md\\:items-center { align-items: center; }
              .md\\:justify-between { justify-content: space-between; }
              .md\\:ml-4 { margin-left: 1rem; }
              .md\\:mt-0 { margin-top: 0; }
            }
            
            @media (min-width: 1024px) {
              .lg\\:fixed { position: fixed; }
              .lg\\:inset-y-0 { top: 0; bottom: 0; }
              .lg\\:z-50 { z-index: 50; }
              .lg\\:flex { display: flex; }
              .lg\\:w-64 { width: 16rem; }
              .lg\\:flex-col { flex-direction: column; }
              .lg\\:pl-64 { padding-left: 16rem; }
              .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
              .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            }
          `
        }} />
      </Head>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
