import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Lang, LANGS } from '../../i18n'
import { E, EKey } from '../../i18n/editor'
import { adminSupabase } from '../../lib/supabase'
import {
  EMPTY_CONFIG, FIELDS, Field, SECTIONS, SectionId, SiteConfig, Slide, V, catFields, getVal, isCustom, normalize, setVal, tri,
} from '../../lib/siteConfig'
import type { Ctx } from './Admin'
import HeroMediaPanel from './editor/HeroMediaPanel'
import MediaField from './editor/MediaField'

type Row = { id: string; kind: 'draft' | 'published'; config: unknown; note: string | null; created_at: string }
type PageId = 'home' | 'category' | 'product' | 'login' | 'account'
type Cat = { slug: string; category_translations: { lang: Lang; name: string }[] }
type Sec = { key: string; homepage_translations: { lang: Lang; title: string | null; body: string | null; button_label: string | null }[] }

const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as object).sort(([a], [b]) => a.localeCompare(b))) : x))
const PAGES: PageId[] = ['home', 'category', 'product', 'login', 'account']
const PAGE_KEY: Record<PageId, EKey> = { home: 'p_home', category: 'p_category', product: 'p_product', login: 'p_login', account: 'p_account' }
const TEXT_SECTIONS: SectionId[] = ['hero', 'about', 'banner']

