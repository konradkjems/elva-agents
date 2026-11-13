/**
 * Paces the server's `step` events into a readable activity trail.
 *
 * The server reports steps as fast as they happen (a knowledge-base lookup can
 * finish in 200 ms), so the steps would flash past unseen. Each step change is
 * held on screen for at least DWELL ms. Once the answer text starts streaming,
 * the queue drains quickly (FAST), so the trail never holds back the answer.
 */
const DWELL = 420;
const FAST = 90;

export function createTrail(onChange) {
  let steps = [];
  const queue = [];
  let timer = null;
  let last = 0;
  let fast = false;
  let closed = false;

  const merge = (ev) => {
    // Thinking is the fallback state: once a concrete step (a search) starts,
    // close it, so only one step spins at a time.
    if (ev.status !== 'done' && !String(ev.id).startsWith('think')) {
      steps = steps.map((s) => (s.kind === 'think' && s.status === 'active' ? { ...s, status: 'done' } : s));
    }
    const i = steps.findIndex((s) => s.id === ev.id);
    const prev = i >= 0 ? steps[i] : null;
    const next = {
      id: ev.id,
      kind: ev.data?.kind || String(ev.id).split('-')[0],
      status: ev.status === 'done' ? 'done' : 'active',
      data: { ...(prev?.data || {}), ...(ev.data || {}) },
    };
    steps = prev ? steps.map((s, j) => (j === i ? next : s)) : [...steps, next];
  };

  const pump = () => {
    if (timer || !queue.length) return;
    const wait = Math.max(0, (fast ? FAST : DWELL) - (Date.now() - last));
    timer = setTimeout(() => {
      timer = null;
      const ev = queue.shift();
      merge(ev);
      // A finished step hands straight over to the next one, so there is never
      // a beat where nothing is happening.
      if (ev.status === 'done' && queue[0]?.status === 'active') merge(queue.shift());
      last = Date.now();
      onChange(steps);
      pump();
    }, wait);
  };

  return {
    push(ev) {
      if (closed || !ev?.id) return;
      queue.push(ev);
      pump();
    },
    /** The answer is streaming: catch up quickly. */
    hurry() {
      fast = true;
    },
    /** Stream over: apply everything left, close any open step, return the trail. */
    finish() {
      closed = true;
      clearTimeout(timer);
      timer = null;
      while (queue.length) merge(queue.shift());
      steps = steps.map((s) => (s.status === 'done' ? s : { ...s, status: 'done' }));
      return steps;
    },
    get size() {
      return steps.length + queue.length;
    },
  };
}
