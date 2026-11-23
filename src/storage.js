import { dailyGame, dayKey } from './progress';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadProfile() {
  return JSON.parse(await AsyncStorage.getItem('profile'));
}

export function saveProfile(profile) {
  return AsyncStorage.setItem('profile', JSON.stringify(profile));
}

let writes = Promise.resolve();

async function readBest(game) {
  return JSON.parse(await AsyncStorage.getItem(`best:${game}`));
}

export async function getBest(game) {
  await writes;
  return readBest(game);
}

export function saveBest(game, value, day) {
  const pending = writes.then(async () => {
    const previous = await readBest(game);
    const chooseBest = game === 'stroop' ? Math.max : Math.min;
    const best = previous == null ? value : chooseBest(previous, value);
    /** @type {[string, string][]} */
    const updates = [];
    if (best !== previous) updates.push([`best:${game}`, JSON.stringify(best)]);
    const daily = game === dailyGame(day) && day === dayKey();
    const dailyBefore = daily ? await loadDaily(day) : null;
    if (daily) {
      const dailyBest = dailyBefore == null ? value : chooseBest(dailyBefore, value);
      if (dailyBest !== dailyBefore) updates.push(['daily', JSON.stringify({ day, value: dailyBest })]);
    }
    if (updates.length) await AsyncStorage.multiSet(updates);
    return { best, previous, dailyCompleted: daily && dailyBefore == null };
  });
  writes = pending.then(() => {}, () => {});
  return pending;
}

export async function loadPreferences() {
  return JSON.parse(await AsyncStorage.getItem('preferences')) ?? {};
}

export function savePreferences(preferences) {
  return AsyncStorage.setItem('preferences', JSON.stringify(preferences));
}

export async function loadDaily(day) {
  const data = JSON.parse(await AsyncStorage.getItem('daily'));
  return data?.day === day ? data.value : null;
}
