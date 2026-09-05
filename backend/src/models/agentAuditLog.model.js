const db = require("../conn");
const mongoose = require("../conn").mongoose;

const agentAuditLogSchema = mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  patientId: {
    type: String,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['analysis_started', 'recommendation_generated', 'confirmation_initiated', 'patient_response', 'order_updated', 'order_unchanged', 'error_occurred']
  },
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  recommendations: [{
    recommendedTest: String,
    reason: String,
    priority: String,
    triggerTest: String
  }],
  patientResponse: {
    type: String
  },
  actionTaken: {
    type: String
  },
  previousOrderState: {
    type: mongoose.Schema.Types.Mixed
  },
  newOrderState: {
    type: mongoose.Schema.Types.Mixed
  },
  aiAnalysis: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const AgentAuditLog = mongoose.model('AgentAuditLog', agentAuditLogSchema)
module.exports = { AgentAuditLog }