export default function SiteEditor({ lang }: Ctx) {
  const e = useCallback((k: EKey) => E(lang, k), [lang])
  const [cfg, setCfg] = useState<SiteConfig>(EMPTY_CONFIG)
  const [savedJson, setSavedJson] = useState(stable(EMPTY_CONFIG)); const [liveJson, setLiveJson] = useState(stable(EMPTY_CONFIG))
  const [rows, setRows] = useState<Row[]>([]); const [draftId, setDraftId] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading'); const [loadErr, setLoadErr] = useState('')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'); const [viewed, setViewed] = useState({ desktop: true, mobile: false })
  const [page, setPage] = useState<PageId>('home'); const [sec, setSec] = useState<SectionId>('hero')
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false)
  const [showPub, setShowPub] = useState(false); const [showVer, setShowVer] = useState(false); const [confirm, setConfirm] = useState(false); const [note, setNote] = useState('')
  const [cats, setCats] = useState<Cat[]>([]); const [catSlug, setCatSlug] = useState(''); const [productId, setProductId] = useState('')
  const [dbText, setDbText] = useState<Record<string, Sec>>({})
  const frame = useRef<HTMLIFrameElement>(null); const popups = useRef<Window[]>([]); const cfgRef = useRef(cfg); const secRef = useRef(sec)
  cfgRef.current = cfg; secRef.current = sec
  const mobile = device === 'mobile'
  const json = useMemo(() => stable(cfg), [cfg]); const dirty = json !== savedJson

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    const { data, error } = await adminSupabase.from('site_config_versions').select('id,kind,config,note,created_at').order('created_at', { ascending: false }).limit(30)
    if (error) { if (/site_config_versions|schema cache|does not exist|42P01|PGRST205/.test(`${error.code} ${error.message}`)) setState('missing'); else { setLoadErr(error.message); setState('error') } return }
    const list = (data ?? []) as Row[]; setRows(list)
    const draft = list.find(r => r.kind === 'draft'); const live = list.find(r => r.kind === 'published')
    const start = normalize(draft?.config ?? live?.config)
    setDraftId(draft?.id ?? null); setCfg(start); setSavedJson(stable(start)); setLiveJson(stable(normalize(live?.config))); setState('ready')
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void (async () => {
    const [c, p, s] = await Promise.all([
      adminSupabase.from('categories').select('slug,category_translations(lang,name)').eq('is_active', true).order('sort_order'),
      adminSupabase.from('products').select('id').eq('is_active', true).order('sort_order').limit(1),
      adminSupabase.from('homepage_sections').select('key,homepage_translations(lang,title,body,button_label)'),
    ])
    const cl = (c.data ?? []) as Cat[]; setCats(cl); setCatSlug(cl[0]?.slug ?? ''); setProductId((p.data?.[0] as { id: string } | undefined)?.id ?? '')
    setDbText(Object.fromEntries(((s.data ?? []) as Sec[]).map(r => [r.key, r])))
  })() }, [])
  useEffect(() => { const f = (ev: BeforeUnloadEvent) => { if (dirty) { ev.preventDefault() } }; addEventListener('beforeunload', f); return () => removeEventListener('beforeunload', f) }, [dirty])

  /* ---------- live preview bridge ---------- */
  const targets = () => [frame.current?.contentWindow, ...popups.current.filter(w => !w.closed)].filter((w): w is Window => !!w)
  const push = useCallback(() => targets().forEach(w => w.postMessage({ type: 'anva-config', config: cfgRef.current }, location.origin)), [])
  useEffect(() => { push() }, [cfg, push])
  useEffect(() => { targets().forEach(w => w.postMessage({ type: 'anva-highlight', section: sec }, location.origin)) }, [sec])
  useEffect(() => {
    const f = (ev: MessageEvent) => {
      if (ev.origin !== location.origin) return
      const ok = ev.source === frame.current?.contentWindow || popups.current.includes(ev.source as Window); if (!ok) return
      const d = ev.data as { type?: string; section?: string } | null
      if (d?.type === 'anva-ready') { push(); (ev.source as Window).postMessage({ type: 'anva-highlight', section: secRef.current }, location.origin) }
      if (d?.type === 'anva-select' && SECTIONS.some(s => s.id === d.section)) setSec(d.section as SectionId)
    }
    addEventListener('message', f); return () => removeEventListener('message', f)
  }, [push])

  const path = useMemo(() => {
    switch (page) {
      case 'category': return cats.length ? `/c/${catSlug || cats[0].slug}` : '/favorites'
      case 'product': return productId ? `/p/${productId}` : (cats.length ? `/c/${catSlug || cats[0].slug}` : '/favorites')
      case 'login': return '/login'
      case 'account': return '/account'
      default: return ''
    }
  }, [page, cats, catSlug, productId])
  const src = `/${lang}${path}?preview=1`
  const openSection = (s: SectionId) => { setSec(s); const p = SECTIONS.find(x => x.id === s)!.page as PageId; if (p !== page) setPage(p) }
  const switchDevice = (d: 'desktop' | 'mobile') => { setDevice(d); setViewed(v => ({ ...v, [d]: true })) }

  /* ---------- actions ---------- */
  const say = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 5000) }
  const saveDraft = async (): Promise<boolean> => {
    setBusy(true)
    try {
      if (draftId) { const { error } = await adminSupabase.from('site_config_versions').update({ config: cfg }).eq('id', draftId); if (error) throw error }
      else { const { data, error } = await adminSupabase.from('site_config_versions').insert({ kind: 'draft', config: cfg }).select('id').single(); if (error) throw error; setDraftId((data as { id: string }).id) }
      setSavedJson(json); say(true, e('saved_ok')); return true
    } catch (x) { say(false, `${e('err')}: ${(x as { message?: string }).message ?? x}`); return false } finally { setBusy(false) }
  }
  const publish = async () => {
    if (!(await saveDraft())) return
    setBusy(true)
    try {
      const { error } = await adminSupabase.from('site_config_versions').insert({ kind: 'published', config: cfg, note: note.trim() || null }); if (error) throw error
      setLiveJson(json); setShowPub(false); setConfirm(false); setNote(''); say(true, e('published_ok')); await load0()
    } catch (x) { say(false, `${e('err')}: ${(x as { message?: string }).message ?? x}`) } finally { setBusy(false) }
  }
  // refresh history without replacing the working copy
  const load0 = async () => { const { data } = await adminSupabase.from('site_config_versions').select('id,kind,config,note,created_at').order('created_at', { ascending: false }).limit(30); if (data) setRows(data as Row[]) }
  const discard = () => setCfg(normalize(JSON.parse(savedJson)))
  const loadVersion = (r: Row) => { setCfg(normalize(r.config)); setShowVer(false); say(true, e('loaded_ok')) }
  const openPreview = () => { const w = window.open(src, 'anva-preview'); if (w && !popups.current.includes(w)) popups.current.push(w) }

  /* ---------- editing helpers ---------- */
  const set = (id: string, v: V) => setCfg(c => setVal(c, id, mobile, v))
  const reset = (f: Field) => setCfg(c => { const values = { ...c.values }; delete values[f.resp ? `${f.id}|${mobile ? 'm' : 'd'}` : f.id]; return { ...c, values } })
  const setText = (k: string, v: string) => setCfg(c => ({ ...c, content: { ...c.content, [k]: v } }))
  const setMedia = <K extends keyof SiteConfig['media']>(k: K, v: SiteConfig['media'][K]) => setCfg(c => ({ ...c, media: { ...c.media, [k]: v } }))

  const hasLive = rows.some(r => r.kind === 'published')
  const status = dirty ? { k: 'st_unsaved' as EKey, c: 'warn' } : !hasLive && !draftId ? { k: 'st_new' as EKey, c: '' } : hasLive && json === liveJson ? { k: 'st_live' as EKey, c: 'ok' } : { k: 'st_draft' as EKey, c: 'draft' }

  if (state === 'loading') return <p className="empty">{e('loading')}</p>
  if (state === 'missing') return <div className="box glass"><h3>{e('mig_title')}</h3><p>{e('mig_body')}</p></div>
  if (state === 'error') return <div className="box glass"><p className="msg error">{e('err')}: {loadErr}</p></div>

  const fields = FIELDS.filter(f => f.sec === sec)
  const catList = sec === 'cats' && catSlug ? catFields(catSlug) : []
  const control = (f: Field) => {
    const v = getVal(cfg, f.id, mobile); const custom = isCustom(cfg, f, mobile); const id = `f-${f.id}`
    return (
      <div className="ctl" key={f.id}>
        <div className="ctl-top"><label htmlFor={id}>{tri(f.label, lang)}</label>{custom && <button type="button" className="link" onClick={() => reset(f)}>{e('reset')}</button>}</div>
        {f.kind === 'range' && <div className="ctl-range"><input id={id} type="range" min={f.min} max={f.max} step={f.step} value={Number(v)} onChange={ev => set(f.id, Number(ev.target.value))} /><output>{Number(v)}{f.unit ?? ''}</output></div>}
        {f.kind === 'select' && <select id={id} value={String(v)} onChange={ev => set(f.id, ev.target.value)}>{f.opts!.map(o => <option key={o.v} value={o.v}>{tri(o.l, lang)}</option>)}</select>}
        {f.kind === 'color' && <div className="ctl-color"><input id={id} type="color" value={String(v)} onChange={ev => set(f.id, ev.target.value)} /><code>{String(v)}</code></div>}
        {f.kind === 'toggle' && <label className="switch"><input id={id} type="checkbox" checked={Boolean(v)} onChange={ev => set(f.id, ev.target.checked)} /><i />{Boolean(v) ? 'ON' : 'OFF'}</label>}
      </div>)
  }
  const hasResp = [...fields, ...catList].some(f => f.resp)
  const db = (s: string, l: Lang, k: 'title' | 'body' | 'button_label') => dbText[s]?.homepage_translations.find(t => t.lang === l)?.[k] ?? ''

  return (
    <div className="ed">
      <div className="ed-bar">
        <div className="seg" role="group" aria-label="device">
          {(['desktop', 'mobile'] as const).map(d => <button key={d} className={device === d ? 'on' : ''} aria-pressed={device === d} onClick={() => switchDevice(d)}>{e(d)}</button>)}
        </div>
        <label className="ed-page">{e('page')}<select value={page} onChange={ev => setPage(ev.target.value as PageId)}>{PAGES.map(p => <option key={p} value={p}>{e(PAGE_KEY[p])}</option>)}</select></label>
        <span className={`ed-status ${status.c}`} role="status">{e(status.k)}</span>
        <div className="ed-actions">
          <button className="btn-light sm" onClick={() => setShowVer(true)}>{e('versions')}</button>
          <button className="btn-light sm" onClick={openPreview}>{e('open_preview')} ↗</button>
          <button className="btn-light sm" onClick={discard} disabled={!dirty || busy}>{e('discard')}</button>
          <button className="btn-light sm" onClick={() => void saveDraft()} disabled={!dirty || busy}>{busy ? e('saving') : e('save_draft')}</button>
          <button className="btn-dark sm" onClick={() => setShowPub(true)} disabled={busy || (json === liveJson && !dirty)}>{e('publish')}</button>
        </div>
      </div>
      {toast && <p className={`msg ${toast.ok ? 'ok' : 'error'} ed-toast`} role="status">{toast.text}</p>}

      <div className="ed-body">
        <div className={`ed-stage ${device}`}>
          <div className="ed-frame"><iframe ref={frame} key={`${src}`} src={src} title="preview" /></div>
        </div>

        <aside className="ed-panel">
          <p className="muted ed-hint">{e('click_hint')}</p>
          <div className="ed-secs" role="tablist" aria-label={e('sections')}>{SECTIONS.map(s => <button key={s.id} role="tab" aria-selected={sec === s.id} className={sec === s.id ? 'on' : ''} onClick={() => openSection(s.id)}>{tri(s.label, lang)}</button>)}</div>

          <h3>{tri(SECTIONS.find(s => s.id === sec)!.label, lang)}</h3>
          {hasResp && <p className="ed-dev">{mobile ? e('editing_m') : e('editing_d')}</p>}

          {sec === 'hero' && <section className="ed-group"><h4>{e('media')}</h4>
            <HeroMediaPanel lang={lang} title={e('hero_d')} slides={cfg.media.heroD} onChange={(s: Slide[]) => setMedia('heroD', s)} hint={e('hero_legacy')} />
            <HeroMediaPanel lang={lang} title={e('hero_m')} slides={cfg.media.heroM} onChange={(s: Slide[]) => setMedia('heroM', s)} hint={e('hero_m_hint')} /></section>}
          {sec === 'about' && <section className="ed-group"><h4>{e('media')}</h4><MediaField lang={lang} label={e('p_home')} bucket="homepage-images" folder="about" ratio="4:5" path={cfg.media.about} onChange={p => setMedia('about', p)} /></section>}
          {sec === 'banner' && <section className="ed-group"><h4>{e('media')}</h4><MediaField lang={lang} label={e('p_home')} bucket="homepage-images" folder="banner" ratio="21:9" path={cfg.media.banner} onChange={p => setMedia('banner', p)} /></section>}
          {sec === 'auth' && <section className="ed-group"><h4>{e('media')}</h4><MediaField lang={lang} label={e('p_login')} bucket="homepage-images" folder="auth" ratio="3:4" path={cfg.media.auth} onChange={p => setMedia('auth', p)} /></section>}

          {TEXT_SECTIONS.includes(sec) && <section className="ed-group"><h4>{e('texts')}</h4><small className="muted">{e('text_hint')}</small>
            {LANGS.map(l => <fieldset key={l}><legend>{l.toUpperCase()}</legend>
              <label>{e('title')}<input value={cfg.content[`${sec}.${l}.title`] ?? ''} placeholder={db(sec, l, 'title')} onChange={ev => setText(`${sec}.${l}.title`, ev.target.value)} /></label>
              <label>{e('body')}<textarea rows={3} value={cfg.content[`${sec}.${l}.body`] ?? ''} placeholder={db(sec, l, 'body')} onChange={ev => setText(`${sec}.${l}.body`, ev.target.value)} /></label>
              <label>{e('button')}<input value={cfg.content[`${sec}.${l}.button`] ?? ''} placeholder={db(sec, l, 'button_label')} onChange={ev => setText(`${sec}.${l}.button`, ev.target.value)} /></label></fieldset>)}</section>}

          <section className="ed-group"><h4>{e('layout')}</h4>{fields.map(control)}</section>

          {sec === 'cats' && <section className="ed-group"><h4>{e('pick_cat')}</h4>
            {cats.length ? <>
              <select value={catSlug} onChange={ev => setCatSlug(ev.target.value)} aria-label={e('pick_cat')}>{cats.map(c => <option key={c.slug} value={c.slug}>{c.category_translations.find(t => t.lang === lang)?.name ?? c.slug}</option>)}</select>
              <small className="muted">{e('cat_hint')}</small>{catList.map(control)}</> : <p className="muted">{e('no_cats')}</p>}</section>}
          {!hasResp && <p className="muted">{e('same_all')}</p>}
        </aside>
      </div>

      {showPub && <div className="modal-back" role="dialog" aria-modal="true" aria-label={e('pub_title')}><div className="modal">
        <header><h3>{e('pub_title')}</h3><button className="x" onClick={() => setShowPub(false)} aria-label={e('close')}>✕</button></header>
        <div className="modal-body"><p>{e('pub_body')}</p>
          <ul className="checks"><li className={viewed.desktop ? 'ok' : ''}>{viewed.desktop ? '✓' : '○'} {e('pub_desk')}</li><li className={viewed.mobile ? 'ok' : ''}>{viewed.mobile ? '✓' : '○'} {e('pub_mob')}</li></ul>
          <label>{e('pub_note')}<input value={note} maxLength={120} onChange={ev => setNote(ev.target.value)} /></label>
          <label className="chk"><input type="checkbox" checked={confirm} onChange={ev => setConfirm(ev.target.checked)} />{e('pub_confirm')}</label></div>
        <footer><button className="btn-light" onClick={() => setShowPub(false)}>{e('cancel')}</button><button className="btn-dark" disabled={busy || !confirm || !viewed.mobile || !viewed.desktop} onClick={() => void publish()}>{busy ? e('saving') : e('publish')}</button></footer>
      </div></div>}

      {showVer && <div className="modal-back" role="dialog" aria-modal="true" aria-label={e('versions')}><div className="modal">
        <header><h3>{e('versions')}</h3><button className="x" onClick={() => setShowVer(false)} aria-label={e('close')}>✕</button></header>
        <div className="modal-body">{rows.filter(r => r.kind === 'published').length === 0 ? <p className="muted">{e('no_versions')}</p> :
          <ul className="ver">{rows.filter(r => r.kind === 'published').map((r, i) => <li key={r.id}><div><b>{new Date(r.created_at).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'ru' ? 'ru-RU' : 'hy-AM')}</b>{i === 0 && <span className="pill-pink">{e('live_now')}</span>}{r.note && <small>{r.note}</small>}</div>
            <button className="btn-light sm" onClick={() => loadVersion(r)}>{e('load_draft')}</button></li>)}</ul>}</div>
      </div></div>}
    </div>
  )
}
