import Link from 'next/link'

interface BrandMarkProps {
  href?: string
  size?: number
  stacked?: boolean
}

export default function BrandMark({ href, size = 28, stacked = false }: BrandMarkProps) {
  const content = (
    <span className={`brand${stacked ? ' brand-stacked' : ''}`}>
      <svg
        className="brand-mark"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path
          d="M8 11.5h10.5M8 15.5h16M8 19.5h7"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 23.5c3.4 2.6 10.6 2.6 14 0"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="brand-wordmark">
        md-nest
      </span>
    </span>
  )

  if (!href) {
    return content
  }

  return (
    <Link href={href} className="brand-link" aria-label="md-nest home">
      {content}
    </Link>
  )
}
