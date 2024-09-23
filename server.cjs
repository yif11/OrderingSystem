const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');  // CORSパッケージをインポート

const app = express();
app.use(express.json());
app.use(cors());  // CORSを有効にする

// プロジェクトのルートディレクトリに保存するパス
const csvFilePath = path.join(__dirname, 'orders.csv');

// 初期CSVファイルが存在しない場合は作成
if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, 'Item,Quantity\n', 'utf8');
}

// 注文内容を受け取り、CSVファイルに追加するエンドポイント
app.post('/save-order', (req, res) => {
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).send('Invalid order data');
    }

    // CSV形式に変換
    const csvRows = items.map(item => `${item.item},${item.quantity}`).join('\n') + '\n';

    // CSVファイルに追記
    fs.appendFile(csvFilePath, csvRows, (err) => {
        if (err) {
            return res.status(500).send('Failed to write to file');
        }
        res.send('Order saved to CSV file');
    });
});

// サーバー起動
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
