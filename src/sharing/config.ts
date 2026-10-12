/**
 * Configuración del proyecto de Firebase (consola de Firebase → Configuración del proyecto → Tus apps).
 * No es secreta: va dentro de la app. Lo que protege los datos son las reglas (firestore.rules).
 * Si se pone en null, la parte de compartir no aparece.
 */
export const firebaseConfig: Record<string, string> | null = {
  apiKey: 'AIzaSyB1508cnACIYQyb5bPFpHgLSPmkr_E7_mQ',
  authDomain: 'mis-tareas-pecera.firebaseapp.com',
  projectId: 'mis-tareas-pecera',
  storageBucket: 'mis-tareas-pecera.firebasestorage.app',
  messagingSenderId: '224519321518',
  appId: '1:224519321518:web:683d2771281d3b6a63fa3f',
};
