import React from 'react'
import PageContainer from '../components/PageContainer'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Link from 'next/link'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <PageContainer maxWidth="600px">
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', marginTop: 'var(--space-8)' }}>
        <Card style={{ textAlign: 'center', width: '100%', padding: 'var(--space-8)', border: '2px solid var(--color-error)' }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: 'var(--space-4)' }}>⚠️</span>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)', color: 'var(--color-error)' }}>
            {statusCode ? `Error ${statusCode}` : 'An unexpected error occurred'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-base)' }}>
            {statusCode
              ? `A server-side error occurred with status code ${statusCode}.`
              : 'A client-side runtime error occurred.'}
          </p>
          <Link href="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  )
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
