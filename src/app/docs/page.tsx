import type { Metadata } from 'next'
import { DocsContent } from './docs-content'

const title = 'Documentation — OpenAPI → Zod Generator'
const description =
  'Full guide for the OpenAPI → Zod Generator: the web tool, the openapi-zod-gen CLI, OpenAPI compatibility, Pro licensing, FAQ and troubleshooting.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title, description },
}

export default function DocsPage() {
  return <DocsContent />
}
