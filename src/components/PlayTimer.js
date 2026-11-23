import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { formatTime } from '../format';

export default function PlayTimer({ start, running, result, tenths = false, style, pausedAt = null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running || pausedAt !== null) return;
    const refresh = () => setElapsed(Date.now() - start.current);
    const interval = setInterval(refresh, tenths ? 100 : 250);
    return () => clearInterval(interval);
  }, [pausedAt, running, start, tenths]);

  return <Text style={style}>{formatTime(Math.max(0, result ?? (pausedAt !== null ? pausedAt - start.current : elapsed)), tenths)}</Text>;
}
