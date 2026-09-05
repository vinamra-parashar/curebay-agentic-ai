const db = require("../conn");
const mongoose = require("../conn").mongoose;

const medicalHistorySchema = mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  conditions: [{
    type: String
  }],
  allergies: [{
    type: String
  }],
  medications: [{
    type: String
  }],
  previousTests: [{
    testName: String,
    date: Date,
    result: String
  }],
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
});

const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema)
module.exports = { MedicalHistory }
