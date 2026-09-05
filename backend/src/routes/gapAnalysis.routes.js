const express = require('express')
const routes = express.Router()

const gapAnalysisController = require('../controllers/gapAnalysis.controller')

routes.get('/order/:orderId', gapAnalysisController.analyzeOrderGaps)
routes.get('/patient/:patientId', gapAnalysisController.analyzePatientGaps)
routes.get('/rules', gapAnalysisController.getRecommendationRules)

module.exports = routes
