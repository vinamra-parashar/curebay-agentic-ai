const express = require('express')
const routes = express.Router()

const patientController = require('../controllers/patient.controller')

routes.get('/', patientController.getAllPatients)
routes.get('/:id', patientController.getPatientById)
routes.post('/', patientController.createPatient)

module.exports = routes
