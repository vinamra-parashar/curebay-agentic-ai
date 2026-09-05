const express = require('express')
const routes = express.Router()

const testController = require('../controllers/test.controller')

routes.get('/', testController.getAllTests)
routes.get('/:id', testController.getTestById)
routes.post('/', testController.createTest)

module.exports = routes
