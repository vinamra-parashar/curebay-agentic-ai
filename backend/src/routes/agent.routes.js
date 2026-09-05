const express = require('express')
const routes = express.Router()

const agentController = require('../controllers/agent.controller')

routes.post('/analyze/:orderId', agentController.analyzeOrderWithAgent)
routes.post('/confirm/initiate/:orderId', agentController.initiateConfirmation)
routes.post('/confirm/:sessionId', agentController.processPatientConfirmation)
routes.get('/confirm/:sessionId/status', agentController.getSessionStatus)
routes.get('/status', agentController.getAgentStatus)

module.exports = routes
