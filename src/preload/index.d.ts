import { ElectronAPI } from '@electron-toolkit/preload';
import type { AppAPI } from '../shared/sheets';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: AppAPI;
  }
}
