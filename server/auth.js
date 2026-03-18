// ─── Auth Routes ───
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'healhive_secret_key_change_in_prod'
const JWT_EXPIRES = '7d'

// ─── POST /api/login ───
router.post('/login', (req, res) => {
    const { email, password, role } = req.body

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, error: 'Email, password and role are required.' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, role)

    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials or wrong role selected.' })
    }

    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) {
        return res.status(401).json({ success: false, error: 'Incorrect password.' })
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })

    res.json({ success: true, token, user: payload })
})

// ─── POST /api/register ───
router.post('/register', (req, res) => {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, error: 'All fields are required.' })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' })
    }

    const hash = bcrypt.hashSync(password, 10)
    const result = db.prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, role)

    const user = { id: result.lastInsertRowid, name, email, role }
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES })

    res.status(201).json({ success: true, token, user })
})

// ─── GET /api/me ───
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided.' })
    }

    try {
        const token = authHeader.slice(7)
        const user = jwt.verify(token, JWT_SECRET)
        // Return only safe fields
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token.' })
    }
})

export default router
