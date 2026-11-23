export const colors = {
  background: '#FFFFFF',
  text: '#19201F',
  muted: '#5B6864',
  border: '#DEE6E2',
  accent: '#12654C',
  tint: '#E8F4EF',
  selected: '#B1DCCC',
  overlay: '#11192DB3',
  paper: '#FFFFFF',
  hero: '#14382D',
  heroText: '#E1F2E9',
  brain: '#78C7A1',
  brainShade: '#388D72',
  brainLight: '#CFF0DD',
  lime: '#DDF4C3',
  limeInk: '#294420',
  peach: '#FFE8DD',
  peachInk: '#7B3522',
  surface: '#F6F8F7',
  violet: '#F0EAFF',
  violetInk: '#543399',
  sky: '#EBF4FF',
  skyInk: '#25528E',
  amber: '#FFF3CF',
  amberInk: '#6C4900',
  errorFill: '#FFE1DC',
  correct: '#DDF4C3',
  error: '#C62828',
};

export const stroopColors = {
  RED: '#E53935',
  GREEN: '#43A047',
  BLUE: '#1E88E5',
  YELLOW: '#F9A825',
};

export const stroopInk = {
  RED: '#BA2929',
  GREEN: '#247540',
  BLUE: '#176CB8',
  YELLOW: '#8B6200',
};

export const space = {
  hairline: 1,
  line: 2,
  xs: 4,
  sm: 8,
  md: 12,
  page: 16,
  lg: 24,
  xl: 32,
  tap: 48,
  maxBoard: 420,
  shake: 8,
  radius: 12,
  card: 20,
};

/** @satisfies {Record<string, import("react-native").TextStyle>} */
export const type = {
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  heading: { fontSize: 30, fontWeight: '900', letterSpacing: -1.2 },
  number: { fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] },
  display: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
};

export const motion = { press: 0.965, release: 145, enter: 220, feedback: 180, shake: 42 };
export const elevation = { action: 3 };
