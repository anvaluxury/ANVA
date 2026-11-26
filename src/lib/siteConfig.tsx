import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Lang } from '../i18n'
import { supabase, supabaseConfigured } from './supabase'

/* ------------------------------------------------------------------------------------------------
   Site configuration = everything the visual editor can change.
   - One flat registry (FIELDS) describes every editable property: label (hy/ru/en), control type,
     range, default for desktop and for mobile, and the CSS variable / data attribute it drives.
   - The public site reads the newest *published* row of public.site_config_versions.
   - The editor works on the *draft* row and pushes it into an iframe of the real site via postMessage.
   If the table does not exist yet (migration 005 not applied) the defaults below are used, so the
   site keeps working exactly as before.
------------------------------------------------------------------------------------------------ */

export type Tri = readonly [hy: string, ru: string, en: string]
export const tri = (t: Tri, lang: Lang) => t[lang === 'hy' ? 0 : lang === 'ru' ? 1 : 2]
export type V = string | number | boolean

export type SectionId = 'global' | 'header' | 'hero' | 'cats' | 'featured' | 'about' | 'banner' | 'footer' | 'grid' | 'product' | 'auth' | 'account'
export type PageId = 'home' | 'category' | 'product' | 'login' | 'account'

export const SECTIONS: { id: SectionId; page: PageId; label: Tri }[] = [
  { id: 'global', page: 'home', label: ['Ընդհանուր', 'Общие', 'Global'] },
  { id: 'header', page: 'home', label: ['Վերնագլուխ', 'Шапка', 'Header'] },
  { id: 'hero', page: 'home', label: ['Գովազդային բաժին', 'Рекламный баннер', 'Hero banner'] },
  { id: 'cats', page: 'home', label: ['Կատեգորիաներ', 'Категории', 'Categories'] },
  { id: 'featured', page: 'home', label: ['Ընտրված զարդ', 'Избранное украшение', 'Featured piece'] },
  { id: 'about', page: 'home', label: ['Մեր մասին', 'О нас', 'About'] },
  { id: 'banner', page: 'home', label: ['Բաններ', 'Баннер', 'Banner'] },
  { id: 'footer', page: 'home', label: ['Ստորագիր', 'Подвал', 'Footer'] },
  { id: 'grid', page: 'category', label: ['Ապրանքների ցանց', 'Сетка товаров', 'Product grid'] },
  { id: 'product', page: 'product', label: ['Ապրանքի էջ', 'Страница товара', 'Product page'] },
  { id: 'auth', page: 'login', label: ['Մուտք և գրանցում', 'Вход и регистрация', 'Login & register'] },
  { id: 'account', page: 'account', label: ['Անձնական հաշիվ', 'Личный кабинет', 'My account'] },
]

type Opt = { v: string; l: Tri }
export type Field = {
  id: string; sec: SectionId; kind: 'range' | 'select' | 'color' | 'toggle'; label: Tri
  resp?: boolean            // separate desktop / mobile values
  d: V; m?: V               // defaults (m falls back to d)
  min?: number; max?: number; step?: number; unit?: string; div?: number
  css?: string              // CSS variable driven by this field
  opts?: Opt[]
}

const o = (v: string, hy: string, ru: string, en: string): Opt => ({ v, l: [hy, ru, en] })
const ASPECTS = [o('1 / 1', 'Քառակուսի 1:1', 'Квадрат 1:1', 'Square 1:1'), o('4 / 5', 'Ուղղահայաց 4:5', 'Вертикально 4:5', 'Portrait 4:5'), o('3 / 4', 'Ուղղահայաց 3:4', 'Вертикально 3:4', 'Portrait 3:4'), o('4 / 3', 'Հորիզոնական 4:3', 'Горизонтально 4:3', 'Landscape 4:3'), o('16 / 9', 'Լայն 16:9', 'Широко 16:9', 'Wide 16:9')]
const ALIGN3 = [o('left', 'Ձախ', 'Слева', 'Left'), o('center', 'Կենտրոն', 'По центру', 'Center'), o('right', 'Աջ', 'Справа', 'Right')]
const VALIGN = [o('top', 'Վերևում', 'Сверху', 'Top'), o('middle', 'Մեջտեղում', 'По центру', 'Middle'), o('bottom', 'Ներքևում', 'Снизу', 'Bottom')]
const fit = [o('cover', 'Լցնել (կտրելով)', 'Заполнить (с обрезкой)', 'Fill (crop)'), o('contain', 'Ամբողջությամբ', 'Целиком', 'Show whole')]

