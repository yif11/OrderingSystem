const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const receiptline = require('receiptline');
const { exec } = require('child_process');
const logoData = require('./src/logoData.cjs');

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

const itemMapJa = {
    hotCoffee: 'ホットコーヒー',
    icedCoffee: 'アイスコーヒー',
    cafeAuLait: 'カフェオレ(アイス)',
    hotTea: '紅茶(ホット)',
    icedTea: '紅茶(アイス)',
    orangeJuice: 'オレンジジュース',
    appleJuice: 'アップルジュース',
    calpis: 'カルピス',
    greenTea: '緑茶',
    chocolateCroffle: 'クロッフル(チョコ)',
    mapleCroffle: 'クロッフル(メープル)',
    greenTeaCroffle: 'クロッフル(抹茶)',
    strawberryCroffle: 'クロッフル(いちご)',
    plainCroffle: 'クロッフル(プレーン)'
};

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

const generateReceipt = (order, maxOrderId) => {
    // 現在の日付と時刻を取得
    const now = new Date();
    const year = now.getFullYear(); // 年
    const month = ('0' + (now.getMonth() + 1)).slice(-2); // 月 (0始まりなので+1)
    const day = ('0' + now.getDate()).slice(-2); // 日
    const hours = ('0' + now.getHours()).slice(-2); // 時
    const minutes = ('0' + now.getMinutes()).slice(-2); // 分
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = daysOfWeek[now.getDay()]; // 曜日
    const printOrderId = order.isTakeout ? `T${maxOrderId + 1}` : `${maxOrderId + 1}`;

    let quantity = 0;
    let receiptText = `
{width: *,7}
{align: center}
{image:${logoData}}


{width: 3,*,3}
| |豊橋技術科学大学 Jazz研究会 | |
| |${year}/${month}/${day}（${dayOfWeek}）${hours}:${minutes} | |
| |Order #${printOrderId} | |

{width: 3,*,*,5}
    `;

    order.items.forEach(item => {
        quantity += 1;
        receiptText += `| |${itemMapJa[item.item]} | ￥${item.price}| |\n`;
    });

    receiptText += `

{width: 3,*,*,5}
| |^"合計 | ${quantity}点 ￥${order.totalPrice.toLocaleString()}| |
| |お預かり | ￥${order.receivedAmount.toLocaleString()}| |
| |^"お釣り | ^￥${order.change.toLocaleString()}| |

{width:,2,*,2; border:none}
| ||☆ご来店ありがとうございました。☆| |

{code:https://www.instagram.com/tut_jazzken?igsh=OW9vZjVpY24zZmwz; option:qrcode,5,H}
    `;

    return receiptText;
};

const generateOrderId = (order, maxOrderId) => {
    const printOrderId = order.isTakeout ? `T${maxOrderId + 1}` : `${maxOrderId + 1}`;

    let orderId = `
{width: 3,*,3}
| |^^^^^^^"#${printOrderId}| |
    `;

    return orderId;
};

// 注文の追加とレシートの生成 (SVG)
app.post('/add-order', (req, res) => {
    // const { items, totalPrice, receivedAmount, change } = req.body;
    const { items, totalPrice, receivedAmount, change, isTakeout } = req.body;
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
        change,
        isTakeout
    };

    orders.push(newOrder);
    writeOrders(orders);
    writeMaxOrderId(maxOrderId + 1); // 最大IDを更新

    // レシートデータ生成
    const receiptDoc = generateReceipt(newOrder, maxOrderId);
    const orderIdDoc = generateOrderId(newOrder, maxOrderId);

    // SVG出力用設定
    const displaySettings = {
        cpl: 42,
        encoding: 'cp932'
    };

    // レシートをSVGに変換
    const receiptSvg = receiptline.transform(receiptDoc, displaySettings);
    const orderIdSvg = receiptline.transform(orderIdDoc, displaySettings);

    // SVGファイルとして保存
    const receiptSvgFilePath = path.join(__dirname, `receipts/receipt-${newOrder.id}.svg`);
    const orderIdSvgFilePath = path.join(__dirname, `receipts/order_ids/order-id-${newOrder.id}.svg`);

    // SVGファイルに書き込み
    fs.writeFileSync(receiptSvgFilePath, receiptSvg, 'utf8');
    fs.writeFileSync(orderIdSvgFilePath, orderIdSvg, 'utf8');

    // プレビュー用HTMLの作成
    const htmlFilePath = path.join(__dirname, 'preview.html');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Print Preview</title>
        </head>
        <body>
            <div id="content">
                <img id="images" src="file:///${receiptSvgFilePath.replace(/\\/g, '/')}" alt="Receipt" style="width: 100%; height: auto;" />
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };

                window.onafterprint = function() {
                    var imageElement = document.getElementById('images');
                    imageElement.src = "file:///${orderIdSvgFilePath.replace(/\\/g, '/')}";

                    setTimeout(function() {
                        window.print();
                        setTimeout(function() {
                            window.close();
                        }, 100);
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    // HTMLファイルを作成
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');

    const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

    // Chromeをkiosk-printingモードで起動して印刷
    // exec(`"${chromePath}" --kiosk-printing --no-default-browser-check --disable-extensions "file:///${htmlFilePath.replace(/\\/g, '/')}"`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`Error opening Chrome: ${error.message}`);
    //         return;
    //     }
    //     if (stderr) {
    //         console.error(`stderr: ${stderr}`);
    //         return;
    //     }
    //     console.log(`stdout: ${stdout}`);
    // });

    res.status(201).json({ message: 'Order added and receipt generated', svgFile: receiptSvgFilePath });
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