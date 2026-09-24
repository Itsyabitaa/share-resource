import { useEffect, useState } from 'react'
import { useAppPaths } from '../lib/appPaths'
import { confirmAction } from '../lib/swal'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_COLORS,
  type SiteAnnouncement,
} from '../lib/announcementTypes'

const emptyForm = {
  id: '',
  title: '',
  message: '',
  enabled: true,
  display: 'banner' as SiteAnnouncement['display'],
  color: 'teal' as SiteAnnouncement['color'],
  placement: 'top' as SiteAnnouncement['placement'],
  audience: 'all' as SiteAnnouncement['audience'],
  ctaLabel: '',
  ctaUrl: '',
  guideSteps: '',
}

export default function AdminAnnouncements({
  onToast,
}: {
  onToast: (message: string, type: 'success' | 'error') => void
}) {
  const { apiPath } = useAppPaths()
  const [items, setItems] = useState<SiteAnnouncement[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch(apiPath('/admin/announcements'))
    const data = await res.json()
    if (res.ok) setItems(data.announcements || [])
  }

  useEffect(() => {
    load().catch(() => onToast('Could not load announcements', 'error'))
  }, [apiPath])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(apiPath('/admin/announcements'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: form.id || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        onToast(data.error || 'Save failed', 'error')
        return
      }
      setForm(emptyForm)
      onToast('Announcement saved', 'success')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (item: SiteAnnouncement) => {
    const res = await fetch(apiPath('/admin/announcements'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    })
    if (res.ok) await load()
  }

  const remove = async (item: SiteAnnouncement) => {
    const ok = await confirmAction({
      title: 'Delete announcement?',
      text: item.title,
      confirmText: 'Delete',
      danger: true,
    })
    if (!ok) return
    const res = await fetch(apiPath('/admin/announcements'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) {
      if (form.id === item.id) setForm(emptyForm)
      await load()
    }
  }

  return (
    <div className="admin-announce-editor">
      <section className="admin-panel">
        <h2>{form.id ? 'Edit announcement' : 'New announcement'}</h2>
        <label className="admin-field">
          <span>Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="admin-field">
          <span>Message</span>
          <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </label>
        <div className="admin-announce-grid">
          <label className="admin-field">
            <span>On / off</span>
            <select value={form.enabled ? 'on' : 'off'} onChange={(e) => setForm({ ...form, enabled: e.target.value === 'on' })}>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Style</span>
            <select value={form.display} onChange={(e) => setForm({ ...form, display: e.target.value as SiteAnnouncement['display'] })}>
              <option value="banner">Banner</option>
              <option value="popup">Popup modal</option>
              <option value="both">Banner and popup</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Color</span>
            <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value as SiteAnnouncement['color'] })}>
              {ANNOUNCEMENT_COLORS.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Where it appears</span>
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as SiteAnnouncement['placement'] })}>
              <option value="top">Top of the page</option>
              <option value="bottom">Bottom of the page</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Who sees it</span>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as SiteAnnouncement['audience'] })}>
              {ANNOUNCEMENT_AUDIENCES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Button label</span>
            <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Try it" />
          </label>
        </div>
        <label className="admin-field">
          <span>Button link (optional)</span>
          <input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://" />
        </label>
        <label className="admin-field">
          <span>Guide steps, one per line. The button opens this modal.</span>
          <textarea rows={6} value={form.guideSteps} onChange={(e) => setForm({ ...form, guideSteps: e.target.value })} />
        </label>
        <div className="admin-file-actions">
          <button type="button" className="header-btn primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save announcement'}
          </button>
          {form.id && (
            <button type="button" className="header-btn" onClick={() => setForm(emptyForm)}>New</button>
          )}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Announcements</h2>
        {items.length === 0 ? <p className="admin-hint">None yet.</p> : items.map((item) => (
          <article key={item.id} className="admin-file-row">
            <div>
              <strong>{item.title}</strong>
              <p className="admin-hint">
                {item.enabled ? 'On' : 'Off'} · {item.display} · {item.color} · {item.placement} · {item.audience}
              </p>
            </div>
            <div className="admin-file-actions">
              <button type="button" className="header-btn" onClick={() => toggle(item)}>{item.enabled ? 'Turn off' : 'Turn on'}</button>
              <button type="button" className="header-btn" onClick={() => setForm({
                id: item.id,
                title: item.title,
                message: item.message,
                enabled: item.enabled,
                display: item.display,
                color: item.color,
                placement: item.placement,
                audience: item.audience,
                ctaLabel: item.ctaLabel || '',
                ctaUrl: item.ctaUrl || '',
                guideSteps: item.guideSteps.join('\n'),
              })}>Edit</button>
              <button type="button" className="header-btn" onClick={() => remove(item)}>Delete</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
