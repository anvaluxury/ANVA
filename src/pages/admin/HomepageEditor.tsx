import { useCallback, useEffect, useState } from 'react'
import { publicUrl, uploadImage } from '../../lib/auth'
import { adminSupabase as supabase } from '../../lib/supabase'
import type { Ctx } from './Admin'
import HeroMediaEditor from './HeroMediaEditor'
import { translate } from '../../lib/translate'

const LANGS = ['hy', 'ru', 'en'] as const
const KEYS = ['hero', 'about', 'banner'] as const
type Lang = typeof LANGS[number]
type Translation = { title: string; body: string; button_label: string }

const emptyTranslation = (): Translation => ({ title: '', body: '', button_label: '' })
const DEFAULT_COPY: Record<'hero' | 'banner', Record<Lang, Translation>> = {
  hero: {
    hy: { title: 'Զարդեր՝ Ձեր ոճի համար', body: 'Արծաթյա զարդերի նրբաճաշակ ընտրանի՝ ամեն օրվա և հատուկ պահերի համար։', button_label: 'Դիտել տեսականին' },
    ru: { title: 'Украшения для вашего стиля', body: 'Изысканные серебряные украшения на каждый день и для особых моментов.', button_label: 'Смотреть коллекцию' },
    en: { title: 'Jewellery for your style', body: 'Refined silver pieces for everyday wear and special moments.', button_label: 'Explore the collection' }
  },
  banner: {
    hy: { title: 'Ձեր ոճին արժանի ընտրություն', body: 'Յուրաքանչյուր զարդ իր փոքրիկ պատմությունն ունի։ Ընտրեք այն, որը կարտահայտի Ձեր անհատականությունն ու կդառնա սիրելի դետալը։', button_label: 'Դիտել զարդերը' },
    ru: { title: 'Выбор, достойный вашего стиля', body: 'У каждого украшения своя история. Выберите то, которое подчеркнёт вашу индивидуальность и станет любимой деталью образа.', button_label: 'Смотреть украшения' },
    en: { title: 'A choice that reflects your style', body: 'Every piece has its own story. Choose the one that expresses your individuality and becomes a favourite detail of your look.', button_label: 'Discover the jewellery' }
  }
}

