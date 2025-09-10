const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { runTest } = require('./runner')
const {
    getUserFromToken,
    insertTestRun,
    insertBug,
    getUserStats,
    getHistory,
    getLeaderboard,
    ensureProfileFromUser
} = require('./utils/supabase')

const app = express()
// Allow Authorization header explicitly for CORS preflight
app.use(cors({ origin: true, credentials: false, allowedHeaders: ['Content-Type', 'Authorization'] }))
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
        ).then(async () => {
            sendEvent({ type: 'end', stream: i })
            // если передан токен — запишем факт запуска теста
            try {
                const auth = req.headers['authorization'] || ''
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
                if (token) {
                    const u = await getUserFromToken(token)
                    await ensureProfileFromUser(u)
                    if (u && u.id) {
                        await insertTestRun(u.id, {
                            url: t.url,
                            result: 'finished',
                            errors_count: 0,
                            started_at: new Date().toISOString(),
                            ended_at: new Date().toISOString()
                        })
                    } else {
                        console.warn('Supabase auth: token provided but user not resolved')
                    }
                }
            } catch {}
            finished++
            if (finished === tests.length) res.end()
        }).catch(async e => {
            sendEvent({ type: 'log', text: '❌ Ошибка: ' + (e.stack || e.message), stream: i })
            sendEvent({ type: 'end', stream: i })
            try {
                const auth = req.headers['authorization'] || ''
                const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
                if (token) {
                    const u = await getUserFromToken(token)
                    await ensureProfileFromUser(u)
                    if (u && u.id) {
                        await insertTestRun(u.id, {
                            url: t.url,
                            result: 'failed',
                            errors_count: 1,
                            started_at: new Date().toISOString(),
                            ended_at: new Date().toISOString()
                        })
                    } else {
                        console.warn('Supabase auth (failed): token provided but user not resolved')
                    }
                }
            } catch {}
            finished++
            if (finished === tests.length) res.end()
        })
    })
})

// Quick auth ping to debug Authorization
app.get('/api/auth/ping', async (req, res) => {
    try {
        const auth = req.headers['authorization'] || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        if (!token) return res.status(401).json({ error: 'Unauthorized', hint: 'No Authorization header' })
        const user = await getUserFromToken(token)
        if (!user?.id) return res.status(401).json({ error: 'Unauthorized', hint: 'Token invalid for Supabase' })
        res.json({ ok: true, user: { id: user.id, email: user.email } })
    } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})

// User stats from Supabase
app.get('/api/me/stats', async (req, res) => {
    try {
        const auth = req.headers['authorization'] || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        const user = await getUserFromToken(token)
        if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })
        const stats = await getUserStats(user.id)
        res.json(stats)
    } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})

app.get('/api/me/history', async (req, res) => {
    try {
        const auth = req.headers['authorization'] || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        const user = await getUserFromToken(token)
        if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })
        const data = await getHistory(user.id, 100)
        res.json(data)
    } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})

app.get('/api/leaderboard', async (req, res) => {
    try {
        const data = await getLeaderboard(20)
        res.json(data)
    } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})

// Insert bugs for current user
app.post('/api/me/bugs', async (req, res) => {
    try {
        const auth = req.headers['authorization'] || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        const user = await getUserFromToken(token)
        if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })
        const bugs = Array.isArray(req.body?.bugs) ? req.body.bugs : []
        for (const b of bugs) {
            const title = String(b.title || '').slice(0, 500)
            const url = String(b.url || '').slice(0, 2000)
            if (!title) continue
            await insertBug(user.id, { title, url })
        }
        res.json({ ok: true, inserted: bugs.length })
    } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
    }
})

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Скриншоты доступны по адресу http://localhost:${PORT}/screenshots/`)
})
