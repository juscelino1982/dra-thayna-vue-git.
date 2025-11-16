import type { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import cors from 'cors'

// Import routes
import patientsRouter from '../server/routes/patients.js'
import consultationsRouter from '../server/routes/consultations.js'
import reportsRouter from '../server/routes/reports.js'
import examsRouter from '../server/routes/exams.js'
import dashboardRouter from '../server/routes/dashboard.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/patients', patientsRouter)
app.use('/api/consultations', consultationsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/exams', examsRouter)
app.use('/api/dashboard', dashboardRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any)
}
