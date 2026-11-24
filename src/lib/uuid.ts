// crypto.randomUUID() only exists on HTTPS/localhost. This works everywhere (e.g. testing on a phone via http://192.168.x.x).
export const uuid = (): string => {
  const c: any = crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (d: string) => (Number(d) ^ (c.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(d) / 4)))).toString(16))
}