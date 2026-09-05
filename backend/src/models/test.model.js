const db = require("../conn");
const mongoose = require("../conn").mongoose;

const testSchema = mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true
  },
  testName: {
    type: String,
    required: true
  },
  category: {
    type: String
  },
  description: {
    type: String
  },
  price: {
    type: Number
  },
  relevantConditions: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now()
  },
});

const Test = mongoose.model('Test', testSchema)
module.exports = { Test }
