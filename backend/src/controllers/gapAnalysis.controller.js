const gapAnalysisService = require('../services/gapAnalysis.service');
const { Patient } = require('../models/patient.model');
const { Order } = require('../models/order.model');
const { MedicalHistory } = require('../models/medicalHistory.model');

async function analyzeOrderGaps(req, res) {
  try {
    const { orderId } = req.params;

    // Get order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get patient
    const patient = await Patient.findOne({ patientId: order.patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Get medical history
    const medicalHistory = await MedicalHistory.findOne({ patientId: order.patientId });

    // Perform gap analysis
    const gaps = gapAnalysisService.analyzeGaps(patient, order, medicalHistory);
    const explanation = gapAnalysisService.getRecommendationExplanation(gaps, patient);

    res.json({
      orderId,
      patientId: order.patientId,
      currentTests: order.tests,
      recommendedGaps: gaps,
      explanation,
      hasRecommendations: gaps.length > 0
    });
  } catch (error) {
    console.error('Error analyzing order gaps:', error);
    res.status(500).json({ message: 'Something went wrong during gap analysis' });
  }
}

async function analyzePatientGaps(req, res) {
  try {
    const { patientId } = req.params;

    // Get patient
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Get medical history
    const medicalHistory = await MedicalHistory.findOne({ patientId });

    // Get all orders for this patient
    const orders = await Order.find({ patientId });

    // Analyze gaps for each order
    const orderAnalyses = [];
    for (const order of orders) {
      const gaps = gapAnalysisService.analyzeGaps(patient, order, medicalHistory);
      const explanation = gapAnalysisService.getRecommendationExplanation(gaps, patient);

      orderAnalyses.push({
        orderId: order.orderId,
        currentTests: order.tests,
        status: order.status,
        recommendedGaps: gaps,
        explanation,
        hasRecommendations: gaps.length > 0
      });
    }

    res.json({
      patientId,
      patientName: patient.name,
      totalOrders: orders.length,
      orderAnalyses
    });
  } catch (error) {
    console.error('Error analyzing patient gaps:', error);
    res.status(500).json({ message: 'Something went wrong during gap analysis' });
  }
}

async function getRecommendationRules(req, res) {
  try {
    const rules = gapAnalysisService.recommendationRules;
    res.json({
      totalRules: rules.length,
      rules
    });
  } catch (error) {
    console.error('Error fetching recommendation rules:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = {
  analyzeOrderGaps,
  analyzePatientGaps,
  getRecommendationRules
};
