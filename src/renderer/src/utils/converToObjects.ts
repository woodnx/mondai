// 変換結果の型
type ConvertedRow<M extends Record<string, string>> = {
  [K in M[keyof M]]: string;
};

export function convertToObjects<M extends Record<string, string>>(
  rows: readonly (readonly string[])[],
  map: M
): ConvertedRow<M>[] {
  const [header, ...body] = rows;

  return body.map((row) => {
    return header.reduce((acc, key, i) => {
      if (key in map) {
        const newKey = map[key as keyof M];
        acc[newKey] = row[i] ?? '';
      }
      return acc;
    }, {} as ConvertedRow<M>);
  });
}
