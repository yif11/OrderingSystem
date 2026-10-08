# 注文システム

React / TypeScript の注文・提供画面と、Node.js / Express の注文APIです。
注文を登録すると、Node.jsからNEC MultiCoder 300S2DCのWindows印刷キューへ
日本語レシートと注文番号票を直接送信します。

## 起動

プリンタを接続したWindows PCで、Node.jsとNECのWindowsプリンタドライバを用意します。
このPCの登録名は `NEC MultiCoder 300S2DC`、用紙は58 mmです。
本体の「エラー復帰」は、セットアップ資料どおり「自動」に設定します。

```powershell
npm install
npm run dev -- --host
```

画面に表示されたViteのURL（通常 `http://localhost:5173`）を開きます。
このコマンドで画面と注文APIをまとめて起動します。画面は同じURLの `/api` 経由で通信するため、
同じPCでも別のPCでも注文APIへ接続できます。`--host` を省略するとローカル利用になります。
`npm run preview` でもビルド済み画面とAPIをまとめて起動します。

APIだけを起動する場合は `npm run server` を使います（既定ポート5000）。
独立したAPIサーバーは `/api/orders` と従来の `/orders` の両方に対応します。
注文データと連番は `order_logs/` に保存され、初回のデータ操作時にフォルダが作成されます。

## 画面の使い方

- **注文受付** (`/order`): メニューの数量を選び、店内／テイクアウト・商品券の枚数・お預かり金額（現金）を確認して送信します。お預かり金額は入力欄に直接入力し、選択商品の一覧とお釣りを表示します。
- **キッチン** (`/`): 注文番号・お渡し方法・商品ごとの提供状況を表示します。店内／テイクアウトで絞り込み、できあがった商品から「提供する」を押します。
- **提供済み** (`/served`): 全商品を提供した注文を、最近提供したものから表示します。キッチンと履歴は2秒ごとに更新します。

メニューはコーヒー（HOT / ICE）、アイスティー、りんごジュース、ぶどうジュース、カルピスが各200円、ジンジャーエールが300円です。
商品券は50・100・200・300・500・1,000円の額面ごとに枚数を指定し、複数の額面を併用できます。
商品券分のお釣りは出ません。額面合計が商品代金を超える場合、現金での支払額は0円になり、超過分を表示します。
商品券だけで支払える場合は、現金欄を空欄または0円で送信できます。
注文合計・売上集計は商品代金を記録し、商品券の額面・枚数は別に保存します。

注文受付はカテゴリ名を省いた1つのメニュー一覧、独立した商品券欄、お会計の3ブロックで表示し、画面幅に合わせて配置を調整します。
お会計とその中の商品一覧には内部スクロールを設けず、ページ全体をスクロールして操作できます。
スマートフォンではタップしやすい操作ボタンと「お会計へ」のショートカットを表示し、会計が見える位置まで移動するとショートカットを隠します。

## プリンタの設定

プリンタの登録名が異なる場合は、サーバーを起動する前に設定します。

```powershell
$env:PRINTER_NAME = 'NEC MultiCoder 300S2DC'
npm run dev -- --host
```

印刷処理のための外部EXE、Python、PowerShellの起動や管理者権限の要求はありません。
ブラウザから注文APIを呼び、プリンタを接続したWindows上のNode.jsが印刷します。

## 印刷内容

- レシート: 先頭に `public/logo.png`、注文番号、店内／テイクアウト、注文時刻、商品名、数量、単価、合計、商品券の額面・枚数・合計、現金での支払額、お預かり（現金）、お釣り。「ありがとうございました」の下に `public/qr.png` を印刷。
- 注文番号票: 大きな注文番号と受け取り案内。店内では「この番号表をクリップにはさんでおいてください」、テイクアウトでは「この番号票をお持ちください」。テイクアウトは提供画面と同じ `T` 接頭辞。
- 58 mm用紙向けの32桁レイアウト、Shift-JIS、ESC/POSコマンドで出力し、レシートと番号票をそれぞれパーシャルカット。
- このPCの58 mm・35桁設定に合わせ、32桁の本文領域の左右に18ドットずつ余白を付けて中央へ配置。ロゴ・QR・見出しは中央、商品名は左、金額は右に揃えます。
- 商品名は画面と印刷で `shared/item-names.json` を共有。

