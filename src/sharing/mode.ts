/** `?demo=ana`: modo de prueba sin Firebase (ver sharing/demo.ts). */
export function demoHandle(): string | null {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('demo');
  return v ? v.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || null : null;
}
