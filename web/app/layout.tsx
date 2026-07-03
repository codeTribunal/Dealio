import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import './tokens.css'
import { BusinessProvider } from '@/lib/businessContext'
import { I18nProvider } from '@/lib/i18n/i18nContext'
import { ToastProvider } from '@/lib/toast'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  // This app is served on the private host app.dealio.uz, so relative OG /
  // canonical URLs resolve against it. (admin.dealio.uz shares this deployment;
  // both are private - see app/robots.ts.)
  metadataBase: new URL('https://app.dealio.uz'),
  title: 'Dealio',
  description: 'Business management platform',
  // Belt-and-suspenders noindex: app/robots.ts already disallows all crawling,
  // but this also emits <meta name="robots" content="noindex, nofollow"> on
  // every page so the private app is never indexed even if a page is fetched
  // directly. Revisit when the public marketing site launches (see robots.ts).
  robots: { index: false, follow: false },
  // Static fallback only: /favicon.ico is the LIGHT (slate D) version, served
  // from public/favicon.ico. The faviconThemeScript below overrides this at
  // runtime with the dark/light PNG based on the browser/OS color scheme — the
  // Next.js metadata API can't express prefers-color-scheme media on icons.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
}

// Runs before paint — reads the theme cookie and sets `.dark` on <html> to
// prevent a light→dark flash. Falls back silently to light if anything fails.
const noFlashScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)crm_theme=(light|dark)/);if(m&&m[1]==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`

// Runs before paint — sets <html lang> from the locale cookie so screen
// readers pronounce Uzbek/Russian text correctly from the first render.
// I18nProvider keeps it in sync after client-side locale switches.
const langScript = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)crm_locale=(en|uz|ru)/);if(m){document.documentElement.lang=m[1];}}catch(e){}})();`

// Swaps the favicon to match the BROWSER/OS color scheme (not the app theme).
// prefers-color-scheme media on <link> is unreliable for raster favicons and
// Next's metadata API can't express it, so we drive it from matchMedia here.
// Creates a dedicated <link rel="icon" data-theme-favicon> (a PNG, which takes
// precedence over the static .ico) and live-updates it when the OS theme flips.
// Defaults to the light icon if matchMedia is unavailable. As a static-string
// inline script it introduces no hydration mismatch (never reconciled by React).
const faviconThemeScript = `(function(){try{var mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');function set(d){var href=d?'/favicon-dark.png':'/favicon-light.png';var l=document.querySelector("link[rel='icon'][data-theme-favicon]");if(!l){l=document.createElement('link');l.rel='icon';l.type='image/png';l.setAttribute('data-theme-favicon','');document.head.appendChild(l);}if(l.getAttribute('href')!==href){l.setAttribute('href',href);}}set(mq?mq.matches:false);if(mq){var h=function(e){set(e.matches);};if(mq.addEventListener){mq.addEventListener('change',h);}else if(mq.addListener){mq.addListener(h);}}}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" className={manrope.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
        <script dangerouslySetInnerHTML={{ __html: faviconThemeScript }} />
      </head>
      <body>
        <I18nProvider>
          <BusinessProvider>
            <ToastProvider>{children}</ToastProvider>
          </BusinessProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
