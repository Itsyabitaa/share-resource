import type { AppProps } from 'next/app'
import { ThemeProvider } from '../lib/ThemeContext'
import '../styles/globals.css'
import Footer from '../components/Footer'

import AppLayout from '../components/AppLayout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AppLayout>
        <Component {...pageProps} />
        <Footer />
      </AppLayout>
    </ThemeProvider>
  )
}
