const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
PORT = process.env.PORT
const conn = require('./conn')
app.use(express.json())
app.use(cors())

const patientRoutes = require('./routes/patient.routes')
const orderRoutes = require('./routes/order.routes')
const testRoutes = require('./routes/test.routes')
const medicalHistoryRoutes = require('./routes/medicalHistory.routes')
const gapAnalysisRoutes = require('./routes/gapAnalysis.routes')
const agentRoutes = require('./routes/agent.routes')
const agentLogsRoutes = require('./routes/agentLogs.routes')

app.use('/patients', patientRoutes)
app.use('/orders', orderRoutes)
app.use('/tests', testRoutes)
app.use('/medical-history', medicalHistoryRoutes)
app.use('/gap-analysis', gapAnalysisRoutes)
app.use('/agent', agentRoutes)
app.use('/agent-logs', agentLogsRoutes)

app.get('/hello', (req, res) => {
    res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`)
})