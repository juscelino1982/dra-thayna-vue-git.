import type { VercelRequest, VercelResponse } from '@vercel/node'
import express, { type Request, type Response } from 'express'
import cors from 'cors'

// Import routes
import patientsRouter from '../server/routes/patients.js'
import consultationsRouter from '../server/routes/consultations.js'
import reportsRouter from '../server/routes/reports.js'
import examsRouter from '../server/routes/exams.js'
import dashboardRouter from '../server/routes/dashboard.js'

const app = express()

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Routes
app.use('/api/patients', patientsRouter)
app.use('/api/consultations', consultationsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/exams', examsRouter)
app.use('/api/dashboard', dashboardRouter)

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  })
})

// Root endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'Dra. Thayná API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
      patients: '/api/patients',
      consultations: '/api/consultations',
      reports: '/api/reports',
      exams: '/api/exams',
      dashboard: '/api/dashboard'
    }
  })
})

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('API Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any)
}
