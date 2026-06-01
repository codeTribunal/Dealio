import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import './tokens.css'
import { BusinessProvider } from '@/lib/businessContext'
import { I18nProvider } from '@/lib/i18n/i18nContext'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CRM Dashboard',
  description: 'Business management platform',
}

// Runs before paint — reads the theme cookie and sets `.dark` on <html> to
// prevent a light→dark flash. Falls back silently to light if anything fails.
const noFlashScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)crm_theme=(light|dark)/);if(m&&m[1]==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <I18nProvider>
          <BusinessProvider>{children}</BusinessProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
