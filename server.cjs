const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(cors());

const ordersFilePath = path.join(__dirname, 'order_logs/orders.json');
const servedOrdersFilePath = path.join(__dirname, 'order_logs/served-orders.json');

// ファイルが存在しない場合は空の配列で初期化
if (!fs.existsSync(ordersFilePath)) fs.writeFileSync(ordersFilePath, '[]', 'utf8');
if (!fs.existsSync(servedOrdersFilePath)) fs.writeFileSync(servedOrdersFilePath, '[]', 'utf8');

const readOrders = () => JSON.parse(fs.readFileSync(ordersFilePath, 'utf8'));
const writeOrders = (orders) => fs.writeFileSync(ordersFilePath, JSON.stringify(orders), 'utf8');
const readServedOrders = () => JSON.parse(fs.readFileSync(servedOrdersFilePath, 'utf8'));
const writeServedOrders = (orders) => fs.writeFileSync(servedOrdersFilePath, JSON.stringify(orders), 'utf8');

const maxOrderIdPath = path.join(__dirname, 'order_logs/max-order-id.txt');

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

// 注文の追加とレシートの生成
app.post('/add-order', (req, res) => {
    const { items, totalPrice, receivedAmount, change, isTakeout } = req.body;
    const orders = readOrders();
    let maxOrderId = readMaxOrderId();

    const newOrder = {
        id: maxOrderId + 1,
        items: items.map(item => ({
            item: item.item,
            quantity: item.quantity,
            price: item.price
        })),
        totalPrice,
        receivedAmount,
        change,
        isTakeout
    };

    orders.push(newOrder);
    writeOrders(orders);
    writeMaxOrderId(maxOrderId + 1);

    const exePath = "./src/assets/printReceipt.exe";

    ordersJSON = JSON.stringify(newOrder);
    console.log(ordersJSON);

    // JSONを一時ファイルに保存
    const tempJsonFile = path.join(__dirname, 'order_logs/tmp-order.json');
    fs.writeFileSync(tempJsonFile, JSON.stringify(newOrder, null, 2));

    const command = `powershell -Command "& { Start-Process -FilePath '${exePath}' -ArgumentList '${tempJsonFile}' -Verb RunAs }"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing file: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    res.status(201).json({ message: 'Order added and receipt generated' });
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