// ─── HealHive API Server ───
import express from 'express'
import cors from 'cors'
import authRoutes from './auth.js'
import reportRoutes from './reports.js'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'HealHive API' }))

// Auth routes
app.use('/api', authRoutes)

// Report routes (save/fetch clinical reports)
app.use('/api/reports', reportRoutes)

app.listen(PORT, () => {
    console.log(`🚀 HealHive API running on http://localhost:${PORT}`)
})
