import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider } from '../lib/ThemeContext'
import '../styles/globals.css'
import Footer from '../components/Footer'

import AppLayout from '../components/AppLayout'
import { SidebarProvider } from '../lib/SidebarContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Head>
        <title>md-nest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SidebarProvider>
        <AppLayout>
          <Component {...pageProps} />
          <Footer />
        </AppLayout>
      </SidebarProvider>
    </ThemeProvider>
  )
}
