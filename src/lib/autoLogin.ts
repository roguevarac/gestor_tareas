/**
 * Entrar sola aunque la compu borre el navegador al apagarse: el mail y la contraseña quedan en el
 * administrador de contraseñas del navegador (Edge/Chrome), que no se borra con los datos de los sitios.
 * Usa la Credential Management API; en navegadores que no la tienen, no hace nada.
 */

interface PwCred {
  type: string;
  id: string;
  password?: string;
}

type PwCtor = new (data: { id: string; password: string; name?: string }) => Credential;

const ctor = (): PwCtor | null =>
  typeof window !== 'undefined' && 'PasswordCredential' in window
    ? ((window as unknown as { PasswordCredential: PwCtor }).PasswordCredential ?? null)
    : null;

/** Guardar el acceso (el navegador puede preguntar "¿Guardar contraseña?" la primera vez). */
export async function rememberLogin(email: string, password: string, name?: string) {
  const C = ctor();
  if (!C || !navigator.credentials) return;
  try {
    await navigator.credentials.store(new C({ id: email.trim().toLowerCase(), password: password.trim(), name }));
  } catch {
    /* el navegador no quiso: se entra a mano */
  }
}

/** Recuperar el acceso guardado. "silent": sin preguntar nada; "optional": el navegador puede mostrar "Entrar como…". */
export async function recallLogin(mediation: 'silent' | 'optional'): Promise<{ email: string; password: string } | null> {
  if (!ctor() || !navigator.credentials) return null;
  try {
    const c = (await navigator.credentials.get({ password: true, mediation } as CredentialRequestOptions)) as PwCred | null;
    if (c && c.type === 'password' && c.password) return { email: c.id, password: c.password };
  } catch {
    /* nada */
  }
  return null;
}

/** "No soy …": que no vuelva a entrar sola en esta compu. */
export async function forgetLogin() {
  try {
    await navigator.credentials?.preventSilentAccess?.();
  } catch {
    /* nada */
  }
}
