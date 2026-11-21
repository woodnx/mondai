import assert from 'node:assert/strict';
import test from 'node:test';
import {
  csvExportUrl,
  fillMissingColumns,
  parseCsv,
  rowsToQuizzes,
  sheetNameFromDisposition,
  spreadsheetId,
  validateSettings
} from '../src/shared/sheetSource.ts';

const settings = {
  url: 'https://docs.google.com/spreadsheets/d/example_123/edit#gid=42',
  headerRow: 3,
  columns: { question: 1, answer: 0, comment: null, author: 2 }
};

test('Google Sheets URL から ID を取り出し、別ドメインを拒否する', () => {
  assert.equal(spreadsheetId(settings.url), 'example_123');
  assert.throws(() => spreadsheetId('https://example.com/spreadsheets/d/example_123/edit'));
  assert.throws(() => spreadsheetId('not a URL'));
});

test('列の重複と必須列の欠落を拒否する', () => {
  assert.throws(
    () => validateSettings({ ...settings, columns: { ...settings.columns, answer: 1 } }),
    /同じ列/
  );
  assert.throws(
    () => validateSettings({ ...settings, columns: { ...settings.columns, question: -1 } }),
    /問題文/
  );
  assert.throws(() => validateSettings({ ...settings, headerRow: 0 }), /見出し行/);
});

test('見出し行と列順の違いに対応し、空の問題を読み飛ばす', () => {
  const rows = [
    ['タイトル'],
    [],
    ['答え', '問題文', '作成者'],
    ['A', 'Q', '花子'],
    ['B', '', '太郎'],
    ['C', '次の問題', '']
  ];
  assert.deepEqual(rowsToQuizzes(rows, settings), [
    { question: 'Q', answer: 'A', comment: '', author: '花子', partners: [], partnerComment: '' },
    { question: '次の問題', answer: 'C', comment: '', author: '', partners: [], partnerComment: '' }
  ]);
});

test('相方は「作成者」列に出てくる自分以外の人（登場順）になる', () => {
  const withComment = {
    ...settings,
    headerRow: 1,
    columns: { question: 1, answer: 0, comment: 3, author: 2, partnerComment: 4 }
  };
  const rows = [
    ['答え', '問題文', '作成者', 'コメント', '相方コメント'],
    ['A', 'Q1', '木次', 'やった', 'どうせ押される'],
    ['B', 'Q2', '佐々木', '', ''],
    ['C', 'Q3', '田中', '', ''],
    ['D', 'Q4', '木次', '', ''],
    ['E', 'Q5', '', '', '']
  ];
  const quizzes = rowsToQuizzes(rows, withComment);
  assert.deepEqual(quizzes[0], {
    question: 'Q1',
    answer: 'A',
    comment: 'やった',
    author: '木次',
    partners: ['佐々木', '田中'],
    partnerComment: 'どうせ押される'
  });
  assert.deepEqual(quizzes[1].partners, ['木次', '田中']);
  assert.deepEqual(quizzes[3].partners, ['佐々木', '田中']);
  assert.deepEqual(quizzes[4].partners, []);
  // 古い設定（相方コメントの列なし）も読み込める
  const legacy = { ...withComment, columns: { question: 1, answer: 0, comment: 3, author: 2 } };
  assert.doesNotThrow(() => validateSettings(legacy));
  assert.equal(rowsToQuizzes(rows, legacy)[0].partnerComment, '');
});

test('古い設定にない相方コメント列を見出し名から補い、「使用しない」は変えない', () => {
  const header = ['No.', '問題文', '答え', '作問者コメント', '相方コメント', '作成者'];
  const old = { ...settings, columns: { question: 1, answer: 2, comment: 3, author: 5 } };
  assert.equal(fillMissingColumns(old, header), true);
  assert.equal(old.columns.partnerComment, 4);
  assert.equal(fillMissingColumns(old, header), false);

  const disabled = {
    ...settings,
    columns: { question: 1, answer: 2, comment: 3, author: 5, partnerComment: null }
  };
  assert.equal(fillMissingColumns(disabled, header), false);
  assert.equal(disabled.columns.partnerComment, null);
});

test('再読み込み時に選択した見出しが消えたらエラーにする', () => {
  assert.throws(() => rowsToQuizzes([[], [], ['答え']], settings), /見出し行/);
});

test('URL の gid を CSV エクスポート URL に引き継ぐ', () => {
  const base = 'https://docs.google.com/spreadsheets/d/example_123/export?format=csv';
  assert.equal(csvExportUrl(settings.url), `${base}&gid=42`);
  assert.equal(
    csvExportUrl('https://docs.google.com/spreadsheets/d/example_123/edit?gid=7#gid=7'),
    `${base}&gid=7`
  );
  assert.equal(csvExportUrl('https://docs.google.com/spreadsheets/d/example_123/edit'), base);
  assert.equal(
    csvExportUrl('https://docs.google.com/spreadsheets/d/example_123/edit#gid=abc'),
    base
  );
});

test('セル内のカンマ・改行・引用符・空行を正しく読む', () => {
  const csv =
    '答え,問題文,作成者\r\n' +
    '"東京, 大阪","1行目\n2行目",花子\r\n' +
    '"""引用""と書く",Q2,\r\n' +
    ',,\r\n' +
    '最後,Q3,太郎';
  assert.deepEqual(parseCsv(csv), [
    ['答え', '問題文', '作成者'],
    ['東京, 大阪', '1行目\n2行目', '花子'],
    ['"引用"と書く', 'Q2', ''],
    ['', '', ''],
    ['最後', 'Q3', '太郎']
  ]);
  assert.deepEqual(parseCsv('\uFEFFa,b'), [['a', 'b']]);
  assert.deepEqual(parseCsv('単独列\r\nA'), [['単独列'], ['A']]);
});

test('閉じていない引用符はエラーにする', () => {
  assert.throws(() => parseCsv('a,"b\r\nc,d'), /読み取れません/);
});

test('Content-Disposition からシート名を取り出す', () => {
  assert.equal(
    sheetNameFromDisposition(
      `attachment; filename="x.csv"; filename*=UTF-8''%E3%82%AF%E3%82%A4%E3%82%BA%20-%20%E3%82%B7%E3%83%BC%E3%83%881.csv`
    ),
    'クイズ - シート1'
  );
  assert.equal(sheetNameFromDisposition(null), '');
});
