// const express = require('express');
// const fs = require('fs');
// const path = require('path');
// const cors = require('cors');  // CORSパッケージをインポート

// const app = express();
// app.use(express.json());
// app.use(cors());  // CORSを有効にする

// // プロジェクトのルートディレクトリに保存するパス
// const csvFilePath = path.join(__dirname, 'orders.csv');

// // 初期CSVファイルが存在しない場合は作成
// if (!fs.existsSync(csvFilePath)) {
//     fs.writeFileSync(csvFilePath, 'Item,Quantity\n', 'utf8');
// }

// // 注文内容を受け取り、CSVファイルに追加するエンドポイント
// app.post('/save-order', (req, res) => {
//     const { items } = req.body;

//     if (!items || items.length === 0) {
//         return res.status(400).send('Invalid order data');
//     }

//     // CSV形式に変換
//     const csvRows = items.map(item => `${item.item},${item.quantity}`).join('\n') + '\n';

//     // CSVファイルに追記
//     fs.appendFile(csvFilePath, csvRows, (err) => {
//         if (err) {
//             return res.status(500).send('Failed to write to file');
//         }
//         res.send('Order saved to CSV file');
//     });
// });

// // サーバー起動
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const ordersFilePath = path.join(__dirname, 'orders.json');
const servedOrdersFilePath = path.join(__dirname, 'served-orders.json');

// ファイルが存在しない場合は空の配列で初期化
if (!fs.existsSync(ordersFilePath)) fs.writeFileSync(ordersFilePath, '[]', 'utf8');
if (!fs.existsSync(servedOrdersFilePath)) fs.writeFileSync(servedOrdersFilePath, '[]', 'utf8');

const readOrders = () => JSON.parse(fs.readFileSync(ordersFilePath, 'utf8'));
const writeOrders = (orders) => fs.writeFileSync(ordersFilePath, JSON.stringify(orders), 'utf8');
const readServedOrders = () => JSON.parse(fs.readFileSync(servedOrdersFilePath, 'utf8'));
const writeServedOrders = (orders) => fs.writeFileSync(servedOrdersFilePath, JSON.stringify(orders), 'utf8');

const maxOrderIdPath = path.join(__dirname, 'maxOrderId.txt');

// maxOrderIdが保存されていない場合、1から始める
if (!fs.existsSync(maxOrderIdPath)) {
    fs.writeFileSync(maxOrderIdPath, '0', 'utf8');
}

const readMaxOrderId = () => parseInt(fs.readFileSync(maxOrderIdPath, 'utf8'), 10);
const writeMaxOrderId = (id) => fs.writeFileSync(maxOrderIdPath, id.toString(), 'utf8');


// 注文の取得
app.get('/orders', (req, res) => {
    const orders = readOrders();
    res.json(orders);
});

// 提供済み注文の取得
app.get('/served-orders', (req, res) => {
    const servedOrders = readServedOrders();
    res.json(servedOrders);
});

// 注文の追加
// app.post('/add-order', (req, res) => {
//     const { items } = req.body;
//     const orders = readOrders();
//     const newOrder = { id: orders.length ? orders[orders.length - 1].id + 1 : 1, items };
//     orders.push(newOrder);
//     writeOrders(orders);
//     res.status(201).send('Order added');
// });
app.post('/add-order', (req, res) => {
    const { items } = req.body;
    const orders = readOrders();
    let maxOrderId = readMaxOrderId(); // 最大の注文IDを取得
    const newOrder = { id: maxOrderId + 1, items }; // 新しい注文に一意のIDを付与
    orders.push(newOrder);
    writeOrders(orders);
    writeMaxOrderId(maxOrderId + 1); // 最大IDを更新
    res.status(201).send('Order added');
});

// 注文アイテムを提供済みにマーク
app.post('/mark-served', (req, res) => {
    const { orderId, itemIndex } = req.body;
    let orders = readOrders();
    let servedOrders = readServedOrders();

    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.items[itemIndex].served = true;
        if (order.items.every(item => item.served)) {
            servedOrders.push(order);
            orders = orders.filter(o => o.id !== orderId);
        }
        writeOrders(orders);
        writeServedOrders(servedOrders);
        res.send('Order marked as served');
    } else {
        res.status(404).send('Order not found');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
