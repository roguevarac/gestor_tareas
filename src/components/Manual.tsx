import { useMemo, useRef, useState } from 'react';
import type { FishKind } from '../types';
import { useUI } from '../store/ui';
import { Modal } from './Modal';
import { SpeciesFish } from './Fishes';
import { IconSearch } from './Icons';

interface Item {
  title: string;
  text: React.ReactNode;
  /** Palabras para el buscador. */
  keys?: string;
}

interface Section {
  id: string;
  title: string;
  fish: FishKind;
  items: Item[];
}

const K = ({ children }: { children: React.ReactNode }) => <span className="manual-k">{children}</span>;

const SECTIONS: Section[] = [
  {
    id: 'basico',
    title: 'Lo básico',
    fish: 'mojarrita',
    items: [
      {
        title: 'Tareas rápidas y proyectos',
        text: (
          <>
            Las <b>tareas rápidas</b> se anotan y se terminan. Los <b>proyectos</b> tienen subtareas que vas tildando.
            Escribí en <K>Nueva tarea…</K> o <K>Nuevo proyecto…</K> y apretá Enter.
          </>
        ),
      },
      {
        title: 'Subtareas',
        text: (
          <>
            En un proyecto, escribí en <K>Agregar subtarea…</K> y Enter (podés cargar varias seguidas). Tocá el círculo
            para tildarla, el texto para cambiarlo, y la ✕ para borrarla.
          </>
        ),
      },
      {
        title: 'El detalle de una tarea',
        text: (
          <>
            Tocá una tarjeta para abrirla: cambiás el nombre, la categoría, el color, si es rápida o proyecto, y le
            agregás notas o mails. Todo se guarda solo.
          </>
        ),
      },
    ],
  },
  {
    id: 'balde',
    title: 'Terminar: el balde y la bitácora',
    fish: 'mojarrita',
    items: [
      {
        title: 'Tirar al balde',
        text: (
          <>
            Cuando terminás algo, agarrá la tarjeta y arrastrala hasta el <b>balde</b> (abajo a la derecha): se convierte
            en pez y se zambulle. En el celular, mantené apretada la tarjeta un instante y después arrastrala.
          </>
        ),
        keys: 'terminar completar',
      },
      {
        title: '¿Me equivoqué?',
        text: (
          <>
            Al tirarla aparece un aviso con <K>Deshacer</K>. Si ya pasó, abrí la <b>Bitácora</b> y tocá{' '}
            <K>Devolver al agua</K>.
          </>
        ),
        keys: 'deshacer volver error',
      },
      {
        title: 'Bitácora',
        text: (
          <>
            Arriba, <K>Bitácora</K> (o el balde): todo lo que terminaste, por día, con un buscador. Le podés dejar un
            comentario a cada una y exportarla a Excel. <K>Hoy</K> muestra cuántas terminaste hoy.
          </>
        ),
        keys: 'historial excel csv',
      },
    ],
  },
  {
    id: 'categorias',
    title: 'Categorías',
    fish: 'dorado',
    items: [
      {
        title: 'Las cuatro categorías',
        text: (
          <>
            Cada tarea puede ser <b>Importante y urgente</b> (dorado), <b>Importante, no urgente</b> (koi),{' '}
            <b>Urgente, no importante</b> (mojarrita) o un <b>Favorcito</b> (tararira). Se elige en el detalle de la
            tarea y se ve como etiqueta en la tarjeta.
          </>
        ),
        keys: 'prioridad importante urgente favorcito',
      },
      {
        title: 'Vista "Por categoría"',
        text: (
          <>
            Arriba de las listas cambiás entre <K>Rápidas y proyectos</K> y <K>Por categoría</K>. En la segunda ves los
            cuatro cuadrantes: arrastrá una tarea de un cuadrante a otro para cambiarle la categoría. Lo que todavía no
            tiene categoría aparece arriba, en <b>Sin categoría</b>.
          </>
        ),
        keys: 'matriz cuadrantes',
      },
    ],
  },
  {
    id: 'compartir',
    title: 'Mandar tareas (peces)',
    fish: 'koi',
    items: [
      {
        title: 'Entrar al equipo',
        text: (
          <>
            La primera vez en cada compu: tocá <K>Compartir</K>, elegí tu nombre y poné tu contraseña (te la da quien
            administra el equipo). La primera vez que entrás, la app te pide que elijas una tuya: desde ahí solo la
            sabés vos. La compu te recuerda.
          </>
        ),
        keys: 'login contraseña entrar primera vez',
      },
      {
        title: 'Acceso privado',
        text: (
          <>
            Algunas personas (por ejemplo, de finanzas) tienen <b>acceso privado</b>: no aparecen en la lista del
            equipo, nadie ve sus tareas (ni en Tareas del equipo ni con la caña) y ellas tampoco ven las del equipo.
            Peces sí: se les puede mandar uno (aparecen en <K>Mandar un pez</K>) y ellas también mandan. Entran con{' '}
            <K>¿No estás en la lista? Entrá con tu mail</K>. Sus tareas personales quedan solo en su compu; lo único
            que ven otros es lo que se mandan.
          </>
        ),
        keys: 'privado finanzas mail seguridad',
      },
      {
        title: 'Mandar un pez',
        text: (
          <>
            Desde el detalle de una tarea tuya, <K>Compartir con…</K>, o desde la <b>Pecera</b>,{' '}
            <K>Mandar un pez</K>. Elegís a quién y la categoría: cada categoría viaja en su pez y le llega a la otra
            persona en ese cuadrante.
          </>
        ),
        keys: 'enviar delegar',
      },
      {
        title: '"Que la haga" o "La hacemos juntos"',
        text: (
          <>
            <b>Que la haga</b>: la tarea pasa a ser de la otra persona y te avisa cuando la termina.{' '}
            <b>La hacemos juntos</b>: es un proyecto conjunto que ven todos; cada subtarea tiene su responsable (el
            circulito con iniciales; tocalo para cambiarlo) y al agregar subtareas elegís de quién es.
          </>
        ),
        keys: 'conjunto responsable proyecto',
      },
      {
        title: 'Cuando te mandan un pez',
        text: (
          <>
            Llega nadando con la tarea: <K>Aceptar</K> la pone en tu lista, <K>No la tomo</K> le avisa a quien la
            mandó, y <K>Después</K> la deja esperando en la Pecera.
          </>
        ),
        keys: 'recibir aceptar',
      },
    ],
  },
  {
    id: 'pecera',
    title: 'Pecera y Enviadas',
    fish: 'tararira',
    items: [
      {
        title: 'Pecera',
        text: (
          <>
            Los peces que te mandaron y todavía no respondiste, y el botón para mandar uno nuevo. Abajo, tu nombre y{' '}
            <K>Cambiar mi contraseña</K>. Si la compu la usa otra persona: <K>No soy …</K>.
          </>
        ),
      },
      {
        title: 'Enviadas',
        text: (
          <>
            Todo lo que mandaste, con la <b>fecha de envío</b>, a quién, si aceptaron y cómo van las subtareas. Con{' '}
            <K>Editar</K> la cambiás (y le cambia a quien la recibió). Si no la tomaron, la podés <K>Recuperar</K>.
          </>
        ),
        keys: 'enviadas editar fecha',
      },
    ],
  },
  {
    id: 'equipo',
    title: 'Tareas del equipo y la caña',
    fish: 'dorado',
    items: [
      {
        title: 'Tareas del equipo',
        text: (
          <>
            Arriba, <K>Tareas del equipo</K>: elegís la oficina (Argentina, Chile o Uruguay) y después la persona, y ves
            sus tareas tal como las ve ella. Es <b>solo para mirar</b>: desde ahí no se cambia nada.
          </>
        ),
        keys: 'tablero oficina pais',
      },
      {
        title: 'La caña: "¿En qué andás?"',
        text: (
          <>
            Al costado derecho está la caña de pescar. Elegí a alguien y le baja la pregunta como carnada; contesta con
            un toque (una de sus tareas, "En una reunión"…) o con unas palabras, y la respuesta te llega como aviso.
          </>
        ),
        keys: 'caña pregunta carnada',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Para quien administra',
    fish: 'koi',
    items: [
      {
        title: 'Sumar gente',
        text: (
          <>
            <b>Pecera → Equipo</b>: nombre, mail, contraseña y oficina, y <K>Sumar</K>. Después le pasás el link de la
            app y su contraseña.
          </>
        ),
        keys: 'usuarios agregar',
      },
      {
        title: 'Contraseñas, oficinas y bajas',
        text: (
          <>
            En cada persona: la <b>llavecita</b> le da una contraseña nueva (al entrar elige la suya), la{' '}
            <b>banderita</b> su oficina, el <b>candado</b> la pasa a acceso privado (necesita el mail cargado) y la ✕
            la saca del equipo. Tocando el nombre o el mail los corregís. Las personas con acceso privado están en su
            propia lista, más abajo.
          </>
        ),
        keys: 'contraseña oficina borrar',
      },
      {
        title: 'Administrar desde otra compu',
        text: (
          <>
            En <K>¿Quién sos?</K>, tocá <K>Administro el equipo</K> y poné la contraseña de administración.
          </>
        ),
      },
    ],
  },
  {
    id: 'app',
    title: 'La app',
    fish: 'mojarrita',
    items: [
      {
        title: 'Instalarla',
        text: (
          <>
            Abrí el link en Edge o Chrome y tocá <K>Instalar</K> (o menú ⋯ → <K>Instalar en esta computadora</K>). Queda
            con su ícono en el escritorio y la barra de tareas.
          </>
        ),
        keys: 'instalar escritorio',
      },
      {
        title: 'Actualizaciones',
        text: (
          <>
            Se actualiza sola. Si llega una versión nueva mientras la usás, aparece <K>Actualizar</K> abajo a la
            izquierda. La versión está al final del menú ⋯.
          </>
        ),
      },
      {
        title: '¿Dónde se guarda todo?',
        text: (
          <>
            Tus tareas personales, en esta compu. Las compartidas, en el servidor del equipo. Tus tareas abiertas y lo
            que terminás en el día se ven en <b>Tareas del equipo</b>.
          </>
        ),
        keys: 'datos guardar',
      },
    ],
  },
];

/** Manual de uso: cómo se usa cada cosa, con buscador. */
export function Manual() {
  const open = useUI((s) => s.manualOpen);
  const [query, setQuery] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    const text = (n: React.ReactNode): string =>
      typeof n === 'string'
        ? n
        : Array.isArray(n)
          ? n.map(text).join(' ')
          : n && typeof n === 'object' && 'props' in n
            ? text((n as { props: { children?: React.ReactNode } }).props.children)
            : '';
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => `${s.title} ${i.title} ${i.keys ?? ''} ${text(i.text)}`.toLowerCase().includes(q)),
    })).filter((s) => s.items.length);
  }, [query]);

  return (
    <Modal
      open={open}
      onClose={() => useUI.setState({ manualOpen: false })}
      size="lg"
      className="manual-modal"
      title={
        <>
          <span className="log-title">Manual de uso</span>
          <span className="log-subtitle">Cómo se usa cada cosa</span>
        </>
      }
    >
      <div className="manual" ref={bodyRef}>
        <label className="search">
          <IconSearch size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar: balde, categoría, contraseña…" aria-label="Buscar en el manual" />
        </label>
        {!query && (
          <nav className="manual-toc" aria-label="Temas">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                onClick={() => document.getElementById(`manual-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {s.title}
              </button>
            ))}
          </nav>
        )}
        {sections.length === 0 && <p className="muted">No encontré nada con “{query}”.</p>}
        {sections.map((s) => (
          <section key={s.id} id={`manual-${s.id}`} className="manual-section">
            <h3>
              <SpeciesFish kind={s.fish} width={44} swim={false} />
              {s.title}
            </h3>
            <dl>
              {s.items.map((i) => (
                <div key={i.title} className="manual-item">
                  <dt>{i.title}</dt>
                  <dd>{i.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
