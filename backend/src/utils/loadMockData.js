require('dotenv').config();
const { Patient } = require('../models/patient.model');
const { Order } = require('../models/order.model');
const { Test } = require('../models/test.model');
const { MedicalHistory } = require('../models/medicalHistory.model');
const { AgentAuditLog } = require('../models/agentAuditLog.model');
const conn = require('../conn');

async function clearDatabase() {
  try {
    console.log('Clearing database...');

    // Clear all existing data
    await Patient.deleteMany({});
    await Order.deleteMany({});
    await Test.deleteMany({});
    await MedicalHistory.deleteMany({});
    await AgentAuditLog.deleteMany({});

    console.log('Database cleared successfully!');

  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  clearDatabase().then(() => {
    console.log('Database clear complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Database clear failed:', error);
    process.exit(1);
  });
}

module.exports = clearDatabase;
