const express = require('express')
const routes = express.Router()

const medicalHistoryController = require('../controllers/medicalHistory.controller')

routes.get('/:id', medicalHistoryController.getMedicalHistoryByPatientId)
routes.post('/', medicalHistoryController.createMedicalHistory)
routes.put('/:id', medicalHistoryController.updateMedicalHistory)

module.exports = routes
