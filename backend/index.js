const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { runTest } = require('./runner')

const app = express()
app.use(cors())
app.use(express.json())


app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')))

// Utility: count files recursively in screenshots dir
function countImageFiles(dir) {
    let count = 0;
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const it of items) {
            const p = path.join(dir, it.name);
            if (it.isDirectory()) count += countImageFiles(p);
            else if (/\.(png|jpg|jpeg)$/i.test(it.name)) count++;
        }
    } catch (e) {}
    return count;
}

// GET screenshots count
app.get('/api/screenshots/count', (req, res) => {
    const dir = path.join(__dirname, 'screenshots');
    try {
        const count = countImageFiles(dir);
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

// DELETE all screenshots (recreate folder)
app.delete('/api/screenshots', (req, res) => {
    const dir = path.join(__dirname, 'screenshots');
    try {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

app.post('/api/run-multi-test', async (req, res) => {
    let { tests } = req.body
    if (!Array.isArray(tests) || !tests.length || tests.length > 10) {
        res.status(400).json({ error: 'Передайте от 1 до 10 тестов в массиве "tests"' })
        return
    }

    res.writeHead(200, {
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
    })

    function sendEvent(data) {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    let finished = 0
    tests.forEach((t, i) => {
        runTest(
            t.url,
            (text) => sendEvent({ type: 'log', text, stream: i }),
            t.flow || 'basic',
            t.country || '',
            t.custom || {},
            t.browser || 'chromium',
            t.device || '',
            t.ninja,
            t.version || 'stable',
            (perfData) => sendEvent({ type: 'perf', ...perfData, stream: i }),
            (text) => sendEvent({ type: 'testInfo', text, stream: i })
        ).then(() => {
            sendEvent({ type: 'end', stream: i })
            finished++
            if (finished === tests.length) res.end()
        }).catch(e => {
            sendEvent({ type: 'log', text: '❌ Ошибка: ' + (e.stack || e.message), stream: i })
            sendEvent({ type: 'end', stream: i })
            finished++
            if (finished === tests.length) res.end()
        })
    })
})

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Скриншоты доступны по адресу http://localhost:${PORT}/screenshots/`)
})
