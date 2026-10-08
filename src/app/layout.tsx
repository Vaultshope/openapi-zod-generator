import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

/* ── Typography ────────────────────────────────────────────────
   Inter — highly legible UI face, excellent at small sizes,
   tabular numerals for the code-adjacent chrome. */
const inter = Inter({ subsets: ['latin'], display: 'swap' })

const url = 'https://openapi-zod-generator.pages.dev'
const title = 'OpenAPI → Zod Generator'
const description =
  'Correctness-first OpenAPI → Zod/TypeScript code generator. Generates Zod schemas, TypeScript types, React Hook Form resolvers, TanStack Query hooks, MSW handlers and Faker factories — 100% client-side, your spec never leaves your browser.'

/* ── SEO & social cards ────────────────────────────────────── */
export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  keywords: [
    'openapi',
    'swagger',
    'zod',
    'typescript',
    'code generator',
    'schema validation',
    'react-hook-form',
    'tanstack query',
    'msw',
    'faker',
  ],
  openGraph: {
    type: 'website',
    url,
    siteName: title,
    title,
    description,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'OpenAPI → Zod Generator — turn any OpenAPI spec into production-ready code, 100% client-side',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
  ],
}

/* Runs BEFORE hydration: applies the stored theme so dark-mode
   users never see a white flash. Default (no preference) = dark.
   Keep in sync with the toggle logic in src/app/page.tsx. */
const themeInit = `try{if(localStorage.getItem("theme")==="light"){document.documentElement.classList.remove("dark")}}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.className}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
