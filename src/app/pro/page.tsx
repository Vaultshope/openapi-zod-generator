import type { Metadata } from 'next'
import { ProContent } from './pro-content'

const title = 'Get Pro — OpenAPI → Zod Generator'
const description =
  'Unlock full breaking-change reports in the openapi-zod-gen CLI. $39 one-time — pay with USDT (BEP-20) or card. No subscriptions, lifetime updates.'

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

export default function ProPage() {
  return <ProContent />
}