画像は元のPNGを変更せず、印刷時に白背景の白黒画像へ変換し、用紙幅に収めます。
ロゴの透明な余白を取り除き、QR画像の白い余白と縦横比は保持します。
`public/logo.png` / `public/qr.png` を差し替えると次の印刷から反映されます。
画像が存在しない、またはPNGを読み込めない場合は印刷エラーを表示し、登録済みの注文は保持します。

`printing/receipt-images.cjs` が画像を印刷用に変換し、`printing/order-printer.cjs` がReceiptLineで印刷データを生成します。
`printing/windows-printer.cjs` がKoffiを通じてWindowsの
`OpenPrinterW` / `StartDocPrinterW` / `WritePrinter` を呼びます。
Windows印刷処理はワーカースレッドで実行し、複数注文は順番に送信します。

## 印刷失敗と再印刷

注文の保存に成功すると、印刷の成否と注文番号を画面に表示します。
キューへの送信に失敗しても保存した注文を保持し、
「登録済みの注文を再印刷」で同じ注文番号の2枚を再送信できます。
次の注文へ進む場合は「番号を控えて次の注文へ」を選択します。
注文登録自体のエラーでは入力内容を保持します。

APIからの再印刷は `POST /orders/:orderId/print` です。
提供済みの注文も同じ番号で再印刷でき、注文データや連番を追加しません。

`POST /add-order` は保存成功時に201を返します。応答の
`printing.status` は `queued`（Windowsキューへの送信完了）または
`failed`（送信失敗）です。`queued` は実機での印字完了を保証しません。
用紙切れなどはWindowsの印刷キューとプリンタ本体で確認してください。
再印刷ではレシートと番号票の両方を送信します。

## 注文データの管理コマンド

Web APIと管理コマンドは共通のデータ保存処理を使います。
未提供の注文、提供済みの注文、注文番号の連番を1つのJSONにバックアップします。
保存先の既定値は `order_backups/` で、ファイル名には日時と識別子が付きます。
各コマンドは結果と保存先のパスをJSONで表示し、失敗時は終了コード1を返します。

| コマンド | 動作 |
| --- | --- |
| `npm run orders:status` | 未提供／提供済み注文数、商品数、注文合計金額の合計、現在と次回の注文番号を表示 |
| `npm run orders:backup` | 全注文と連番をバックアップ |
| `npm run orders:verify -- --file "バックアップのパス"` | ファイル形式、注文データ、チェックサムを検証 |
| `npm run orders:restore -- --file "バックアップのパス" --yes` | 変更前を自動バックアップしてから、指定ファイルの注文と連番を復元 |
| `npm run orders:reset -- --yes` | 変更前を自動バックアップしてから、全注文を空にし、次の注文番号を1に戻す |
| `npm run orders:reset -- --yes --keep-counter` | 全注文を空にし、連番を維持 |
| `npm run orders:export` | 両方の注文一覧の商品明細をExcel向けのUTF-8 BOM付きCSVに出力 |
| `npm run orders:help` | オプション一覧を表示 |

初期化・復元は、注文受付と印刷が完了してから、実行中の `npm run dev` / `npm run preview` / `npm run server` を停止して実行してください。
`--yes` がない場合は実行しません。変更前のバックアップが作れない場合も変更しません。
初期化では注文データ3ファイルだけを書き換え、バックアップや他のファイルは保持します。
復元では注文番号と提供状態も戻し、印刷は行いません。

出力先を指定する場合は、バックアップとCSV出力に `--output` を渡します。
既存ファイルへの上書きや、注文データ・ロック領域への出力は拒否します。

```powershell
npm run orders:backup -- --output ".\order_backups\festival-end.json"
npm run orders:verify -- --file ".\order_backups\festival-end.json"
npm run orders:export -- --output ".\order_backups\festival-end.csv"
```

