import type { ThemeMode } from '../../../shared/display';

export const themeColors = [
  { name: '赤', value: 'red', hex: '#ef6464' },
  { name: 'オレンジ', value: 'orange', hex: '#f58b4b' },
  { name: '琥珀', value: 'amber', hex: '#e9ab38' },
  { name: '黄', value: 'yellow', hex: '#e4cc4f' },
  { name: '黄緑', value: 'lime', hex: '#a9cf52' },
  { name: '緑', value: 'green', hex: '#58c783' },
  { name: '青緑', value: 'teal', hex: '#48c4ad' },
  { name: '水色', value: 'cyan', hex: '#54c4df' },
  { name: '青', value: 'blue', hex: '#69a9f5' },
  { name: '藍', value: 'indigo', hex: '#8d9cf3' },
  { name: '紫', value: 'violet', hex: '#b18bf0' },
  { name: '桃', value: 'pink', hex: '#ed8ac1' }
] as const;

export const themeModes = [
  { name: 'ライト', value: 'light', hex: '#ffffff' },
  { name: 'ダーク', value: 'dark', hex: '#111317' }
] as const satisfies readonly { name: string; value: ThemeMode; hex: string }[];

export type ThemeColor = (typeof themeColors)[number]['value'];

/** テーマ（モードとカラー）を document に反映する */
export function applyTheme(mode: ThemeMode, color: string): void {
  document.documentElement.dataset.theme = mode;
  const found = themeColors.find((item) => item.value === color) ?? themeColors[8];
  document.documentElement.style.setProperty('--theme-accent', found.hex);
}
