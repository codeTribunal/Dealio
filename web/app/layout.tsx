import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BusinessProvider } from '@/lib/businessContext'
import { I18nProvider } from '@/lib/i18n/i18nContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Dashboard',
  description: 'Business management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          <BusinessProvider>{children}</BusinessProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
