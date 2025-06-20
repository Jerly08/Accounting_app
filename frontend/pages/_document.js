import Document, { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';
import theme from '../styles/theme';

class MyDocument extends Document {
  render() {
    // Check if we are in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    return (
      <Html lang="en">
        <Head>
          {/* Preconnect to important domains */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* Load Inter font */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
            rel="stylesheet"
          />
          
          {/* In development, add a meta tag to disable CSP entirely */}
          {isDev && (
            <meta
              httpEquiv="Content-Security-Policy"
              content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';"
            />
          )}
        </Head>
        <body>
          {/* Make Color mode persist during page navigations */}
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 