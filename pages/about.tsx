import React from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import PageContainer from '../components/PageContainer'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function AboutPage() {
  return (
    <PageContainer maxWidth="800px">
      <Navbar />

      <div style={{ marginTop: 'var(--space-4)', fontFamily: 'var(--font-sans)', lineHeight: 'var(--leading-relaxed)' }}>
        
        {/* Header Title Section */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            About md-Nest
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-base)', margin: 0 }}>
            A modern markdown sharing and backup platform
          </p>
        </div>

        {/* What is md-Nest */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ 
            fontSize: 'var(--font-xl)', 
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-4)', 
            color: 'var(--color-text)',
            borderBottom: '2px solid var(--color-border)',
            paddingBottom: 'var(--space-2)'
          }}>
            What is md-Nest?
          </h2>
          <p style={{ fontSize: 'var(--font-base)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
            md-Nest is a premium platform for creating, converting, and sharing markdown documents. 
            Whether you are a developer drafting API documentations, a student saving markdown notes, or a writer 
            distributing articles, md-Nest offers a secure, instant, and clean environment.
          </p>
          <p style={{ fontSize: 'var(--font-base)', color: 'var(--color-text)' }}>
            Built with modern performance and design aesthetics, md-Nest simplifies markdown writing with auto-formatting, 
            word document parsing (.docx), tag organization, and dedicated user storage control.
          </p>
        </section>

        {/* How to Use Card */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ 
            fontSize: 'var(--font-xl)', 
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-4)', 
            color: 'var(--color-text)',
            borderBottom: '2px solid var(--color-border)',
            paddingBottom: 'var(--space-2)'
          }}>
            How to Use
          </h2>
          <Card>
            <h3 style={{ color: 'var(--color-accent)', fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-3)' }}>
              Getting Started
            </h3>
            <ol style={{ color: 'var(--color-text)', fontSize: 'var(--font-base)', paddingLeft: 'var(--space-5)', margin: 0 }}>
              <li style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Select your Mode:</strong> Direct write in the editor or upload an existing file (TXT, DOCX, MD) for automatic markdown conversion.
              </li>
              <li style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Add Metadata:</strong> Fill in the document title, optional author name, public/private toggles, and hashtag labels.
              </li>
              <li style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Share/Save:</strong> Click Share to upload your document and get a secure unique link immediately.
              </li>
              <li style={{ marginBottom: 'var(--space-2)' }}>
                <strong>Explore:</strong> Browse public notes and document uploads from the community.
              </li>
            </ol>
          </Card>
        </section>

        {/* Copyright Card */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ 
            fontSize: 'var(--font-xl)', 
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-4)', 
            color: 'var(--color-text)',
            borderBottom: '2px solid var(--color-border)',
            paddingBottom: 'var(--space-2)'
          }}>
            Copyright & Platform Specs
          </h2>
          <Card>
            <p style={{ color: 'var(--color-text)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)' }}>
              © {new Date().getFullYear()} md-Nest. All rights reserved.
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)' }}>
              This platform facilitates instant markdown storage and sharing. 
              Users retain full ownership of their contributions and remain responsible for the files shared.
            </p>
            <p style={{ color: 'var(--color-text-weak)', fontSize: 'var(--font-xs)', margin: 0 }}>
              Engineered using Next.js (Pages Router), React 19, Neon database client, and Cloudinary APIs.
            </p>
          </Card>
        </section>

        {/* Back to Home Action */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
          <Link href="/">
            <Button variant="primary">Create a New Document</Button>
          </Link>
        </div>

      </div>
    </PageContainer>
  )
}
