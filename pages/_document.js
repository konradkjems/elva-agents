import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/images/Elva Logo Icon 2.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/Elva Logo Icon 2.png" />
        
        {/* Meta tags */}
        <meta name="description" content="Elva Agents - AI Chat Platform for Customer Service" />
        <meta name="keywords" content="AI, chatbot, customer service, elva, agents" />
        <meta name="author" content="Elva Solutions" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Elva Agents" />
        <meta property="og:description" content="AI Chat Platform for Customer Service" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/images/Elva Logo Icon 2.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Elva Agents" />
        <meta name="twitter:description" content="AI Chat Platform for Customer Service" />
        <meta name="twitter:image" content="/images/Elva Logo Icon 2.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