const focus = (sec: SectionId, p: string, base: [number, number, number] = [50, 50, 100]): Field[] => [
  { id: `${p}.fx`, sec, kind: 'range', resp: true, d: base[0], min: 0, max: 100, step: 1, unit: '%', css: `--${p}-fx`, label: ['Նկարի դիրք՝ հորիզոնական', 'Положение фото по горизонтали', 'Image position: horizontal'] },
  { id: `${p}.fy`, sec, kind: 'range', resp: true, d: base[1], min: 0, max: 100, step: 1, unit: '%', css: `--${p}-fy`, label: ['Նկարի դիրք՝ ուղղահայաց', 'Положение фото по вертикали', 'Image position: vertical'] },
  { id: `${p}.zoom`, sec, kind: 'range', resp: true, d: base[2], min: 100, max: 220, step: 1, unit: '%', div: 100, css: `--${p}-zoom`, label: ['Նկարի մասշտաբ (կտրվածք)', 'Масштаб фото (кадрирование)', 'Image zoom (crop)'] },
]

export const FIELDS: Field[] = [
  // global
  { id: 'g.tone', sec: 'global', kind: 'select', d: 'white', label: ['Էջի ֆոն', 'Фон страницы', 'Page background'], opts: [o('white', 'Մաքուր սպիտակ', 'Чисто белый', 'Pure white'), o('pearl', 'Բաց արծաթ', 'Светлое серебро', 'Light silver'), o('silver', 'Փափուկ մոխրագույն', 'Мягкий серый', 'Soft gray')] },
  { id: 'g.maxw', sec: 'global', kind: 'range', d: 1280, min: 1000, max: 1600, step: 20, unit: 'px', css: '--maxw', label: ['Բովանդակության առավելագույն լայնություն', 'Максимальная ширина контента', 'Content max width'] },
  { id: 'g.radius', sec: 'global', kind: 'range', resp: true, d: 18, m: 14, min: 0, max: 40, step: 1, unit: 'px', css: '--r', label: ['Անկյունների կլորացում', 'Скругление углов', 'Corner radius'] },
  { id: 'g.gap', sec: 'global', kind: 'range', resp: true, d: 96, m: 56, min: 24, max: 180, step: 4, unit: 'px', css: '--sec-gap', label: ['Հեռավորությունը բաժինների միջև', 'Отступ между разделами', 'Spacing between sections'] },
  // header
  { id: 'header.logoH', sec: 'header', kind: 'range', resp: true, d: 46, m: 36, min: 24, max: 90, step: 1, unit: 'px', css: '--logo-h', label: ['Լոգոյի բարձրությունը', 'Высота логотипа', 'Logo height'] },
  { id: 'header.sticky', sec: 'header', kind: 'toggle', d: true, label: ['Վերնագլուխը մնում է ոլորելիս', 'Шапка остаётся при прокрутке', 'Keep header visible while scrolling'] },
  { id: 'header.phone', sec: 'header', kind: 'toggle', d: true, label: ['Ցույց տալ հեռախոսը', 'Показывать телефон', 'Show phone number'] },
  // hero
  { id: 'hero.h', sec: 'hero', kind: 'range', resp: true, d: 82, m: 72, min: 40, max: 100, step: 1, unit: 'svh', css: '--hero-h', label: ['Բաժնի բարձրությունը', 'Высота баннера', 'Banner height'] },
  { id: 'hero.align', sec: 'hero', kind: 'select', resp: true, d: 'left', m: 'center', opts: ALIGN3, label: ['Տեքստի դիրքը՝ հորիզոնական', 'Положение текста по горизонтали', 'Text position: horizontal'] },
  { id: 'hero.valign', sec: 'hero', kind: 'select', resp: true, d: 'middle', m: 'bottom', opts: VALIGN, label: ['Տեքստի դիրքը՝ ուղղահայաց', 'Положение текста по вертикали', 'Text position: vertical'] },
  { id: 'hero.textW', sec: 'hero', kind: 'range', resp: true, d: 560, m: 320, min: 220, max: 900, step: 10, unit: 'px', css: '--hero-textw', label: ['Տեքստի բլոկի լայնությունը', 'Ширина текстового блока', 'Text block width'] },
  { id: 'hero.title', sec: 'hero', kind: 'range', resp: true, d: 58, m: 34, min: 22, max: 96, step: 1, unit: 'px', css: '--hero-title', label: ['Վերնագրի չափը', 'Размер заголовка', 'Title size'] },
  { id: 'hero.body', sec: 'hero', kind: 'range', resp: true, d: 18, m: 15, min: 12, max: 26, step: 1, unit: 'px', css: '--hero-body', label: ['Տեքստի չափը', 'Размер текста', 'Text size'] },
  { id: 'hero.color', sec: 'hero', kind: 'color', d: '#ffffff', css: '--hero-color', label: ['Տեքստի գույնը', 'Цвет текста', 'Text color'] },
  { id: 'hero.overlay', sec: 'hero', kind: 'range', resp: true, d: 30, m: 38, min: 0, max: 80, step: 1, unit: '%', div: 100, css: '--hero-ov', label: ['Մթեցում (կարդացվելու համար)', 'Затемнение (для читаемости)', 'Darkening (for readability)'] },
  { id: 'hero.pad', sec: 'hero', kind: 'range', resp: true, d: 64, m: 22, min: 12, max: 140, step: 2, unit: 'px', css: '--hero-pad', label: ['Տեքստի ներքին լուսանցք', 'Внутренний отступ', 'Edge padding'] },
  ...focus('hero', 'hero'),
  // categories
  { id: 'cats.cols', sec: 'cats', kind: 'range', resp: true, d: 4, m: 2, min: 1, max: 6, step: 1, css: '--cat-cols', label: ['Սյունակների քանակը', 'Количество колонок', 'Columns'] },
  { id: 'cats.gap', sec: 'cats', kind: 'range', resp: true, d: 16, m: 10, min: 0, max: 40, step: 1, unit: 'px', css: '--cat-gap', label: ['Քարտերի միջև հեռավորությունը', 'Расстояние между карточками', 'Gap between cards'] },
  { id: 'cats.aspect', sec: 'cats', kind: 'select', resp: true, d: '4 / 5', m: '3 / 4', css: '--cat-aspect', opts: ASPECTS, label: ['Քարտի համամասնությունը', 'Пропорции карточки', 'Card proportions'] },
  { id: 'cats.radius', sec: 'cats', kind: 'range', resp: true, d: 16, m: 12, min: 0, max: 40, step: 1, unit: 'px', css: '--cat-r', label: ['Քարտի կլորացումը', 'Скругление карточки', 'Card radius'] },
  { id: 'cats.title', sec: 'cats', kind: 'range', resp: true, d: 20, m: 15, min: 12, max: 34, step: 1, unit: 'px', css: '--cat-title', label: ['Անվան չափը', 'Размер названия', 'Name size'] },
  { id: 'cats.shade', sec: 'cats', kind: 'range', resp: true, d: 34, m: 40, min: 0, max: 80, step: 1, unit: '%', div: 100, css: '--cat-shade', label: ['Անվան հետևի մթեցումը', 'Затемнение под названием', 'Shade behind name'] },
  { id: 'cats.align', sec: 'cats', kind: 'select', d: 'left', opts: [o('left', 'Ձախ', 'Слева', 'Left'), o('center', 'Կենտրոն', 'По центру', 'Center')], label: ['Անվան դիրքը', 'Положение названия', 'Name alignment'] },
  { id: 'cats.hover', sec: 'cats', kind: 'toggle', d: true, label: ['Նկարի մեծացում՝ մկնիկը վրան բերելիս', 'Увеличение фото при наведении', 'Zoom image on hover'] },
  // featured
  { id: 'featured.show', sec: 'featured', kind: 'toggle', d: true, label: ['Ցույց տալ բաժինը', 'Показывать раздел', 'Show section'] },
  { id: 'featured.bg', sec: 'featured', kind: 'select', d: 'white', opts: [o('white', 'Սպիտակ', 'Белый', 'White'), o('silver', 'Բաց արծաթ', 'Светлое серебро', 'Light silver')], label: ['Քարտի ֆոն', 'Фон карточки', 'Card background'] },
  { id: 'featured.radius', sec: 'featured', kind: 'range', resp: true, d: 22, m: 16, min: 0, max: 40, step: 1, unit: 'px', css: '--feat-r', label: ['Կլորացում', 'Скругление', 'Corner radius'] },
  { id: 'featured.pad', sec: 'featured', kind: 'range', resp: true, d: 36, m: 18, min: 8, max: 72, step: 2, unit: 'px', css: '--feat-pad', label: ['Ներքին լուսանցք', 'Внутренний отступ', 'Padding'] },
  // about
  { id: 'about.show', sec: 'about', kind: 'toggle', d: true, label: ['Ցույց տալ բաժինը', 'Показывать раздел', 'Show section'] },
  { id: 'about.reverse', sec: 'about', kind: 'toggle', d: false, label: ['Նկարը ձախ կողմում', 'Фото слева', 'Image on the left'] },
  { id: 'about.imgH', sec: 'about', kind: 'range', resp: true, d: 540, m: 360, min: 220, max: 760, step: 10, unit: 'px', css: '--about-h', label: ['Նկարի բարձրությունը', 'Высота фото', 'Image height'] },
  { id: 'about.radius', sec: 'about', kind: 'range', resp: true, d: 22, m: 16, min: 0, max: 40, step: 1, unit: 'px', css: '--about-r', label: ['Նկարի կլորացումը', 'Скругление фото', 'Image radius'] },
  { id: 'about.align', sec: 'about', kind: 'select', resp: true, d: 'left', m: 'left', opts: [o('left', 'Ձախ', 'Слева', 'Left'), o('center', 'Կենտրոն', 'По центру', 'Center')], label: ['Տեքստի հավասարեցումը', 'Выравнивание текста', 'Text alignment'] },
  ...focus('about', 'about'),
  // banner
  { id: 'banner.show', sec: 'banner', kind: 'toggle', d: true, label: ['Ցույց տալ բաժինը', 'Показывать раздел', 'Show section'] },
  { id: 'banner.h', sec: 'banner', kind: 'range', resp: true, d: 380, m: 320, min: 200, max: 680, step: 10, unit: 'px', css: '--banner-h', label: ['Բաժնի բարձրությունը', 'Высота баннера', 'Banner height'] },
  { id: 'banner.radius', sec: 'banner', kind: 'range', resp: true, d: 22, m: 16, min: 0, max: 40, step: 1, unit: 'px', css: '--banner-r', label: ['Կլորացում', 'Скругление', 'Corner radius'] },
  { id: 'banner.align', sec: 'banner', kind: 'select', resp: true, d: 'left', m: 'center', opts: ALIGN3, label: ['Տեքստի դիրքը', 'Положение текста', 'Text position'] },
  { id: 'banner.color', sec: 'banner', kind: 'color', d: '#ffffff', css: '--banner-color', label: ['Տեքստի գույնը', 'Цвет текста', 'Text color'] },
  { id: 'banner.overlay', sec: 'banner', kind: 'range', resp: true, d: 28, m: 34, min: 0, max: 80, step: 1, unit: '%', div: 100, css: '--banner-ov', label: ['Մթեցում', 'Затемнение', 'Darkening'] },
  ...focus('banner', 'banner'),
  // footer
  { id: 'footer.tone', sec: 'footer', kind: 'select', d: 'graphite', opts: [o('graphite', 'Մուգ արծաթ', 'Тёмное серебро', 'Dark silver'), o('light', 'Բաց արծաթ', 'Светлое серебро', 'Light silver')], label: ['Ստորագրի գույնը', 'Цвет подвала', 'Footer tone'] },
  { id: 'footer.news', sec: 'footer', kind: 'toggle', d: true, label: ['Բաժանորդագրության ձևը', 'Форма подписки', 'Newsletter form'] },
  { id: 'footer.pad', sec: 'footer', kind: 'range', resp: true, d: 72, m: 44, min: 24, max: 140, step: 2, unit: 'px', css: '--foot-pad', label: ['Վերին և ստորին լուսանցք', 'Вертикальные отступы', 'Vertical padding'] },
  // product grid
  { id: 'grid.cols', sec: 'grid', kind: 'range', resp: true, d: 4, m: 2, min: 1, max: 6, step: 1, css: '--grid-cols', label: ['Սյունակների քանակը', 'Количество колонок', 'Columns'] },
  { id: 'grid.gap', sec: 'grid', kind: 'range', resp: true, d: 22, m: 12, min: 0, max: 48, step: 1, unit: 'px', css: '--grid-gap', label: ['Քարտերի միջև հեռավորությունը', 'Расстояние между карточками', 'Gap between cards'] },
  { id: 'grid.aspect', sec: 'grid', kind: 'select', resp: true, d: '4 / 5', m: '4 / 5', css: '--grid-aspect', opts: ASPECTS, label: ['Նկարի համամասնությունը', 'Пропорции фото', 'Photo proportions'] },
  { id: 'grid.fit', sec: 'grid', kind: 'select', d: 'contain', opts: fit, css: '--grid-fit', label: ['Նկարի տեղադրումը', 'Размещение фото', 'Photo fitting'] },
  { id: 'grid.radius', sec: 'grid', kind: 'range', resp: true, d: 16, m: 12, min: 0, max: 40, step: 1, unit: 'px', css: '--grid-r', label: ['Կլորացում', 'Скругление', 'Corner radius'] },
  // product page
  { id: 'product.aspect', sec: 'product', kind: 'select', resp: true, d: '1 / 1', m: '1 / 1', css: '--pd-aspect', opts: ASPECTS, label: ['Գլխավոր նկարի համամասնությունը', 'Пропорции главного фото', 'Main photo proportions'] },
  { id: 'product.fit', sec: 'product', kind: 'select', d: 'contain', opts: fit, css: '--pd-fit', label: ['Նկարի տեղադրումը', 'Размещение фото', 'Photo fitting'] },
  { id: 'product.radius', sec: 'product', kind: 'range', resp: true, d: 22, m: 18, min: 0, max: 40, step: 1, unit: 'px', css: '--pd-r', label: ['Կլորացում', 'Скругление', 'Corner radius'] },
  { id: 'product.panel', sec: 'product', kind: 'select', d: 'white', opts: [o('white', 'Սպիտակ', 'Белый', 'White'), o('silver', 'Բաց արծաթ', 'Светлое серебро', 'Light silver')], label: ['Տեղեկատվության վահանակի ֆոն', 'Фон информационной панели', 'Info panel background'] },
  // auth
  { id: 'auth.w', sec: 'auth', kind: 'range', d: 460, min: 340, max: 600, step: 10, unit: 'px', css: '--auth-w', label: ['Ձևի լայնությունը', 'Ширина формы', 'Form width'] },
  { id: 'auth.radius', sec: 'auth', kind: 'range', resp: true, d: 22, m: 18, min: 0, max: 40, step: 1, unit: 'px', css: '--auth-r', label: ['Ձևի կլորացումը', 'Скругление формы', 'Form radius'] },
  { id: 'auth.art', sec: 'auth', kind: 'toggle', d: true, label: ['Ցույց տալ նկարը համակարգչի վրա', 'Показывать изображение на компьютере', 'Show image panel on desktop'] },
  ...focus('auth', 'auth'),
  // account
  { id: 'account.maxw', sec: 'account', kind: 'range', d: 1080, min: 720, max: 1400, step: 20, unit: 'px', css: '--acct-w', label: ['Բովանդակության լայնությունը', 'Ширина содержимого', 'Content width'] },
  { id: 'account.radius', sec: 'account', kind: 'range', resp: true, d: 18, m: 14, min: 0, max: 40, step: 1, unit: 'px', css: '--acct-r', label: ['Քարտերի կլորացումը', 'Скругление карточек', 'Card radius'] },
  { id: 'account.tone', sec: 'account', kind: 'select', d: 'white', opts: [o('white', 'Սպիտակ քարտեր', 'Белые карточки', 'White cards'), o('silver', 'Արծաթե քարտեր', 'Серебристые карточки', 'Silver cards')], label: ['Քարտերի գույնը', 'Цвет карточек', 'Card tone'] },
]

