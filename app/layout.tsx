import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, Manrope } from 'next/font/google'
import './globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Trash2Treasure — Trợ lý tái chế AI tại nhà',
  description:
    'Chụp ảnh rác thải và nhận gợi ý tái chế DIY thông minh, được hỗ trợ bởi Intel OpenVINO. Hướng dẫn từng bước, đọc bằng giọng nói và chế độ an toàn cho trẻ em.',
  generator: '',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#10B981',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html 
      lang="vi" 
      className={`${beVietnamPro.variable} ${manrope.variable} bg-background`}
      suppressHydrationWarning // ✅ Bổ sung dòng này để bỏ qua cảnh báo chênh lệch attribute giữa Server & Client
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}