const express = require('express');
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const port = 3000;
const app = express();

// リクエストボディのパース
app.use(express.json());
app.use(cors());
// 別のlocalhostからアクセスできるようにする
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    next();
});

const dbPromise = open({
    filename: './test.db',
    driver: sqlite3.Database
});

(async function initializeDatabase() {
    const db = await dbPromise;

    await db.exec(`CREATE TABLE IF NOT EXISTS list (
        id INTEGER NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
})();

const successMessage = { message: "Operation was successful." };

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/pika', (req, res) => {
    res.send({
        'name': 'ピカチュウ',
        'image_url': 'https://drive.google.com/uc?export=download&id=11dSLmPhN8CyoT74Eq7qgmrmWij6jzlhp'
    });
});

//getの処理をする
app.get('/list', async (req, res) => {
    const db = await dbPromise;
    try {
        const list = await db.all(`SELECT * FROM list WHERE userId = ?`, req.body.userId);
        const pokemons = list.map(m => ({
            id: m.id,
            userId: m.userId,
            date: m.date
        }));
        res.status(200).json({ list: pokemons });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//DELETEの処理をする
app.delete('/list', async (req, res) => {
    console.log("[delete] id :" + req.body.id + " | date :" + req.body.date)
    const db = await dbPromise;
    try {
        db.run(
            "delete from list where id = ? and date = ?",
            req.body.id,
            req.body.date
        );
        res.status(200).send(successMessage);
    }
    catch (error) {
        console.log(error.message)
        res.status(500).json({ message: error.message });
    }
});

//ガチャ(post)の処理をする
app.post('/gacha', async (req, res) => {
    // ガチャ抽選をする
    const num = 14;
    const id = Math.floor(Math.random() * (num + 1))

    // UTC時間を取得する
    let d = new Date();
    const date = d.toUTCString()

    console.log('[post] id :' + id + ' | userId :' + req.body.userId + ' | date :' + date);

    const db = await dbPromise;
    try {
        await db.run(
            `INSERT INTO list(id, userId, date) VALUES (?, ?, ?)`,
            id,
            req.body.userId,
            date
        );
        res.status(200).send(successMessage);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// 10連ガチャ(post)の処理をする
// 【Node.js + Express】リクエストからパラメーターを取得する
// URL:https://www.dailyupblog.com/backend_development/1008/
app.post('/gacha/:ren([0-9]+)', async (req, res) => {

    // UTC時間を取得する
    let d = new Date();
    const date = d.toUTCString()

    const num = 14;
    const ren = req.params.ren;
    // ガチャ抽選をする
    let idList = [];

    for (let i = 0; i < ren; i++) {
        idList.push(Math.floor(Math.random() * (num + 1)))
        console.log('[post] id :' + idList[i] + ' | userId :' + req.body.userId + ' | date :' + date);
    }

    const db = await dbPromise;
    try {

        // トランザクション開始
        db.run('BEGIN TRANSACTION');

        for (let i = 0; i < ren; i++) {
            await db.run(
                `INSERT INTO list(id, userId, date) VALUES (?, ?, ?)`,
                idList[i],
                req.body.userId,
                date
            );
        }

        // トランザクション終了
        db.exec('COMMIT TRANSACTION');

        res.status(200).send(successMessage);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(port, () => {
    console.log(`繋がったよ:http://localhost:${port}`)
});
