import type { AppProps } from 'next/app'
import { ThemeProvider } from '../lib/ThemeContext'
import '../styles/globals.css'
import Footer from '../components/Footer'

import AppLayout from '../components/AppLayout'
import { SidebarProvider } from '../lib/SidebarContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppLayout>
          <Component {...pageProps} />
          <Footer />
        </AppLayout>
      </SidebarProvider>
    </ThemeProvider>
  )
}
