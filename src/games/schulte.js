export const schulteLevels = {
  easy: { size: 5, cue: 'target' },
  medium: { size: 5, cue: 'groups' },
  hard: { size: 6, cue: 'none' },
};

export function shuffleNumbers(size, random = Math.random) {
  const numbers = Array.from({ length: size * size }, (_, index) => index + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}
