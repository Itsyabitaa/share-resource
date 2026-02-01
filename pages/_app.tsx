import type { AppProps } from 'next/app'
import { ThemeProvider } from '../lib/ThemeContext'
import '../styles/globals.css'
import Footer from '../components/Footer'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
      <Footer />
    </ThemeProvider>
  )
}