const BY_ID = new Map(FIELDS.map(f => [f.id, f]))

// Per-category image controls are generated on demand: cat.<slug>.fx / fy / zoom / span (desktop + mobile)
export const CAT_KEYS = ['fx', 'fy', 'zoom', 'span'] as const
export function catFields(slug: string): Field[] {
  return [
    ...focus('cats', `cat.${slug}`).map(f => ({ ...f, css: undefined })),
    { id: `cat.${slug}.span`, sec: 'cats' as SectionId, kind: 'select' as const, resp: true, d: '1', m: '1', opts: [o('1', 'Սովորական', 'Обычная', 'Regular'), o('2', 'Լայն (2 սյունակ)', 'Широкая (2 колонки)', 'Wide (2 columns)')], label: ['Քարտի չափը', 'Размер карточки', 'Card size'] },
  ]
}
export function fieldDef(id: string): Field | undefined {
  const f = BY_ID.get(id); if (f) return f
  const m = /^cat\.([^.]+)\.(fx|fy|zoom|span)$/.exec(id)
  return m ? catFields(m[1]).find(x => x.id === id) : undefined
}

export type Slide = { type: 'video' | 'image'; path: string }
export type SiteConfig = {
  v: 1
  values: Record<string, V>               // key: "<id>" or "<id>|d" / "<id>|m" for responsive fields
  content: Record<string, string>         // "<section>.<lang>.<title|body|button>" overrides of homepage texts
  media: { heroD: Slide[]; heroM: Slide[]; about: string; banner: string; auth: string }
}
export const EMPTY_CONFIG: SiteConfig = { v: 1, values: {}, content: {}, media: { heroD: [], heroM: [], about: '', banner: '', auth: '' } }

