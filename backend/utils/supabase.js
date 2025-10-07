const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')

// Lightweight .env loader fallback (no dotenv dependency)
function loadEnvFallback() {
  const envPath = path.join(__dirname, '..', '..', '.env')
  if (!fs.existsSync(envPath)) return
  try {
    const txt = fs.readFileSync(envPath, 'utf8')
    txt.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) return
      const k = m[1]
      let v = m[2]
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1)
      if (!(k in process.env)) process.env[k] = v
    })
  } catch {}
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE || !process.env.SUPABASE_ANON_KEY) {
  loadEnvFallback()
}

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

function rest(pathname) {
  return `${SUPABASE_URL}/rest/v1${pathname}`
}

async function getUserFromToken(accessToken) {
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL not set')
  if (!accessToken) return null
  const url = `${SUPABASE_URL}/auth/v1/user`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE
    }
  })
  if (!res.ok) return null
  const json = await res.json()
  return json || null
}

async function insertTestRun(userId, payload) {
  const url = rest('/test_runs')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
    },
    body: JSON.stringify([{ user_id: userId, ...payload }])
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Supabase insertTestRun failed: ${res.status} ${t}`)
  }
  try {
    await trimTestRuns(userId, 100)
  } catch {}
}

async function trimTestRuns(userId, keep = 100) {
  if (!userId || keep < 0) return
  const offset = Math.max(keep, 0)
  try {
    const listUrl = rest(`/test_runs?user_id=eq.${encodeURIComponent(userId)}&select=id&order=ended_at.desc.nullslast&order=created_at.desc.nullslast&offset=${offset}&limit=1000`)
    const res = await fetch(listUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
      }
    })
    if (!res.ok) return
    const rows = await res.json().catch(() => [])
    if (!Array.isArray(rows) || !rows.length) return
    const ids = rows.map(r => r.id).filter(Boolean)
    if (!ids.length) return
    const chunkSize = 100
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const filter = `in.(${chunk.map(id => `"${id}"`).join(',')})`
      const deleteUrl = rest(`/test_runs?id=${encodeURIComponent(filter)}&user_id=eq.${encodeURIComponent(userId)}`)
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          Prefer: 'return=minimal'
        }
      })
    }
  } catch {}
}

async function ensureProfileFromUser(user) {
  try {
    if (!user?.id) return
    const fullName = user.user_metadata?.full_name || user.email || 'User'
    const role = user.user_metadata?.role || 'QA'
    const url = rest('/profiles')
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([{ id: user.id, full_name: fullName, role }])
    })
    // ignore non-2xx silently
  } catch {}
}

async function insertBug(userId, payload) {
  const url = rest('/bugs')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`
    },
    body: JSON.stringify([{ user_id: userId, ...payload }])
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Supabase insertBug failed: ${res.status} ${t}`)
  }
}

async function getUserStats(userId) {
  try {
    // Prefer RPC if available
    const rpc = `${SUPABASE_URL}/rest/v1/rpc/count_user_tests`
    const rpcRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
      body: JSON.stringify({ uid: userId })
    })
    if (rpcRes.ok) {
      const n = await rpcRes.json();
      return { totalTests: Number(n) || 0 }
    }
  } catch {}

  // Fallback: GET with count via Content-Range
  try {
    const url = rest(`/test_runs?user_id=eq.${encodeURIComponent(userId)}&select=id`)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: 'count=exact'
      }
    })
    if (res.ok) {
      const cr = res.headers.get('content-range') || ''
      const m = cr.match(/\*\/(\d+)/)
      if (m) return { totalTests: Number(m[1]) || 0 }
      // fallback: count array length if small
      const arr = await res.json().catch(() => [])
      if (Array.isArray(arr)) return { totalTests: arr.length }
    }
  } catch {}

  return { totalTests: 0 }
}

async function getHistory(userId, limit = 50) {
  const url = rest(`/test_runs?user_id=eq.${encodeURIComponent(userId)}&order=ended_at.desc&limit=${limit}`)
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
  const runs = res.ok ? await res.json() : []
  const bugsRes = await fetch(rest(`/bugs?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`), { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } })
  const bugs = bugsRes.ok ? await bugsRes.json() : []
  return { runs, bugs }
}

async function getLeaderboard(limit = 20) {
  // Preferred: RPC if exists
  try {
    const rpc = `${SUPABASE_URL}/rest/v1/rpc/leaderboard`;
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
      body: JSON.stringify({ lim: limit })
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length) return data
    }
  } catch {}

  // Fallback: aggregate on the Node side
  try {
    const res = await fetch(rest(`/test_runs?select=user_id`), {
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` }
    })
    if (!res.ok) return []
    const rows = await res.json()
    const map = new Map()
    for (const r of rows) {
      const id = r.user_id
      map.set(id, (map.get(id) || 0) + 1)
    }
    // try fetch profiles for names
    const profileRes = await fetch(rest(`/profiles?select=id,full_name`), {
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` }
    })
    const profiles = profileRes.ok ? await profileRes.json() : []
    const nameById = new Map(profiles.map(p => [p.id, p.full_name]))
    let items = Array.from(map.entries()).map(([user_id, tests_count]) => ({
      user_id,
      tests_count,
      full_name: nameById.get(user_id) || null
    }))
    // Fetch emails for users without profile names using Auth admin API
    const needEmail = items.filter(it => !it.full_name).map(it => it.user_id)
    const emails = {}
    await Promise.all(needEmail.map(async (uid) => {
      try {
        const ures = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
          headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` }
        })
        if (ures.ok) {
          const u = await ures.json()
          emails[uid] = u.email
        }
      } catch {}
    }))
    items = items.map(it => ({ ...it, email: emails[it.user_id] || null }))
    items.sort((a,b) => b.tests_count - a.tests_count)
    return items.slice(0, limit)
  } catch {
    return []
  }
}

module.exports = { getUserFromToken, insertTestRun, insertBug, getUserStats, getHistory, getLeaderboard, ensureProfileFromUser }
