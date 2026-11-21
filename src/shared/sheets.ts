import type { DisplayAPI } from './display';

export type ColumnMapping = {
  question: number;
  answer: number;
  comment: number | null;
  author: number | null;
  partnerComment: number | null;
  criteria: number | null;
};

export type SourceDraft = {
  /** 読み込むタブを開いた状態でコピーしたスプレッドシート URL（gid でタブを指定） */
  url: string;
  headerRow: number;
};

export type SourceSettings = SourceDraft & {
  columns: ColumnMapping;
};

export type SheetHeader = { index: number; label: string };

export type SourceInspection = {
  /** 「スプレッドシート名 - タブ名」。取得できなければ空文字 */
  sheetName: string;
  headers: SheetHeader[];
};

export type Quiz = {
  question: string;
  answer: string;
  comment: string;
  author: string;
  /** 相方：「作成者」列に登場する、この問題の作成者以外の人（登場順） */
  partners: string[];
  partnerComment: string;
  /** 別解・正誤判定基準（空欄なら空文字） */
  criteria: string;
};

export type SheetsState = {
  settings: SourceSettings | null;
};

export type SheetsAPI = {
  getState(): Promise<SheetsState>;
  inspectSource(draft: SourceDraft): Promise<SourceInspection>;
  saveSettings(settings: SourceSettings): Promise<Quiz[]>;
  loadQuizzes(): Promise<Quiz[]>;
};

export type AppAPI = SheetsAPI & {
  display: DisplayAPI;
};
