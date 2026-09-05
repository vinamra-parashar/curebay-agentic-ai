const { Patient } = require('../models/patient.model');
const { MedicalHistory } = require('../models/medicalHistory.model');
const { Order } = require('../models/order.model');
const { Test } = require('../models/test.model');

class PatientTools {
  async getPatientProfile(patientId) {
    try {
      const patient = await Patient.findOne({ patientId });
      if (!patient) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }
      return {
        success: true,
        data: patient,
        message: 'Patient profile retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve patient profile'
      };
    }
  }

  async getMedicalHistory(patientId) {
    try {
      const history = await MedicalHistory.findOne({ patientId });
      if (!history) {
        throw new Error(`Medical history for patient ${patientId} not found`);
      }
      return {
        success: true,
        data: history,
        message: 'Medical history retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve medical history'
      };
    }
  }

  async getCurrentOrder(orderId) {
    try {
      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      return {
        success: true,
        data: order,
        message: 'Order retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve order'
      };
    }
  }

  async getAvailableTests() {
    try {
      const tests = await Test.find({});
      return {
        success: true,
        data: tests,
        message: 'Available tests retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve available tests'
      };
    }
  }

  async updateOrder(orderId, updates) {
    try {
      const order = await Order.findOneAndUpdate(
        { orderId },
        updates,
        { new: true }
      );
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      return {
        success: true,
        data: order,
        message: 'Order updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update order'
      };
    }
  }

  async addTestToOrder(orderId, testName) {
    try {
      const order = await Order.findOneAndUpdate(
        { orderId },
        { $push: { tests: testName } },
        { new: true }
      );
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      return {
        success: true,
        data: order,
        message: 'Test added to order successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to add test to order'
      };
    }
  }
}

module.exports = new PatientTools();
