const db = require("../conn");
const mongoose = require("../conn").mongoose;

const orderSchema = mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true
  },
  tests: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now()
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
});

const Order = mongoose.model('Order', orderSchema)
module.exports = { Order }
