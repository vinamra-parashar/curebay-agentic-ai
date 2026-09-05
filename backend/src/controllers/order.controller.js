const { Order } = require('../models/order.model')

async function getOrderById(req, res) {
  try {
    const order = await Order.findOne({ orderId: req.params.id })
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function getAllOrders(req, res) {
  try {
    const orders = await Order.find({})
    res.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function createOrder(req, res) {
  try {
    const order = new Order(req.body)
    await order.save()
    res.status(201).json({ message: 'Order created successfully', order })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function updateOrder(req, res) {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      req.body,
      { new: true }
    )
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Order updated successfully', order })
  } catch (error) {
    console.error('Error updating order:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

async function addTestToOrder(req, res) {
  try {
    const { testName } = req.body
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { $push: { tests: testName } },
      { new: true }
    )
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Test added to order successfully', order })
  } catch (error) {
    console.error('Error adding test to order:', error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = {
  getOrderById,
  getAllOrders,
  createOrder,
  updateOrder,
  addTestToOrder
}
