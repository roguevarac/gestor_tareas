/** Mensajes de error (de Firebase o del modo demo) en castellano. null = no mostrar nada. */
export function errorText(e: unknown): string | null {
  const code = (e as { code?: string })?.code ?? (e as Error)?.message ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Mail o contraseña incorrectos.',
    'auth/wrong-password': 'Mail o contraseña incorrectos.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese mail.',
    'auth/invalid-email': 'Ese mail no parece válido.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese mail: entrá con tu contraseña.',
    'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
    'auth/missing-password': 'Falta la contraseña.',
    'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en un rato.',
    'auth/network-request-failed': 'Sin conexión a internet.',
    'auth/popup-blocked':
      'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.',
    'auth/unauthorized-domain':
      'Este sitio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
    'auth/operation-not-allowed':
      'Ese modo de entrar no está habilitado en Firebase (Authentication → Método de acceso).',
    'permission-denied': 'El servidor no dejó hacer eso. ¿Están publicadas las reglas de Firestore?',
    unavailable: 'Sin conexión con el servidor. Probá de nuevo en un rato.',
    'failed-precondition': 'Sin conexión con el servidor. Probá de nuevo cuando vuelva internet.',
    'not-found': 'Esa tarea ya no existe.',
  };
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  return map[code] ?? 'Algo salió mal. Probá de nuevo.';
}
