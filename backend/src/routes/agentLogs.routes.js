const express = require('express')
const routes = express.Router()

const agentLogsController = require('../controllers/agentLogs.controller')

routes.get('/session/:sessionId', agentLogsController.getLogsBySession)
routes.get('/order/:orderId', agentLogsController.getLogsByOrder)
routes.get('/patient/:patientId', agentLogsController.getLogsByPatient)
routes.get('/session/:sessionId/summary', agentLogsController.getSessionSummary)
routes.get('/recent', agentLogsController.getRecentLogs)
routes.get('/event/:eventType', agentLogsController.getLogsByEventType)
routes.get('/date-range', agentLogsController.getLogsByDateRange)
routes.get('/statistics', agentLogsController.getStatistics)

module.exports = routes
