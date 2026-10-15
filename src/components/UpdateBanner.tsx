import { AnimatePresence, motion } from 'motion/react';
import { useUpdate } from '../lib/updates';
import { MiniFish } from './Fish';

/** "Hay una versión nueva": aparece solo si llega una actualización mientras usás la app. */
export function UpdateBanner() {
  const apply = useUpdate((s) => s.apply);
  return (
    <AnimatePresence>
      {apply && (
        <motion.div
          className="update-banner"
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          <MiniFish size={30} />
          <span>Hay una versión nueva de Mis tareas</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={apply}>
            Actualizar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
