const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const receiptline = require('receiptline');

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

const generateReceipt = (order) => {
    // 現在の日付と時刻を取得
    const now = new Date();
    const year = now.getFullYear(); // 年
    const month = ('0' + (now.getMonth() + 1)).slice(-2); // 月 (0始まりなので+1)
    const day = ('0' + now.getDate()).slice(-2); // 日
    const hours = ('0' + now.getHours()).slice(-2); // 時
    const minutes = ('0' + now.getMinutes()).slice(-2); // 分
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = daysOfWeek[now.getDay()]; // 曜日

    let quantity = 0;
    let receiptText = `
{width: *,7}
{align: center}
|  ^^^^  Jazz喫茶 | |


{width: 3,*,3}
| |豊橋技術科学大学 Jazz研究会 | |
| |${year}/${month}/${day}（${dayOfWeek}）${hours}:${minutes} | |
| |Order #${order.id} | |

{width: 3,*,*,5}
    `;

    order.items.forEach(item => {
        const price = item.price * item.quantity;
        quantity += item.quantity;
        receiptText += `| |${item.item} x${item.quantity} | ￥${price}| |\n`;
    });

    receiptText += `

{width: 3,*,*,5}
| |^"合計 | ${quantity}点 ￥${order.totalPrice.toLocaleString()}| |
| |お預かり | ￥${order.receivedAmount.toLocaleString()}| |
| |^"お釣り | ^￥${order.change.toLocaleString()}| |

{width:,2,*,2; border:none}
| ||☆ご来店ありがとうございました。☆| |

{code:https://www.instagram.com/tut_jazzken?igsh=OW9vZjVpY24zZmwz; option:qrcode,5,H}

-

{width: 3,*,3}
| |^^^^"#${order.id}| |
    `;

    return receiptText;
};

const generateOrderId = (order) => {
    let orderId = `
{width: 3,*,3}
| |^^^^"#${order.id}| |
    `;

    return orderId;
};

// 注文の追加とレシートの生成 (SVG)
app.post('/add-order', (req, res) => {
    const { items, totalPrice, receivedAmount, change } = req.body;
    const orders = readOrders();
    let maxOrderId = readMaxOrderId(); // 最大の注文IDを取得

    const newOrder = {
        id: maxOrderId + 1,
        items: items.map(item => ({
            item: item.item,
            quantity: item.quantity,
            price: item.price // 単価を追加
        })),
        totalPrice,
        receivedAmount,
        change
    };

    orders.push(newOrder);
    writeOrders(orders);
    writeMaxOrderId(maxOrderId + 1); // 最大IDを更新

    // レシートデータ生成
    const receiptDoc = generateReceipt(newOrder);

    // SVG出力用設定
    const displaySettings = {
        cpl: 42,
        encoding: 'cp932'
    };

    // レシートをSVGに変換
    const svg = receiptline.transform(receiptDoc, displaySettings);

    // SVGファイルとして保存
    const svgFilePath = path.join(__dirname, `receipt-${newOrder.id}.svg`);

    // SVGファイルに書き込み
    // fs.writeFileSync('receipt.svg', svg, 'utf8');
    fs.writeFileSync(svgFilePath, svg, 'utf8');

    res.status(201).json({ message: 'Order added and receipt generated', svgFile: svgFilePath });
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