import React, { useState } from 'react'
import PageContainer from '../components/PageContainer'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import Badge from '../components/ui/Badge'
import { useTheme } from '../lib/ThemeContext'

export default function DesignSystem() {
  const { theme } = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showSuccessToast = () => {
    setToast({ message: 'Action completed successfully!', type: 'success' })
  }

  const showErrorToast = () => {
    setToast({ message: 'An unexpected error occurred.', type: 'error' })
  }

  return (
    <PageContainer maxWidth="900px">
      <Navbar />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div style={{ marginTop: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-4xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
          Design System
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          Component library powered by CSS Custom Properties. Current active theme: <strong>{theme}</strong>
        </p>

        {/* Color Palette Section */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            1. Colors & Tokens
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-4)' }}>
            {[
              { name: 'Background', value: 'var(--color-bg)' },
              { name: 'Surface', value: 'var(--color-surface)' },
              { name: 'Surface Hover', value: 'var(--color-surface-hover)' },
              { name: 'Border', value: 'var(--color-border)' },
              { name: 'Accent', value: 'var(--color-accent)' },
              { name: 'Success', value: 'var(--color-success)' },
              { name: 'Error', value: 'var(--color-error)' },
              { name: 'Warning', value: 'var(--color-warning)' },
            ].map((color) => (
              <Card key={color.name} style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-sm)', backgroundColor: color.value, border: '1px solid var(--color-border)' }} />
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 'var(--weight-semibold)' }}>{color.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{color.value}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* Buttons Section */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            2. Buttons
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="success">Success</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading State</Button>
            <Button disabled>Disabled State</Button>
          </div>
        </section>

        {/* Form Fields Section */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            3. Form Inputs & Textareas
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            <div>
              <Input label="Default Text Input" placeholder="Type something..." />
              <Input label="Error Validation State" placeholder="Invalid data..." error="This field is required." />
            </div>
            <div>
              <Textarea label="Default Textarea" placeholder="Write markdown contents..." />
              <Textarea label="Textarea Error" placeholder="Content is too long..." error="Content must not exceed 5MB." />
            </div>
          </div>
        </section>

        {/* Cards & Badges Section */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            4. Cards & Badges
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <Card>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Standard Card</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)' }}>
                This is a regular card layout used to separate content fields.
              </p>
            </Card>
            <Card hoverable>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Hoverable Card</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)' }}>
                Hovering over this card raises its elevation and changes the border.
              </p>
            </Card>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Badge variant="default">#default-badge</Badge>
            <Badge variant="accent">#accent-badge</Badge>
            <Badge variant="outline">#outline-badge</Badge>
            <Badge variant="accent" onClick={() => alert('Badge clicked!')}>#clickable-badge</Badge>
          </div>
        </section>

        {/* Dialogs & Alerts Section */}
        <section style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
            5. Modals & Toast Alerts
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
            <Button variant="success" onClick={showSuccessToast}>Spawn Success Toast</Button>
            <Button variant="danger" onClick={showErrorToast}>Spawn Error Toast</Button>
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Design System Dialog"
            footer={
              <>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsModalOpen(false)}>Confirm Action</Button>
              </>
            }
          >
            <p>
              This is a standard slide-up modal overlay rendering clean layout blocks and supporting background-scroll locking.
            </p>
          </Modal>
        </section>
      </div>
    </PageContainer>
  )
}
