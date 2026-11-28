/** Waiting states from the loader reference: "Skeleton" (layout never jumps) and "Typing dots". Palette-only, CSS-driven. */
export function Dots({ label = 'Loading' }: { label?: string }) {
  return <span className="mo-dots" role="status" aria-label={label}><i /><i /><i /></span>
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return <div className="pgrid mo-sk-grid" aria-hidden>{Array.from({ length: count }, (_, i) => <div key={i} className="pcard mo-sk-card" style={{ ['--i' as string]: i }}>
    <div className="pcard-img mo-sk" /><div className="mo-sk-line" /><div className="mo-sk-line s" /></div>)}</div>
}

export function FeaturedSkeleton() {
  return <div className="mo-sk-feat" aria-hidden style={{ gridColumn: '1/-1' }}><div className="mo-sk mo-sk-stage" /><div className="mo-sk-side"><div className="mo-sk-line l" /><div className="mo-sk-line" /><div className="mo-sk-line s" /><div className="mo-sk-line" /></div></div>
}

export function ModalSkeleton() {
  return <div className="mo-sk-modal" aria-hidden><div className="mo-sk mo-sk-stage" /><div className="mo-sk-side"><div className="mo-sk-line l" /><div className="mo-sk-line" /><div className="mo-sk-line s" /><div className="mo-sk-line" /><div className="mo-sk-line s" /></div></div>
}
