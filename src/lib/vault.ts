/**
 * Copia cifrada de las tareas en el servidor (para Finance).
 * La llave sale de la contraseña de la persona: el servidor (y quien administra Firebase) solo ve datos
 * cifrados que nadie más puede leer.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();
const keyName = (memberId: string) => `mis-tareas:vault-key:${memberId}`;

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Llave AES a partir de la contraseña (PBKDF2, 210.000 vueltas). Devuelve la llave cruda en base64. */
export async function deriveVaultKey(memberId: string, password: string): Promise<string> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.trim()), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`mis-tareas-vault:${memberId}`), iterations: 210_000 },
    base,
    256,
  );
  return toB64(bits);
}

export function saveVaultKey(memberId: string, key: string) {
  try {
    localStorage.setItem(keyName(memberId), key);
  } catch {
    /* sin almacenamiento */
  }
}
export function loadVaultKey(memberId: string): string | null {
  try {
    return localStorage.getItem(keyName(memberId));
  } catch {
    return null;
  }
}
export function forgetVaultKey(memberId: string) {
  try {
    localStorage.removeItem(keyName(memberId));
  } catch {
    /* nada */
  }
}

const aes = (key: string) => crypto.subtle.importKey('raw', fromB64(key), 'AES-GCM', false, ['encrypt', 'decrypt']);

export interface Sealed {
  iv: string;
  data: string;
}

export async function seal(value: unknown, key: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(key), enc.encode(JSON.stringify(value)));
  return { iv: toB64(iv), data: toB64(data) };
}

/** null si la llave no corresponde (por ejemplo, la contraseña cambió en otra compu). */
export async function unseal<T>(sealed: Sealed, key: string): Promise<T | null> {
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, await aes(key), fromB64(sealed.data));
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    return null;
  }
}
