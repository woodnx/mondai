import Papa from 'papaparse';
import type { Quiz, SourceDraft, SourceSettings } from './sheets';

/** 省略できる列。古い設定ファイルには partnerComment・criteria がない（undefined になる） */
export const optionalColumns = ['comment', 'author', 'partnerComment', 'criteria'] as const;

/** 見出しを取得したときに自動で選ぶ見出し名 */
export const defaultColumnLabels = {
  question: '問題文',
  answer: '答え',
  comment: '作問者コメント',
  author: '作成者',
  partnerComment: '相方コメント',
  criteria: '別解・正誤判定基準'
} as const;

/**
 * 古い設定に存在しない（undefined の）省略可能な列を、既定の見出し名から補う。
 * 「使用しない」（null）を選んだ列は変えない。補った列があれば true を返す
 */
export function fillMissingColumns(settings: SourceSettings, header: string[]): boolean {
  const columns = settings.columns;
  const used = new Set(Object.values(columns).filter((column) => column != null));
  let changed = false;
  for (const key of optionalColumns) {
    if (columns[key] !== undefined) continue;
    const index = header.findIndex((label) => label.trim() === defaultColumnLabels[key]);
    columns[key] = index >= 0 && !used.has(index) ? index : null;
    if (columns[key] !== null) used.add(index);
    changed = true;
  }
  return changed;
}

export function spreadsheetId(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Google スプレッドシートの URL を入力してください。');
  }
  const match = parsed.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'docs.google.com' || !match) {
    throw new Error('Google スプレッドシートの URL を入力してください。');
  }
  return match[1];
}

/** URL の ?gid= または #gid= からタブ ID を取り出す。なければ null（先頭のタブ） */
export function sheetGid(url: string): string | null {
  const parsed = new URL(url);
  const gid = parsed.searchParams.get('gid') ?? parsed.hash.match(/gid=(\d+)/)?.[1] ?? null;
  return gid !== null && /^\d+$/.test(gid) ? gid : null;
}

/** 公開シートを API キーなしで CSV として取得する URL */
export function csvExportUrl(url: string): string {
  const exportUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId(url)}/export?format=csv`
  );
  const gid = sheetGid(url);
  if (gid !== null) exportUrl.searchParams.set('gid', gid);
  return exportUrl.toString();
}

/** RFC 4180 形式の CSV を行列に変換する（セル内のカンマ・改行・引用符に対応） */
export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: ',',
    skipEmptyLines: false
  });
  const fatal = result.errors.find((error) => error.type === 'Quotes');
  if (fatal) throw new Error('シートのデータを読み取れませんでした。');
  return result.data;
}

/** Content-Disposition の filename* から「スプレッドシート名 - タブ名」を取り出す */
export function sheetNameFromDisposition(header: string | null): string {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (!encoded) return '';
  try {
    return decodeURIComponent(encoded).replace(/\.csv$/i, '');
  } catch {
    return '';
  }
}

export function validateDraft(value: unknown): asserts value is SourceDraft {
  if (!value || typeof value !== 'object') throw new Error('接続先を入力してください。');
  const draft = value as Partial<SourceDraft>;
  if (typeof draft.url !== 'string') throw new Error('スプレッドシート URL を入力してください。');
  spreadsheetId(draft.url.trim());
  if (!Number.isSafeInteger(draft.headerRow) || draft.headerRow! < 1 || draft.headerRow! > 100000) {
    throw new Error('見出し行は 1 以上の整数で指定してください。');
  }
}

export function validateSettings(value: unknown): asserts value is SourceSettings {
  validateDraft(value);
  const settings = value as SourceSettings;
  const columns = settings.columns;
  if (!columns || typeof columns !== 'object') throw new Error('列の対応を選択してください。');
  if (!Number.isSafeInteger(columns.question) || columns.question < 0) {
    throw new Error('問題文の列を選択してください。');
  }
  if (!Number.isSafeInteger(columns.answer) || columns.answer < 0) {
    throw new Error('答えの列を選択してください。');
  }
  for (const key of optionalColumns) {
    // 古い設定ファイルにない列（undefined）は「使用しない」として扱う
    const column = columns[key] ?? null;
    if (column !== null && (!Number.isSafeInteger(column) || column < 0)) {
      throw new Error('列の対応を選択してください。');
    }
  }
  const selected = Object.values(columns).filter((column): column is number => column != null);
  if (new Set(selected).size !== selected.length) {
    throw new Error('同じ列を複数の項目に割り当てることはできません。');
  }
}

export function rowsToQuizzes(rows: string[][], settings: SourceSettings): Quiz[] {
  validateSettings(settings);
  const header = rows[settings.headerRow - 1] ?? [];
  for (const column of Object.values(settings.columns)) {
    if (column != null && !header[column]?.trim()) {
      throw new Error('設定した列が見出し行に見つかりません。見出しを取得し直してください。');
    }
  }
  const { question, answer, comment, author, partnerComment, criteria } = settings.columns;
  const cell = (row: string[], column: number | null | undefined): string =>
    column == null ? '' : (row[column]?.trim() ?? '');
  const quizzes: Quiz[] = rows.slice(settings.headerRow).flatMap((row) => {
    const quiz: Quiz = {
      question: cell(row, question),
      answer: cell(row, answer),
      comment: cell(row, comment),
      author: cell(row, author),
      partners: [],
      partnerComment: cell(row, partnerComment),
      criteria: cell(row, criteria)
    };
    return quiz.question && quiz.answer ? [quiz] : [];
  });
  // 相方は専用の列を持たず、「作成者」列に出てくる自分以外の人とする
  const authors = [...new Set(quizzes.map((quiz) => quiz.author).filter(Boolean))];
  for (const quiz of quizzes) {
    quiz.partners = quiz.author ? authors.filter((name) => name !== quiz.author) : [];
  }
  return quizzes;
}
