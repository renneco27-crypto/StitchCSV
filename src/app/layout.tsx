import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import ToastContainer from '@/components/ToastContainer'
import AuthWrapper from '@/components/AuthWrapper'
import Sidebar from '@/components/Sidebar'
import MobileBottomNav from '@/components/MobileBottomNav'
import UploadModal from '@/components/UploadModal'
import './globals.css'

const playfairDisplay = Playfair_Display({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-serif',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'StudyUp',
  description: 'Turn notes into knowledge',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthWrapper>
            <div className="flex flex-col lg:flex-row flex-1">
              <Sidebar />
              <main className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">{children}</main>
            </div>
          </AuthWrapper>
          <MobileBottomNav />
          <UploadModal />
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  )
}
