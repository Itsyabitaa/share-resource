import type { AppProps } from 'next/app'
import { ThemeProvider } from '../lib/ThemeContext'
import { SidebarProvider } from '../lib/SidebarContext'
import { ToastProvider } from '../lib/ToastContext'
import AppLayout from '../components/AppLayout'
import Footer from '../components/Footer'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <ToastProvider>
          <AppLayout>
            <Component {...pageProps} />
            <Footer />
          </AppLayout>
        </ToastProvider>
      </SidebarProvider>
    </ThemeProvider>
  )
}