CSVは1商品明細につき1行です。同じ注文の合計・お預かり・お釣りは各行に繰り返されます。
商品券額面合計・商品券充当額・現金支払額・額面ごとの商品券枚数も出力します。商品券の超過分は充当額に含めません。
注文合計の集計は `orders:status` の `totalSales`、または注文番号ごとに1行を選んで行ってください。
バックアップは改変せずに保管してください。復元前に形式とチェックサムを確認します。

データとバックアップの場所は環境変数でサーバーとコマンドに共通設定できます。

```powershell
$env:ORDER_DATA_DIR = 'D:\Festival\order_logs'
$env:ORDER_BACKUP_DIR = 'D:\Festival\order_backups'
npm run dev -- --host
```

コマンドだけ別の場所を操作する場合は `--data-dir` と `--backup-dir` を使います。
データ操作はプロセス間でロックし、書き換えの途中で停止した場合は
次回の操作時に記録済みのデータから3ファイルの整合性を復旧します。

## 構成

- `backend/order-domain.cjs`: 入力検証と注文データの生成。
- `backend/order-store.cjs`: データ保存、排他制御、中断した書き込みの復旧。
- `backend/order-service.cjs`: 注文登録、提供済み更新、再印刷。
- `backend/order-maintenance.cjs`: バックアップ、復元、初期化、集計、CSV出力。
- `server.cjs`: HTTPルートとエラー応答。
- `scripts/orders.cjs`: 管理コマンドの引数処理。
- `src/domain/orders.ts`: 共通の注文型、注文番号、数量と金額の計算。
- `shared/product-prices.json` / `shared/item-names.json`: 商品の価格と日本語名。
- `shared/voucher-denominations.json` / `backend/vouchers.cjs`: 商品券の額面と支払額の計算・検証。
- `QuantityControl` / `OrderCard`: 注文画面と提供画面で再利用する表示部品。

従来の `orders.json`、`served-orders.json`、`max-order-id.txt` をそのまま利用できます。
数量・提供済みフラグ・注文時刻が省略された旧データも保持します。
`development/order-api.cjs` がViteの開発・プレビューサーバーに注文APIを組み込みます。
APIのコードを変更した場合は開発サーバーを再起動してください。
独立したAPIへ接続する場合は、Vite起動前に `VITE_API_URL` を設定します（既定値 `/api`）。
例えば `$env:VITE_API_URL = 'http://localhost:5000/api'` とし、別のターミナルで `npm run server` を実行します。
別PCから接続する場合は、独立したAPIの接続先にサーバーPCのアドレスを指定してください。

## 確認用コマンド

実機へ送信せず、SVG・テキスト・RAWデータを `print-preview/` に保存します。
`receipt.svg` で画像入りレシート、`ticket.svg` でテイクアウト、`ticket-eat-in.svg` で店内の番号票を確認できます。
SVGにも実際の印刷と同じ左右余白を表示します。
テキストのプレビューには画像は含まれません。

```powershell
npm run print:preview
```

実機にテスト用レシートと番号票 `T0` を1ジョブ送信します。
注文データと連番は変更しません。

```powershell
npm run print:test
```

自動テストは実機へ印刷せず、一時フォルダと模擬印刷APIで
注文保存、再印刷、同時注文、文字コード、部分送信、エラー処理に加え、
バックアップ・復元・初期化、別プロセスとの競合、書き込み中断の復旧、画面と金額計算を検証します。
Windowsでは存在しないプリンタ名でのエラー通知も確認します。

```powershell
npm test
npm run lint
npm run build
```

## 参考資料

- 手元のセットアップ記録: `C:\Users\yifdt\NECPrinter\SETUP.md`
- 別PCの準備: `C:\Users\yifdt\NECPrinter\OTHER_PC_SETUP.md`
- [NEC MultiCoder 300Sの仕様](https://jpn.nec.com/printer/label/compact/300s/spec.html)
- [Microsoft: RAWデータの印刷API](https://learn.microsoft.com/en-us/windows/win32/printdocs/sending-data-directly-to-a-printer)
- [Koffi: ネイティブ関数の呼び出し](https://koffi.dev/load)
