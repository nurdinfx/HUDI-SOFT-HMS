import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { Toaster } from 'sonner'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { TrialGuard } from '@/components/trial-guard'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: 'HUDI_SOFT // HSM',
  description: 'Professional hospital and clinic management: patients, appointments, OPD, IPD, billing, pharmacy, laboratory, and reports.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HUDI_SOFT // HSM',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* iOS PWA Required Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HUDI HMS" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS App Icons — Safari requires explicit apple-touch-icon links */}
        <link rel="apple-touch-icon" href="/logo-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo-192.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/logo-144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/logo-144.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/logo-144.png" />
        {/* Splash screens for iOS */}
        <link rel="apple-touch-startup-image" href="/logo-512.png" />
        {/* Pull-to-refresh & safe area */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0d9488" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <PwaInstallPrompt />
            <TrialGuard />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });

                // Global suppression for MetaMask and other external extension errors
                window.addEventListener('unhandledrejection', (event) => {
                  const msg = event.reason?.message || String(event.reason || '');
                  if (msg.includes('MetaMask') || msg.includes('inpage.js')) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                });
                window.addEventListener('error', (event) => {
                  const msg = event.message || '';
                  if (msg.includes('MetaMask') || (event.filename && event.filename.includes('inpage.js'))) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }, true);

              }
            `,
          }}
        />
      </body>
    </html>
  )
}
