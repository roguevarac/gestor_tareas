import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { Task } from '../types';
import { FISH_RATIO } from './Fish';
import { SpeciesFish } from './Fishes';
import { bucketMouth, bucketRect, isOverBucket, registerPondController, usePond } from '../store/pond';
import { taskOps } from '../lib/taskOps';
import { useUI } from '../store/ui';
import { toneStyle } from '../lib/tones';

const FISH_W = 124;
const FISH_H = FISH_W / FISH_RATIO;

interface Run {
  key: number;
  task: Task;
  origin: DOMRect;
  start: { x: number; y: number };
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
}

let bubbleSeq = 0;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const spring = (stiffness: number, damping: number, mass = 1) => ({
  type: 'spring' as const,
  stiffness,
  damping,
  mass,
});
const FOLLOW = spring(900, 55, 0.5);
const BACK_OUT = [0.34, 1.56, 0.64, 1] as const;

/**
 * La capa donde la tarea se convierte en mojarrita al arrastrarla: sigue al puntero, hace burbujas,
 * se zambulle en el balde (y la tarea pasa a la bitácora) o vuelve nadando a su lugar.
 */
export function FishOverlay() {
  const [run, setRun] = useState<Run | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  /** Al zambullirse, todo lo que queda debajo del borde del balde se recorta: parece que entra al agua. */
  const [waterline, setWaterline] = useState<{ left: number; right: number; y: number } | null>(null);
  const facingRef = useRef<1 | -1>(1);
  const busy = useRef(false);

  const fx = useMotionValue(0);
  const fy = useMotionValue(0);
  const rot = useMotionValue(0);
  const scale = useMotionValue(0.25);
  const opacity = useMotionValue(0);
  const left = useTransform(fx, (v) => v - FISH_W / 2);
  const top = useTransform(fy, (v) => v - FISH_H / 2);

  useEffect(() => {
    const face = (f: 1 | -1) => {
      if (facingRef.current === f) return;
      facingRef.current = f;
      setFacing(f);
    };

    const puff = (x: number, y: number, n = 1) => {
      const fresh = Array.from({ length: n }, () => ({
        id: ++bubbleSeq,
        x: x + rand(-9, 9),
        y: y + rand(-7, 7),
        size: rand(5, 12),
      }));
      setBubbles((b) => [...b.slice(-20), ...fresh]);
    };

    const appear = (task: Task, el: HTMLElement, x: number, y: number) => {
      const origin = el.getBoundingClientRect();
      fx.jump(x);
      fy.jump(y);
      rot.jump(0);
      scale.jump(0.25);
      opacity.jump(0);
      facingRef.current = 1;
      setFacing(1);
      setRun({ key: Date.now(), task, origin, start: { x, y } });
      usePond.setState({ draggingId: task.id, phase: 'dragging', bucketHot: false });
      puff(x, y, 6);
      animate(opacity, 1, { duration: 0.14, delay: 0.06 });
      return animate(scale, 1, { duration: 0.3, delay: 0.06, ease: BACK_OUT });
    };

    const finish = () => {
      setRun(null);
      setWaterline(null);
      usePond.setState({ draggingId: null, phase: 'idle', bucketHot: false });
      document.body.classList.remove('is-fishing');
      busy.current = false;
    };

    /** Se acomoda arriba del balde y se zambulle de cabeza. */
    const dive = async (task: Task) => {
      usePond.setState({ phase: 'catching', bucketHot: true });
      const mouth = bucketMouth();
      if (mouth) {
        face(fx.get() <= mouth.x ? 1 : -1);
        const f = facingRef.current;
        await Promise.all([
          animate(fx, mouth.x, { duration: 0.22, ease: 'easeOut' }),
          animate(fy, mouth.y - 38, { duration: 0.22, ease: 'easeOut' }),
          animate(rot, -18 * f, { duration: 0.2 }),
          animate(scale, 1, { duration: 0.2 }),
        ]);
        puff(mouth.x + f * 30, mouth.y - 40, 3);
        const r = bucketRect();
        if (r) setWaterline({ left: r.left + r.width * 0.06, right: r.right - r.width * 0.06, y: mouth.y });
        await Promise.all([
          animate(rot, 90 * f, { duration: 0.2, ease: 'easeIn' }),
          animate(fy, mouth.y + FISH_W * 0.75, { duration: 0.36, ease: [0.5, 0, 0.85, 0.6] }),
          animate(scale, 0.7, { duration: 0.36, ease: 'easeIn' }),
        ]);
        opacity.jump(0);
      }
      usePond.setState((s) => ({ splashKey: s.splashKey + 1 }));
      const entryId = taskOps.complete(task);
      finish();
      if (entryId) window.setTimeout(() => useUI.getState().showCatch(entryId), 380);
    };

    /** Soltada fuera del balde: vuelve nadando a su tarjeta. */
    const swimBack = async (task: Task, origin: DOMRect) => {
      usePond.setState({ phase: 'returning', bucketHot: false });
      const el = document.querySelector<HTMLElement>(`[data-task-id="${task.id}"]`);
      const r = el?.getBoundingClientRect() ?? origin;
      const cx = r.left + Math.min(r.width / 2, 80);
      const cy = r.top + Math.min(r.height / 2, 40);
      face(cx >= fx.get() ? 1 : -1);
      await Promise.all([
        animate(fx, cx, { duration: 0.45, ease: 'easeInOut' }),
        animate(fy, cy, { duration: 0.45, ease: 'easeInOut' }),
        animate(rot, 0, { duration: 0.3 }),
        animate(scale, 0.35, { duration: 0.45, ease: 'easeIn' }),
        animate(opacity, 0, { duration: 0.18, delay: 0.3 }),
      ]);
      finish();
    };

    const startDrag = (task: Task, el: HTMLElement, x: number, y: number) => {
      if (busy.current) return;
      busy.current = true;
      document.body.classList.add('is-fishing');
      void appear(task, el, x, y);
      const origin = el.getBoundingClientRect();

      let lastX = x;
      let lastY = y;
      let lastBubble = 0;
      let ended = false;

      const move = (cx: number, cy: number) => {
        if (ended) return;
        const dx = cx - lastX;
        const dy = cy - lastY;
        const dist = Math.hypot(dx, dy);
        if (Math.abs(dx) > 1.5) face(dx > 0 ? 1 : -1);
        if (dist > 0.5) {
          const tilt = Math.max(-35, Math.min(35, ((Math.atan2(dy, Math.abs(dx) + 3) * 180) / Math.PI) * 0.7));
          animate(rot, tilt * facingRef.current, spring(260, 20));
        }
        lastX = cx;
        lastY = cy;
        animate(fx, cx, FOLLOW);
        animate(fy, cy, FOLLOW);
        const hot = isOverBucket(cx, cy);
        if (usePond.getState().bucketHot !== hot) usePond.setState({ bucketHot: hot });
        const now = performance.now();
        if (dist > 2 && now - lastBubble > 80) {
          lastBubble = now;
          puff(cx + facingRef.current * FISH_W * 0.48, cy - 4);
        }
      };

      const onPointerMove = (e: PointerEvent) => move(e.clientX, e.clientY);
      const onTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault(); // que no scrollee mientras arrastrás
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
      };
      const end = (cancel: boolean) => {
        if (ended) return;
        ended = true;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onUp);
        window.removeEventListener('touchcancel', onUp);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('blur', onBlur);
        if (!cancel && isOverBucket(lastX, lastY)) void dive(task);
        else void swimBack(task, origin);
      };
      const onUp = () => end(false);
      const onBlur = () => end(true);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') end(true);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onUp);
      window.addEventListener('touchcancel', onUp);
      window.addEventListener('keydown', onKey);
      window.addEventListener('blur', onBlur);
    };

    registerPondController({ startDrag });
    return () => registerPondController(null);
  }, [fx, fy, rot, scale, opacity]);

  return (
    <div className="pond-overlay" aria-hidden="true">
      {run && (
        <motion.div
          key={`ghost-${run.key}`}
          className="ghost-card"
          style={toneStyle(run.task.tone)}
          initial={{
            left: run.origin.left,
            top: run.origin.top,
            width: run.origin.width,
            height: run.origin.height,
            opacity: 1,
            borderRadius: 18,
          }}
          animate={{
            left: run.start.x - 30,
            top: run.start.y - 15,
            width: 60,
            height: 30,
            opacity: 0,
            borderRadius: 30,
          }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            {run.task.title}
          </motion.span>
        </motion.div>
      )}

      {bubbles.map((b) => (
        <motion.span
          key={b.id}
          className="trail-bubble"
          style={{ left: b.x, top: b.y, width: b.size, height: b.size }}
          initial={{ opacity: 0.95, y: 0, scale: 0.4 }}
          animate={{ opacity: 0, y: -50, scale: 1.15 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          onAnimationComplete={() => setBubbles((bs) => bs.filter((x) => x.id !== b.id))}
        />
      ))}

      {run && (
        <div
          className="fish-layer"
          style={
            waterline
              ? {
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, ${waterline.right}px 100%, ${waterline.right}px ${waterline.y}px, ${waterline.left}px ${waterline.y}px, ${waterline.left}px 100%, 0 100%)`,
                }
              : undefined
          }
        >
          <motion.div className="fish-runner" style={{ x: left, y: top, rotate: rot, scale, opacity }}>
            <motion.div className="fish-flip" animate={{ scaleX: facing }} transition={spring(520, 30)}>
              <SpeciesFish kind={run.task.shared?.fish} width={FISH_W} />
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
