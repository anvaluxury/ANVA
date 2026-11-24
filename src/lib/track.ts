import { uuid } from './uuid'
import { supabase, supabaseConfigured } from './supabase'
export const sid = () => sessionStorage.getItem('sid') ?? (sessionStorage.setItem('sid', uuid()), sessionStorage.getItem('sid')!)
const vid = () => localStorage.getItem('vid') ?? (localStorage.setItem('vid', uuid()), localStorage.getItem('vid')!)   // anonymous random id, no personal data
export const track = (event: string, extra: object = {}) => { if (supabaseConfigured) void supabase.from('analytics_events').insert({ event, session_id: sid(), country: localStorage.getItem('anva_country'), meta: { vid: vid() }, ...extra }) }