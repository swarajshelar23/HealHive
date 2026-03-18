// ─── Assessment Report Routes ───
// Stores clinical reports from chatbot sessions, accessible only to therapists

import { Router } from 'express'
import jwt from 'jsonwebtoken'
import db from './db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'healhive_secret_key_change_in_prod'

// ─── Middleware: verify JWT ───
function verifyToken(req, res, next) {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET)
        next()
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }
}

// ─── POST /api/reports ───
// Called by the chatbot (no auth required — chatbot is anonymous)
// Saves a new assessment report with both user-facing message & therapist report
router.post('/', (req, res) => {
    const { sessionId, userMessage, therapistReport, toolUsed, score, severity } = req.body

    if (!sessionId || !userMessage || !therapistReport) {
        return res.status(400).json({ success: false, error: 'sessionId, userMessage, and therapistReport are required.' })
    }

    const result = db.prepare(`
        INSERT INTO assessment_reports (session_id, user_message, therapist_report, tool_used, score, severity)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, userMessage, therapistReport, toolUsed || null, score || null, severity || null)

    res.status(201).json({ success: true, reportId: result.lastInsertRowid })
})

// ─── GET /api/reports ───
// Therapists and admins only
router.get('/', verifyToken, (req, res) => {
    if (!['therapist', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Access restricted to therapists and admins.' })
    }

    const reports = db.prepare(`
        SELECT id, session_id, user_message, therapist_report, tool_used, score, severity, created_at
        FROM assessment_reports
        ORDER BY created_at DESC
        LIMIT 100
    `).all()

    res.json({ success: true, reports })
})

// ─── GET /api/reports/:id ───
// Individual report — therapists and admins only
router.get('/:id', verifyToken, (req, res) => {
    if (!['therapist', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Access restricted to therapists and admins.' })
    }

    const report = db.prepare('SELECT * FROM assessment_reports WHERE id = ?').get(req.params.id)
    if (!report) return res.status(404).json({ success: false, error: 'Report not found.' })

    res.json({ success: true, report })
})

export default router