export function normalize(raw: unknown): SiteConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteConfig>
  const m: Partial<SiteConfig['media']> = r.media ?? {}
  return {
    v: 1,
    values: r.values && typeof r.values === 'object' ? { ...r.values } : {},
    content: r.content && typeof r.content === 'object' ? { ...r.content } : {},
    media: {
      heroD: Array.isArray(m.heroD) ? m.heroD : [], heroM: Array.isArray(m.heroM) ? m.heroM : [],
      about: m.about ?? '', banner: m.banner ?? '', auth: m.auth ?? '',
    },
  }
}

const key = (f: Field, mobile: boolean) => (f.resp ? `${f.id}|${mobile ? 'm' : 'd'}` : f.id)
export const defaultOf = (f: Field, mobile: boolean): V => (mobile && f.resp && f.m !== undefined ? f.m : f.d)
export function getVal(cfg: SiteConfig, id: string, mobile: boolean): V {
  const f = fieldDef(id); if (!f) return ''
  const v = cfg.values[key(f, mobile)]
  return v === undefined ? defaultOf(f, mobile) : v
}
export function setVal(cfg: SiteConfig, id: string, mobile: boolean, v: V): SiteConfig {
  const f = fieldDef(id); if (!f) return cfg
  return { ...cfg, values: { ...cfg.values, [key(f, mobile)]: v } }
}
export const isCustom = (cfg: SiteConfig, f: Field, mobile: boolean) => cfg.values[key(f, mobile)] !== undefined

