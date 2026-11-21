import { app } from 'electron';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  csvExportUrl,
  fillMissingColumns,
  parseCsv,
  rowsToQuizzes,
  sheetNameFromDisposition,
  validateDraft,
  validateSettings
} from '../shared/sheetSource';
import type {
  Quiz,
  SheetsState,
  SourceDraft,
  SourceInspection,
  SourceSettings
} from '../shared/sheets';

const settingsPath = (): string => join(app.getPath('userData'), 'sheet-source.json');

async function readSettings(): Promise<SourceSettings | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(settingsPath(), 'utf8'));
    validateSettings(parsed);
    return parsed;
  } catch {
    return null;
  }
}

type SheetData = { sheetName: string; rows: string[][] };

/** 「リンクを知っている全員が閲覧可」のシートを CSV で取得する（Google Cloud・API キー不要） */
async function fetchSheet(url: string): Promise<SheetData> {
  let response: Response;
  try {
    response = await fetch(csvExportUrl(url.trim()), { signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Error(
      'Google スプレッドシートに接続できませんでした。ネットワークを確認してください。'
    );
  }
  if (response.status === 404)
    throw new Error('スプレッドシートが見つかりません。URL を確認してください。');
  if (response.status === 400) {
    throw new Error(
      '指定したタブが見つかりません。読み込みたいタブを開いた状態の URL を貼ってください。'
    );
  }
  if (!response.ok) {
    throw new Error(`Google スプレッドシートから読み込めませんでした（HTTP ${response.status}）。`);
  }
  // 非公開シートはエラーではなくログイン画面（HTML）が返ってくる
  if (!response.headers.get('content-type')?.includes('text/csv')) {
    throw new Error(
      'シートを読み込めませんでした。共有設定を「リンクを知っている全員が閲覧可」にしてください。'
    );
  }
  return {
    sheetName: sheetNameFromDisposition(response.headers.get('content-disposition')),
    rows: parseCsv(await response.text())
  };
}

export async function getState(): Promise<SheetsState> {
  // A previous version saved OAuth credentials; public-only access never needs them.
  try {
    await unlink(join(app.getPath('userData'), 'google-token.bin'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return { settings: await readSettings() };
}

function inspectRows({ sheetName, rows }: SheetData, headerRow: number): SourceInspection {
  const header = rows[headerRow - 1];
  if (!header?.some((cell) => cell.trim())) throw new Error('指定した行に見出しがありません。');
  return {
    sheetName,
    headers: header.flatMap((label, index) =>
      label.trim() ? [{ index, label: label.trim() }] : []
    )
  };
}

export async function inspectSource(draft: SourceDraft): Promise<SourceInspection> {
  validateDraft(draft);
  return inspectRows(await fetchSheet(draft.url), draft.headerRow);
}

export async function saveSettings(input: SourceSettings): Promise<Quiz[]> {
  validateSettings(input);
  const settings: SourceSettings = {
    url: input.url.trim(),
    headerRow: input.headerRow,
    columns: { ...input.columns }
  };
  const sheet = await fetchSheet(settings.url);
  const validColumns = new Set(inspectRows(sheet, settings.headerRow).headers.map((h) => h.index));
  for (const column of Object.values(settings.columns)) {
    if (column !== null && !validColumns.has(column)) {
      throw new Error('選択した列が見出し行に見つかりません。');
    }
  }
  const quizzes = rowsToQuizzes(sheet.rows, settings);
  await writeSettings(settings);
  return quizzes;
}

async function writeSettings(settings: SourceSettings): Promise<void> {
  const temporary = `${settingsPath()}.tmp`;
  const { url, headerRow, columns } = settings;
  await writeFile(temporary, JSON.stringify({ url, headerRow, columns }, null, 2), { mode: 0o600 });
  await rename(temporary, settingsPath());
}

export async function loadQuizzes(): Promise<Quiz[]> {
  const settings = await readSettings();
  if (!settings) throw new Error('先にスプレッドシートを設定してください。');
  const { rows } = await fetchSheet(settings.url);
  // 相方コメントなど、後から増えた列を古い設定に補って保存し直す
  if (fillMissingColumns(settings, rows[settings.headerRow - 1] ?? [])) {
    await writeSettings(settings);
  }
  return rowsToQuizzes(rows, settings);
}
