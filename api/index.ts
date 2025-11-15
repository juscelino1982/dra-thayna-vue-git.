import type { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import cors from 'cors'

// Import routes
import patientsRouter from '../server/routes/patients'
import consultationsRouter from '../server/routes/consultations'
import reportsRouter from '../server/routes/reports'
import examsRouter from '../server/routes/exams'

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any)
}
