import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider } from '../lib/ThemeContext'
import '../styles/globals.css'
import 'sweetalert2/dist/sweetalert2.min.css'

import AppLayout from '../components/AppLayout'
import { SidebarProvider } from '../lib/SidebarContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Head>
        <title>md-nest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f766e" />
        <meta name="application-name" content="md-nest" />
        <meta name="description" content="md-nest — write, share, and keep markdown documents." />
      </Head>
      <SidebarProvider>
        <AppLayout>
          <Component {...pageProps} />
        </AppLayout>
      </SidebarProvider>
    </ThemeProvider>
  )
}
