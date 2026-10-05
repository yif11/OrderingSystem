# 注文管理システム

React / TypeScript の注文・提供画面と、Node.js / Express の注文APIです。
注文を登録すると、Node.jsからNEC MultiCoder 300S2DCのWindows印刷キューへ
日本語レシートと注文番号票を直接送信します。

## 起動

プリンタを接続したWindows PCで、Node.jsとNECのWindowsプリンタドライバを用意します。
このPCの登録名は `NEC MultiCoder 300S2DC`、用紙は58 mmです。
本体の「エラー復帰」は、セットアップ資料どおり「自動」に設定します。

```powershell
npm install
npm run server
```

別のターミナルで画面を起動します。

```powershell
npm run dev
```

画面に表示されたViteのURLを開きます。注文APIの既定ポートは5000です。
注文データと連番は `order_logs/` に保存され、初回起動時にフォルダが作成されます。

プリンタの登録名が異なる場合は、サーバーを起動する前に設定します。

```powershell
$env:PRINTER_NAME = 'NEC MultiCoder 300S2DC'
npm run server
```

印刷処理のための外部EXE、Python、PowerShellの起動や管理者権限の要求はありません。
ブラウザから注文APIを呼び、プリンタを接続したWindows上のNode.jsが印刷します。

## 印刷内容

- レシート: 注文番号、店内／テイクアウト、注文時刻、商品名、数量、単価、割引、合計、お預かり、お釣り。
- 注文番号票: 大きな注文番号と受け取り案内。テイクアウトは提供画面と同じ `T` 接頭辞。
- 58 mm用紙向けの32桁レイアウト、Shift-JIS、ESC/POSコマンドで出力し、レシートと番号票をそれぞれパーシャルカット。
- 商品名は画面と印刷で `shared/item-names.json` を共有。

`printing/order-printer.cjs` がReceiptLineで印刷データを生成し、
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

## 確認用コマンド

実機へ送信せず、SVG・テキスト・RAWデータを `print-preview/` に保存します。

```powershell
npm run print:preview
```

実機にテスト用レシートと番号票 `T0` を1ジョブ送信します。
注文データと連番は変更しません。

```powershell
npm run print:test
```

自動テストは実機へ印刷せず、一時フォルダと模擬印刷APIで
注文保存、再印刷、同時注文、文字コード、部分送信、エラー処理を検証します。
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
