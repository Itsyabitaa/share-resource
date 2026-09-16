export type PlanId = 'guest' | 'free' | 'pro'

import {
  canUsePhotoConversion,
  FREE_MAX_FOLDERS,
  FREE_MAX_PHOTO_CONVERSIONS,
} from './planLimits'

export function canUsePhotoToMarkdown(options: {
  isSignedIn: boolean
  plan: 'free' | 'pro' | null
  photoConversionsUsed?: number
}) {
  if (!options.isSignedIn || !options.plan) return false
  return canUsePhotoConversion(options.plan, options.photoConversionsUsed ?? 0)
}

export { FREE_MAX_FOLDERS, FREE_MAX_PHOTO_CONVERSIONS }

export type PlanFeature = {
  label: string
  included: boolean
}

export type PlanDefinition = {
  id: PlanId
  name: string
  price: string
  priceNote: string
  description: string
  retention: string
  cta: string
  ctaHref: string
  highlighted?: boolean
  features: PlanFeature[]
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'guest',
    name: 'Guest',
    price: 'Free',
    priceNote: 'No account',
    description: 'Try md-nest instantly with a shareable link.',
    retention: '3 days',
    cta: 'Start writing',
    ctaHref: '/',
    features: [
      { label: 'Markdown editor & uploads', included: true },
      { label: 'Shareable links', included: true },
      { label: '3-day storage', included: true },
      { label: 'Workspace & folders', included: false },
      { label: 'Edit anytime', included: false },
      { label: 'Permanent storage', included: false },
    ],
  },
  {
    id: 'free',
    name: 'Free',
    price: 'Free',
    priceNote: 'With account',
    description: 'Organize your writing with folders and a personal workspace.',
    retention: '30 days',
    cta: 'Create free account',
    ctaHref: '/signup',
    features: [
      { label: 'Markdown editor & uploads', included: true },
      { label: 'Shareable links', included: true },
      { label: '30-day storage', included: true },
      { label: '1 folder', included: true },
      { label: '3 photo → markdown scans', included: true },
      { label: 'Edit anytime', included: true },
      { label: 'Permanent storage', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$6',
    priceNote: 'per month',
    description: 'Keep every document forever and never worry about expiry.',
    retention: 'Permanent',
    cta: 'Upgrade to Pro',
    ctaHref: '/pricing#upgrade',
    highlighted: true,
    features: [
      { label: 'Markdown editor & uploads', included: true },
      { label: 'Unlimited photo → markdown scans', included: true },
      { label: 'Shareable links', included: true },
      { label: 'Permanent storage', included: true },
      { label: 'Unlimited folders', included: true },
      { label: 'Edit anytime', included: true },
      { label: 'Kimem AI (Groq trial + your key)', included: true },
      { label: 'Priority support', included: true },
    ],
  },
]
