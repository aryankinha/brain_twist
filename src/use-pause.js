import { useCallback, useState } from 'react';

export function usePause(startRef) {
  const [pausedAt, setPausedAt] = useState(null);
  const pause = useCallback(() => setPausedAt(Date.now()), []);
  const resume = useCallback(() => {
    const duration = pausedAt === null ? 0 : Date.now() - pausedAt;
    startRef.current += duration;
    setPausedAt(null);
    return duration;
  }, [pausedAt, startRef]);
  return { pausedAt, pause, resume };
}
