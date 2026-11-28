import { COUNTRIES, useMoney } from '../lib/currency'
import type { Lang } from '../../supabase/functions/auto-translate'
export default function CountrySelect({ lang }: { lang: Lang }) {
  const { country, setCountry, currency, info } = useMoney(); const names = new Intl.DisplayNames([lang], { type: 'region' })
  return <label className="csel" title={info.unavailable ? 'Rates unavailable — showing AMD' : info.updated ? `${currency} · ${new Date(info.updated).toLocaleString()}${info.stale ? ' (offline rates)' : ''}` : currency}>
    <select value={country} onChange={e => setCountry(e.target.value)} aria-label="Country">{COUNTRIES.map(c => <option key={c} value={c}>{names.of(c)}</option>)}</select><span>{currency}</span></label>
}