const attr = (id: string) => 'data-c-' + id.replace(/\./g, '-')

/** Writes every field as a CSS variable (numbers/colors/selects with `css`) or as a data attribute (everything else). */
export function applyConfig(cfg: SiteConfig, mobile: boolean, el: HTMLElement = document.documentElement) {
  for (const f of FIELDS) {
    const v = getVal(cfg, f.id, mobile)
    if (f.css) {
      const out = typeof v === 'number' ? (f.div ? String(v / f.div) : `${v}${f.unit ?? ''}`) : String(v)
      el.style.setProperty(f.css, out)
    }
    if (f.kind === 'select' || f.kind === 'toggle') el.setAttribute(attr(f.id), f.kind === 'toggle' ? (v ? '1' : '0') : String(v))
  }
}

export const isPreview = () => typeof location !== 'undefined' && new URLSearchParams(location.search).get('preview') === '1'

type Ctx = {
  cfg: SiteConfig; mobile: boolean; preview: boolean; loaded: boolean
  v: (id: string) => V; n: (id: string) => number; on: (id: string) => boolean
  text: (sec: string, lang: Lang, field: 'title' | 'body' | 'button', fallback?: string) => string | undefined
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useSiteConfig = () => useContext(C)

const MQ = '(max-width: 820px)'
function useMobile() {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(MQ).matches)
  useEffect(() => { const q = matchMedia(MQ); const f = () => setM(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f) }, [])
  return m
}

