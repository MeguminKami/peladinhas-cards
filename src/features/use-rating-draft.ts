import { useCallback, useEffect, useRef, useState } from 'react';

export type RatingValues = Record<string, number | null>;
const activeDrafts = new Set<() => Promise<unknown>>();
/** Navigation must await the same queue used by autosave before changing identity. */
export function flushRatingDrafts(): Promise<unknown[]> {
  return Promise.all([...activeDrafts].map(flush => flush()));
}
export function useRatingDraft(initial: RatingValues, save: (values: RatingValues) => Promise<unknown>, onError: (error: unknown) => void) {
  const [values, setValues] = useState(initial);
  const [state, setState] = useState('Guardado');
  const current = useRef(initial);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const alive = useRef(true);
  const saveRef = useRef(save); saveRef.current = save;
  const errorRef = useRef(onError); errorRef.current = onError;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return queue.current;
    dirty.current = false;
    const snapshot = { ...current.current };
    if (alive.current) setState('A guardar…');
    queue.current = queue.current.catch(() => {}).then(() => saveRef.current(snapshot)).then(() => { if (alive.current) setState('Guardado'); }).catch(error => {
      dirty.current = true;
      if (alive.current) { setState('Erro ao guardar — tenta novamente'); errorRef.current(error); }
      throw error;
    });
    return queue.current;
  }, []);
  const change = useCallback((key: string, value: number | null | undefined) => {
    const next = { ...current.current };
    if (value === undefined) delete next[key]; else next[key] = value;
    current.current = next; setValues(next); dirty.current = true; setState('A guardar…');
    clearTimeout(timer.current); timer.current = setTimeout(() => { void flush().catch(() => {}); }, 450);
  }, [flush]);
  const saveNow = useCallback(() => { dirty.current = true; return flush(); }, [flush]);
  useEffect(() => { alive.current = true; activeDrafts.add(flush); return () => { alive.current = false; activeDrafts.delete(flush); clearTimeout(timer.current); void flush().catch(() => {}); }; }, [flush]);
  return { values, current, change, flush, saveNow, state, setState };
}
