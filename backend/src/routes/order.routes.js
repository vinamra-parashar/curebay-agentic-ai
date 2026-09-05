const express = require('express')
const routes = express.Router()

const orderController = require('../controllers/order.controller')

routes.get('/', orderController.getAllOrders)
routes.get('/:id', orderController.getOrderById)
routes.post('/', orderController.createOrder)
routes.put('/:id', orderController.updateOrder)
routes.post('/:id/add-test', orderController.addTestToOrder)

module.exports = routes
