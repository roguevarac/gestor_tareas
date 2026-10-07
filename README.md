# Mis tareas

Una app web simple para organizar el trabajo del día a día:

- **Tareas rápidas**: se anotan y se terminan, sin subtareas.
- **Proyectos**: tienen subtareas que se van tildando y a las que se les pueden sumar más.
- **El balde**: cuando terminás algo, agarrás la tarjeta y la arrastrás al balde. En el camino se convierte en una
  mojarrita plateada (_Piabarchus —ex Bryconamericus— stramineus_) que se zambulle en el balde.
- **La bitácora**: todo lo que cae al balde queda registrado por día, con cuánto tardaste y un comentario. Se puede
  exportar a Excel.
- **Mails de Outlook**: cada tarea puede tener vinculados uno o más mails (el hilo con el pedido y los parámetros).

Todo queda guardado **en tu navegador** (no hay servidor ni cuentas): tus tareas no salen de tu compu.

## Cómo se usa

| Quiero…                     | Hago…                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| Anotar una tarea rápida     | Escribo en “Nueva tarea…” y Enter.                                                                 |
| Crear un proyecto           | Escribo en “Nuevo proyecto…” y Enter. El cursor salta solo a “Agregar subtarea…”.                  |
| Agregar subtareas           | Escribo en “Agregar subtarea…” y Enter (se pueden cargar varias seguidas).                         |
| Tildar / renombrar / borrar | Clic en el círculo / clic en el texto / la ✕ que aparece al pasar el mouse.                        |
| Terminar                    | Arrastro la tarjeta al balde. En el celular: mantener apretada la tarjeta un instante y arrastrar. |
| Cargar cuánto tardé         | Aparece arriba del balde al soltar la tarea. También se edita después en la bitácora.              |
| Me equivoqué                | “Devolver al agua” (en el aviso del balde o en la bitácora) y la tarea vuelve a la lista.          |
| Ver notas, color, mails     | Clic en la tarjeta abre el detalle. Todo se guarda solo.                                           |
| Ver lo terminado            | Clic en el balde o en “Bitácora”.                                                                  |

El tiempo se puede escribir como `45`, `45 min`, `1h`, `1h 30`, `1:30`, `1,5 hs`, o como horario: `de 9 a 10:30`,
`9:15-11`.

## Vincular mails de Outlook

Outlook no tiene un botón de “copiar link de este mail” (ni en el Outlook nuevo ni en el clásico), así que la app
guarda dos cosas por cada mail: el **link** de Outlook en la web (para abrirlo con un clic) y el **asunto** (para
encontrarlo con la búsqueda de Outlook si el link deja de andar, por ejemplo si movés el mail de carpeta).

1. **Outlook en el navegador (recomendado).** Abrí `outlook.office.com` (o `outlook.cloud.microsoft`), hacé clic en el
   mail y copiá la dirección de la barra (`Ctrl+L`, `Ctrl+C`). Después, en Mis tareas, pegá con `Ctrl+V` en cualquier
   parte: te pregunta si crear una tarea nueva con ese mail o sumarlo a una existente.
2. **Botón “🐟 Mail → Mis tareas”.** Desde el detalle de una tarea, “¿Cómo copio el link de un mail de Outlook?” → arrastrá el botón a la barra de favoritos. Con un
   mail abierto en Outlook web, un clic y se abre la app con el mail listo para vincular. Si antes seleccionás el
   asunto, lo usa como nombre.
3. **Outlook de escritorio.** Abrí el mismo mail en Outlook web y seguí el paso 1, o guardá solo el asunto (escribilo
   en lugar del link) y usá el botón de copiar para buscarlo en Outlook.

Los links funcionan con tu cuenta: si se los pasás a otra persona, no va a ver tu mail.

## Tus datos

- Se guardan en el `localStorage` del navegador (por dominio). Si usás la app en dos pestañas, se sincronizan.
- Menú **⋯ → Descargar copia de seguridad** baja un `.json` con todo. **Restaurar una copia…** lo vuelve a cargar.
  Conviene hacer una copia de vez en cuando (o antes de cambiar de compu o de navegador).
- Desde la bitácora: **Exportar a Excel (CSV)**.

## Usarla (vos y cualquier otra persona)

La app está publicada en **https://roguevarac.github.io/gestor_tareas/**. No hace falta instalar Node ni abrir PowerShell.

1. Abrir ese link en **Chrome o Edge**.
2. Menú **⋯ → Instalar en esta computadora** (o el ícono de instalar en la barra de direcciones).
3. Queda con su ícono en el menú Inicio y en el escritorio. Para fijarla en la barra de tareas: clic derecho en el
   ícono de la app abierta → **Anclar a la barra de tareas**.

Cada persona tiene sus propias tareas, guardadas en su navegador: nadie ve las tareas de otro.

## Instalarla como app

Es una PWA: en Chrome/Edge, con la app abierta, ícono de instalar en la barra de direcciones (o menú → “Instalar
Mis tareas”). Queda con su propia ventana e ícono, y funciona sin conexión.

## Desarrollo

Requiere Node 22.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la lógica (tiempos, mails, bitácora, backups)
npm run build      # genera dist/ (estático, se puede servir desde cualquier lado)
npm run build:preview-web   # versión sin service worker (para visores que no los permiten)
```

Tecnología: React 19 + TypeScript + Vite, [Motion](https://motion.dev) para las animaciones (el pez, el balde, las
salpicaduras), SVG animado para las algas y Zustand para el estado.

Paleta: Sky Blue `#8ecae6` (fondo, muy suavizado), Blue Green `#219ebc` y Deep Space Blue `#023047` (de ahí salen los
verdes azulados apagados de las tarjetas y el texto), Amber Flame `#ffb703` y Tiger Orange `#fb8500` solo como acento
(la cola de la mojarrita, el foco, avisos).

Estructura:

```
src/
  components/   Tarjetas, balde, pez (SVG), capa de arrastre, bitácora, ayuda de Outlook…
  store/        tasks.ts (datos que se guardan), pond.ts (estado del arrastre), ui.ts (diálogos y avisos)
  lib/          tiempos, links de mail, backups/CSV, tonos de las tarjetas
```

## Publicarla (GitHub Pages)

El workflow `.github/workflows/deploy.yml` corre los tests, compila y publica en GitHub Pages en cada push a `main`
(también se puede lanzar a mano desde la pestaña **Actions**). Para activarlo, una sola vez: **Settings → Pages →
Source: GitHub Actions**. En repos privados, GitHub Pages necesita un plan pago de GitHub (Pro/Team/Enterprise); si no,
`dist/` se puede subir a cualquier hosting estático (Netlify, Cloudflare Pages, un servidor interno…).

## Cambios

### 1.1

- Se llama **Mis tareas**.
- Sin cronómetro: el tiempo se carga al soltar la tarea en el balde (también como horario, “de 9 a 10:30”).
- Sin botón de terminar: las tareas se terminan solo arrastrándolas al balde.
- Sin textos de ayuda ni tareas de ejemplo (si quedaron las de la 1.0 sin tocar, se borran solas).
- Paleta nueva, más calma y verdosa para mirar todo el día.
- La mojarrita ahora es una mojarrita plateada (_Piabarchus stramineus_): esbelta, plateada, con la mancha humeral y
  solo la cola amarilla.
- Balde de chapa galvanizada, más cilíndrico y realista.
- Fondo sin olas, con algas que se mecen con el agua.

### 1.0

- Primera versión: tareas rápidas, proyectos con subtareas, balde, bitácora y vínculo con mails de Outlook.
