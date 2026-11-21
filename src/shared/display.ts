import type { Quiz } from './sheets';

export type ThemeMode = 'light' | 'dark';

/** 操作ウィンドウから表示ウィンドウへ送る表示内容 */
export type DisplayState = {
  /** 表示ウィンドウ上部のヘッダーに出すタイトル */
  title: string;
  quiz: Quiz | null;
  no: number;
  flipped: boolean;
  themeColor: string;
  themeMode: ThemeMode;
};

export type DisplayAPI = {
  /** 操作ウィンドウから表示内容を更新する */
  update(state: DisplayState): void;
  /** 現在の表示内容を取得する（表示ウィンドウの起動時用） */
  getState(): Promise<DisplayState | null>;
  /** 表示内容の変更を購読する。戻り値で購読を解除する */
  onState(listener: (state: DisplayState) => void): () => void;
  /** 表示ウィンドウを開く（閉じられていれば作り直す） */
  open(): void;
};