export default function HomepageEditor({ T, lang }: Ctx) {
  const [rows, setRows] = useState<Record<string, any>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*,homepage_translations(lang,title,body,button_label)')
    if (error) {
      setMsg(`${T('err')}: ${error.message}`)
      return
    }
    setRows(Object.fromEntries((data ?? []).map((r: any) => [
      r.key,
      {
        ...r,
        tr: Object.fromEntries(LANGS.map(l => [
          l,
          (() => {
            const saved = r.homepage_translations?.find((t: any) => t.lang === l)
            if (saved) return saved
            if (r.key === 'hero' || r.key === 'banner') {
              const defaultKey: keyof typeof DEFAULT_COPY = r.key
              return DEFAULT_COPY[defaultKey][l]
            }
            return emptyTranslation()
          })()
        ]))
      }
    ])))
  }, [T])

  useEffect(() => { void load() }, [load])

  const upd = (k: string, patch: any) =>
    setRows(r => ({ ...r, [k]: { ...r[k], ...patch } }))

  const updHy = (k: string, patch: Partial<Translation>) =>
    setRows(r => ({
      ...r,
      [k]: { ...r[k], tr: { ...r[k].tr, hy: { ...r[k].tr.hy, ...patch } } }
    }))

  const persistSection = async (k: string, r: any, armenian: Translation, translated: { translations: { ru: Translation; en: Translation } }) => {
    const { error: sectionError } = await supabase.from('homepage_sections').update({
      is_active: r.is_active, link: r.link || null, image_path: r.image_path || null
    }).eq('key', k)
    if (sectionError) throw sectionError
    const records = LANGS.map(l => ({
      section_key: k, lang: l,
      title: l === 'hy' ? armenian.title : translated.translations[l].title,
      body: l === 'hy' ? armenian.body : translated.translations[l].body,
      button_label: l === 'hy' ? armenian.button_label : translated.translations[l].button_label
    }))
    const { error: translationError } = await supabase.from('homepage_translations').upsert(records, { onConflict: 'section_key,lang' })
    if (translationError) throw translationError
    setRows(current => ({ ...current, [k]: { ...current[k], tr: { hy: armenian, ru: translated.translations.ru, en: translated.translations.en } } }))
    setMsg(`${T('saved')} · ${T(k as any)} · HY / RU / EN`)
  }

  const save = async (k: string) => {
    setMsg('')
    setSaving(k)
    try {
      const r = rows[k]
      const armenian: Translation = {
        title: (r.tr.hy.title ?? '').trim(),
        body: (r.tr.hy.body ?? '').trim(),
        button_label: (r.tr.hy.button_label ?? '').trim()
      }

      const isDefaultCopy = (k === 'hero' || k === 'banner') &&
        armenian.title === DEFAULT_COPY[k].hy.title && armenian.body === DEFAULT_COPY[k].hy.body &&
        armenian.button_label === DEFAULT_COPY[k].hy.button_label
      if (isDefaultCopy) {
        const translated = { translations: { ru: DEFAULT_COPY[k].ru, en: DEFAULT_COPY[k].en } }
        await persistSection(k, r, armenian, translated)
        return
      }

      // Custom Armenian text uses the existing client translator; no Edge Function is required.
      const translateOne = async (value: string, language: 'ru' | 'en') => {
        if (!value) return ''
        const result = await translate(value, language)
        if (result === null) throw new Error(language === 'ru'
          ? 'Ռուսերեն թարգմանությունը չհաջողվեց։ Ստուգեք ինտերնետ կապը և կրկին փորձեք։'
          : 'Անգլերեն թարգմանությունը չհաջողվեց։ Ստուգեք ինտերնետ կապը և կրկին փորձեք։')
        return result
      }
      const [ruTitle, ruBody, ruButton, enTitle, enBody, enButton] = await Promise.all([
        translateOne(armenian.title, 'ru'), translateOne(armenian.body, 'ru'), translateOne(armenian.button_label, 'ru'),
        translateOne(armenian.title, 'en'), translateOne(armenian.body, 'en'), translateOne(armenian.button_label, 'en')
      ])
      const translated = { translations: {
        ru: { title: ruTitle, body: ruBody, button_label: ruButton },
        en: { title: enTitle, body: enBody, button_label: enButton }
      } }

      await persistSection(k, r, armenian, translated)

    } catch (e: any) {
      setMsg(`${T('err')}: ${e?.message || 'Չհաջողվեց պահպանել'}`)
    } finally {
      setSaving(null)
    }
  }

  const up = async (k: string, f?: File) => {
    if (!f) return
    try {
      upd(k, { image_path: await uploadImage('homepage-images', f, k) })
    } catch (e: any) {
      setMsg(`${T('err')}: ${e.message === 'type' || e.message === 'size' ? T('err_file') : e.message}`)
    }
  }

  return <>
    <HeroMediaEditor lang={lang} T={T} />
    {KEYS.filter(k => rows[k]).map(k => {
      const r = rows[k]
      return <section className="glass box" key={k}>
        <h3>{T(k as any)}</h3>
        <p className="wide" style={{ opacity: .8, marginTop: 0 }}>
          Գրեք միայն հայերեն․ ռուսերեն և անգլերեն տարբերակները կստեղծվեն ավտոմատ՝ պահպանելիս։
        </p>
        <div className="grid">
          <label>{T('ttl')} · ՀԱՅԵՐԵՆ
            <input value={r.tr.hy.title ?? ''} onChange={e => updHy(k, { title: e.target.value })} />
          </label>
          <label className="wide">{T('body')} · ՀԱՅԵՐԵՆ
            <textarea rows={3} value={r.tr.hy.body ?? ''} onChange={e => updHy(k, { body: e.target.value })} />
          </label>
          <label>{T('btn')} · ՀԱՅԵՐԵՆ
            <input value={r.tr.hy.button_label ?? ''} onChange={e => updHy(k, { button_label: e.target.value })} />
          </label>
          <label>{T('link')}
            <input value={r.link ?? ''} onChange={e => upd(k, { link: e.target.value })} />
          </label>
          {k !== 'hero' && <label>{T('image')}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => up(k, e.target.files?.[0])} />
            {r.image_path && <img className="mini" src={publicUrl('homepage-images', r.image_path)} alt="" />}
          </label>}
          <label className="chk">
            <input type="checkbox" checked={r.is_active} onChange={e => upd(k, { is_active: e.target.checked })} />
            {T('active')}
          </label>
        </div>
        <div className="acts">
          <button className="btn-dark" disabled={saving === k} onClick={() => save(k)}>
            {saving === k ? 'Թարգմանվում և պահպանվում է…' : 'Պահպանել և թարգմանել'}
          </button>
        </div>
      </section>
    })}
    <p role="status" style={{ color: '#fff' }}>{msg || T('live')}</p>
  </>
}
