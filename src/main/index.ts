import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { getState, inspectSource, loadQuizzes, saveSettings } from './sheets';
import type { SourceDraft, SourceSettings } from '../shared/sheets';
import type { DisplayState } from '../shared/display';

type View = 'control' | 'display';

let controlWindow: BrowserWindow | null = null;
let displayWindow: BrowserWindow | null = null;
/** 表示ウィンドウを開き直しても内容を復元できるよう、最新の表示内容を保持する */
let displayState: DisplayState | null = null;

function createWindow(view: View): BrowserWindow {
  const window = new BrowserWindow({
    width: view === 'control' ? 900 : 1280,
    height: view === 'control' ? 760 : 720,
    title: view === 'control' ? 'mondai - 操作' : 'mondai - 問題表示',
    show: false,
    autoHideMenuBar: true,
    disableAutoHideCursor: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  window.on('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // dev 時にはリモートURLを，prod 環境ではローカルのHTMLファイルをロード
  // どちらの画面を出すかは URL のハッシュで切り替える
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${view}`);
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), { hash: view });
  }

  return window;
}

function openControlWindow(): void {
  if (controlWindow) {
    controlWindow.focus();
    return;
  }
  controlWindow = createWindow('control');
  controlWindow.on('closed', () => {
    controlWindow = null;
    // 操作ウィンドウを閉じたら表示ウィンドウも閉じる
    displayWindow?.close();
  });
}

function openDisplayWindow(): void {
  if (displayWindow) {
    displayWindow.show();
    displayWindow.focus();
    return;
  }
  displayWindow = createWindow('display');
  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  ipcMain.handle('sheets:get-state', getState);
  ipcMain.handle('sheets:inspect-source', (_event, draft: SourceDraft) => inspectSource(draft));
  ipcMain.handle('sheets:save-settings', (_event, settings: SourceSettings) =>
    saveSettings(settings)
  );
  ipcMain.handle('sheets:load-quizzes', loadQuizzes);

  ipcMain.on('display:update', (_event, state: DisplayState) => {
    displayState = state;
    displayWindow?.webContents.send('display:state', state);
  });
  ipcMain.handle('display:get-state', () => displayState);
  ipcMain.on('display:open', openDisplayWindow);

  openControlWindow();
  openDisplayWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      openControlWindow();
      openDisplayWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
