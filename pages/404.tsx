import React from 'react'
import Link from 'next/link'
import PageContainer from '../components/PageContainer'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function Custom404() {
  return (
    <PageContainer maxWidth="600px">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', marginTop: 'var(--space-8)' }}>
        <Card style={{ textAlign: 'center', width: '100%', padding: 'var(--space-8)' }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: 'var(--space-4)' }}>🔍</span>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
            404 — Page Not Found
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-base)' }}>
            The page you are looking for does not exist, has been removed, or is private.
          </p>
          <Link href="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  )
}
