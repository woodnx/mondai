# mondai

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

### Windows 版のリリース

GitHub Actions（`.github/workflows/release-windows.yml`）で Windows 用インストーラーを作り、GitHub Releases に公開します。

1. `package.json` の `version` を上げてコミットし、push します（例: `1.0.1`）。
2. 同じバージョンのタグを付けて push します。タグと `version` が一致しないとビルドは失敗します。

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. Actions が終わると、Releases に `mondai-1.0.1-setup.exe` が添付されます。

Actions 画面の「Run workflow」から手動で実行した場合は、リリースは作らずに、実行結果の Artifacts にインストーラーを保存します。

コード署名をしていないため、初回の実行時に SmartScreen の警告が出ます。「詳細情報」→「実行」で起動できます。

## ウィンドウ構成

起動すると 2 つのウィンドウが開きます。

- **操作ウィンドウ**：設定、再読み込み、問題の送り・開閉を行います。通知は左上に出て、数秒で消えます。
- **問題表示ウィンドウ**：問題だけを表示します。プロジェクターなどに映す用です（F11 で全画面）。閉じても操作ウィンドウの「表示ウィンドウを開く」で開き直せます。

## Google スプレッドシートから問題を読み込む

「リンクを知っている全員が閲覧可」に設定したシートを、CSV 形式で読み込みます。Google Cloud の設定、API キー、Google ログインはいずれも不要です。非公開のシートは読み込めません。

### アプリでの設定

1. 対象のスプレッドシートを Google スプレッドシートで開き、「共有」で「リンクを知っている全員」を「閲覧者」にします。
2. 問題が入っているタブを開いた状態で、ブラウザのアドレスバーの URL をコピーします。URL の末尾の `gid=...` で読み込むタブが決まります。`gid` がない URL では先頭のタブを読み込みます。
3. アプリの「設定」に URL を貼り、見出し行の番号を入力して「見出しを取得」を押します。
4. 「問題文」と「答え」に対応する列を選びます。「作問者コメント」と「作成者」は任意です。1 つの列を複数の項目に割り当てることはできません。
5. 「設定を保存して読み込む」を押します。設定は再起動後も残ります。起動時と「再読み込み」を押したときに、最新の問題を取得します。問題文か答えが空の行は読み飛ばします。

セル内のカンマ、改行、`"` もそのまま読み込めます。接続先の設定は、アプリのユーザーデータ領域に保存します。
