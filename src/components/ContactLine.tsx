import { Instagram, Phone, TikTok } from './Icons'

type Kind = 'instagram' | 'tiktok' | 'phone'
export default function ContactLine({ contact, label, onOrder }: { contact: Record<string, string>; label: string; onOrder: (k: Kind) => void }) {
  return (
    <div className="cl" role="group" aria-label={label}>
      <span className="cl-label">{label}</span>
      <button className="cl-phone" disabled={!contact.phone} onClick={() => onOrder('phone')} aria-label="phone">
        <i className="cl-ring"><Phone size={17} /></i><b>{contact.phone || '—'}</b>
      </button>
      <button className="cl-ic" disabled={!contact.instagram} onClick={() => onOrder('instagram')} aria-label="instagram"><Instagram size={20} /></button>
      <button className="cl-ic" disabled={!contact.tiktok} onClick={() => onOrder('tiktok')} aria-label="tiktok"><TikTok size={20} /></button>
    </div>
  )
}
