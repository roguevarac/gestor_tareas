/**
 * Configuración del proyecto de Firebase (consola de Firebase → Configuración del proyecto → Tus apps).
 * No es secreta: va dentro de la app. Lo que protege los datos son las reglas (firestore.rules).
 * Mientras esté en null, la parte de compartir no aparece.
 */
export const firebaseConfig: Record<string, string> | null = null;