export async function fetchPublishedConfig(): Promise<SiteConfig | null> {
  if (!supabaseConfigured) return null
  const { data, error } = await supabase.from('site_config_versions').select('config').eq('kind', 'published').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !data) return null          // table not created yet / nothing published yet -> defaults
  return normalize(data.config)
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<SiteConfig>(EMPTY_CONFIG)
  const [loaded, setLoaded] = useState(false)
  const mobile = useMobile()
  const preview = useMemo(isPreview, [])

  useEffect(() => { let alive = true; void fetchPublishedConfig().then(c => { if (alive) { if (c) setCfg(c); setLoaded(true) } }); return () => { alive = false } }, [])
  useEffect(() => { applyConfig(cfg, mobile) }, [cfg, mobile])

  // ---- editor bridge (only active with ?preview=1 and only talks to the same origin) ----
  useEffect(() => {
    if (!preview) return
    const root = document.documentElement; root.dataset.preview = '1'
    const target = (window.parent !== window ? window.parent : window.opener) as Window | null
    const send = (msg: object) => target?.postMessage(msg, location.origin)
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin) return
      const d = e.data as { type?: string; config?: unknown; section?: string } | null
      if (d?.type === 'anva-config') setCfg(normalize(d.config))
      if (d?.type === 'anva-highlight') { if (d.section) root.dataset.sel = d.section; else delete root.dataset.sel }
    }
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      const sec = t.closest<HTMLElement>('[data-edit]')?.dataset.edit
      if (t.closest('a,button')) e.preventDefault()       // never navigate away while editing
      if (sec) { e.stopPropagation(); send({ type: 'anva-select', section: sec }) }
    }
    window.addEventListener('message', onMsg); document.addEventListener('click', onClick, true)
    send({ type: 'anva-ready' })
    return () => { window.removeEventListener('message', onMsg); document.removeEventListener('click', onClick, true); delete root.dataset.preview }
  }, [preview])

  const v = useCallback((id: string) => getVal(cfg, id, mobile), [cfg, mobile])
  const value = useMemo<Ctx>(() => ({
    cfg, mobile, preview, loaded, v,
    n: id => Number(v(id)), on: id => Boolean(v(id)),
    text: (sec, lang, field, fallback) => cfg.content[`${sec}.${lang}.${field}`]?.trim() || fallback,
  }), [cfg, mobile, preview, loaded, v])
  return <C.Provider value={value}>{children}</C.Provider>
}
