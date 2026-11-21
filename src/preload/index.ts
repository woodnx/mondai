import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import type { AppAPI, SourceDraft, SourceSettings } from '../shared/sheets';
import type { DisplayState } from '../shared/display';

// Custom APIs for renderer
const api: AppAPI = {
  getState: () => ipcRenderer.invoke('sheets:get-state'),
  inspectSource: (draft: SourceDraft) => ipcRenderer.invoke('sheets:inspect-source', draft),
  saveSettings: (settings: SourceSettings) => ipcRenderer.invoke('sheets:save-settings', settings),
  loadQuizzes: () => ipcRenderer.invoke('sheets:load-quizzes'),
  display: {
    update: (state: DisplayState) => ipcRenderer.send('display:update', state),
    getState: () => ipcRenderer.invoke('display:get-state'),
    onState: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: DisplayState): void =>
        listener(state);
      ipcRenderer.on('display:state', handler);
      return () => ipcRenderer.removeListener('display:state', handler);
    },
    open: () => ipcRenderer.send('display:open')
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
