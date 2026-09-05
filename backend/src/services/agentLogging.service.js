const { AgentAuditLog } = require('../models/agentAuditLog.model');

class AgentLoggingService {
  constructor() {
    this.eventTypes = {
      ANALYSIS_STARTED: 'analysis_started',
      RECOMMENDATION_GENERATED: 'recommendation_generated',
      CONFIRMATION_INITIATED: 'confirmation_initiated',
      PATIENT_RESPONSE: 'patient_response',
      ORDER_UPDATED: 'order_updated',
      ORDER_UNCHANGED: 'order_unchanged',
      ERROR_OCCURRED: 'error_occurred'
    };
  }

  async logEvent(sessionId, orderId, patientId, eventType, eventData = {}, additionalData = {}) {
    try {
      const logEntry = new AgentAuditLog({
        sessionId,
        orderId,
        patientId,
        eventType,
        eventData,
        ...additionalData,
        timestamp: new Date()
      });

      await logEntry.save();
      
      return {
        success: true,
        logId: logEntry._id,
        message: 'Event logged successfully'
      };
    } catch (error) {
      console.error('Error logging event:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to log event'
      };
    }
  }

  async logAnalysisStarted(sessionId, orderId, patientId, analysisData) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.ANALYSIS_STARTED,
      {
        analysisTrigger: 'order_analysis',
        timestamp: new Date()
      },
      {
        metadata: analysisData
      }
    );
  }

  async logRecommendationGenerated(sessionId, orderId, patientId, recommendations, patientData, orderData) {
    // Serialise the merged recommendation shape for audit purposes
    const recommendationSummary = recommendations.map(rec => ({
      recommendedTest: rec.recommendedTest,
      priority: rec.priority,
      // Handle both old reason (string) and new reasons (array) shapes safely
      reasons: rec.reasons || (rec.reason ? [rec.reason] : [])
    }));

    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.RECOMMENDATION_GENERATED,
      {
        recommendationsCount: recommendations.length,
        hasRecommendations: recommendations.length > 0,
        patientCondition: patientData.condition,
        patientId,
        orderId,
        currentTests: orderData.tests,
        recommendedTests: recommendationSummary.map(r => r.recommendedTest),
        priorities: recommendationSummary.map(r => r.priority)
      },
      {
        recommendations: recommendationSummary,
        previousOrderState: orderData
      }
    );
  }

  async logConfirmationInitiated(sessionId, orderId, patientId, recommendations, confirmationMessage) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.CONFIRMATION_INITIATED,
      {
        recommendationsCount: recommendations.length,
        confirmationMessageSent: true
      },
      {
        recommendations,
        eventData: {
          confirmationMessage
        }
      }
    );
  }

  async logPatientResponse(sessionId, orderId, patientId, patientResponse, selectedTest = null) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.PATIENT_RESPONSE,
      {
        patientResponse,
        responseTimestamp: new Date()
      },
      {
        actionTaken: selectedTest ? `selected_${selectedTest}` : 'declined_all',
        eventData: {
          selectedTest,
          patientResponse
        }
      }
    );
  }

  async logOrderUpdated(sessionId, orderId, patientId, previousState, newState, testAdded) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.ORDER_UPDATED,
      {
        testAdded,
        previousTestCount: previousState.tests.length,
        newTestCount: newState.tests.length,
        updateTimestamp: new Date()
      },
      {
        previousOrderState: previousState,
        newOrderState: newState,
        actionTaken: 'test_added_to_order'
      }
    );
  }

  async logOrderUnchanged(sessionId, orderId, patientId, reason) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.ORDER_UNCHANGED,
      {
        reason,
        timestamp: new Date()
      },
      {
        actionTaken: 'no_order_change'
      }
    );
  }

  async logError(sessionId, orderId, patientId, errorType, errorMessage, errorDetails = {}) {
    return await this.logEvent(
      sessionId,
      orderId,
      patientId,
      this.eventTypes.ERROR_OCCURRED,
      {
        errorType,
        errorMessage,
        timestamp: new Date()
      },
      {
        eventData: {
          errorDetails
        }
      }
    );
  }

  async getLogsBySession(sessionId) {
    try {
      const logs = await AgentAuditLog.find({ sessionId })
        .sort({ timestamp: 1 })
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching logs by session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLogsByOrder(orderId) {
    try {
      const logs = await AgentAuditLog.find({ orderId })
        .sort({ timestamp: 1 })
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching logs by order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLogsByPatient(patientId, limit = 50) {
    try {
      const logs = await AgentAuditLog.find({ patientId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching logs by patient:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLogsByEventType(eventType, limit = 100) {
    try {
      const logs = await AgentAuditLog.find({ eventType })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching logs by event type:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLogsByDateRange(startDate, endDate) {
    try {
      const logs = await AgentAuditLog.find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
        .sort({ timestamp: 1 })
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching logs by date range:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSessionSummary(sessionId) {
    try {
      const logs = await this.getLogsBySession(sessionId);
      
      if (!logs.success) {
        return logs;
      }

      const summary = {
        sessionId,
        totalEvents: logs.count,
        orderId: logs.data[0]?.orderId || null,
        patientId: logs.data[0]?.patientId || null,
        eventBreakdown: {},
        timeline: logs.data.map(log => ({
          eventType: log.eventType,
          timestamp: log.timestamp,
          actionTaken: log.actionTaken
        })),
        finalOutcome: this.determineSessionOutcome(logs.data)
      };

      // Count events by type
      logs.data.forEach(log => {
        summary.eventBreakdown[log.eventType] = (summary.eventBreakdown[log.eventType] || 0) + 1;
      });

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('Error generating session summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  determineSessionOutcome(logs) {
    if (logs.length === 0) return 'unknown';

    const lastLog = logs[logs.length - 1];
    
    if (lastLog.eventType === this.eventTypes.ORDER_UPDATED) {
      return 'test_added';
    } else if (lastLog.eventType === this.eventTypes.ORDER_UNCHANGED) {
      return 'no_change';
    } else if (lastLog.eventType === this.eventTypes.ERROR_OCCURRED) {
      return 'error';
    } else {
      return 'in_progress';
    }
  }

  async getRecentLogs(limit = 20) {
    try {
      const logs = await AgentAuditLog.find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

      return {
        success: true,
        data: logs,
        count: logs.length
      };
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStatistics(startDate = null, endDate = null) {
    try {
      const matchQuery = {};
      if (startDate && endDate) {
        matchQuery.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const stats = await AgentAuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalSessions = await AgentAuditLog.distinct('sessionId').length;
      const totalOrders = await AgentAuditLog.distinct('orderId').length;
      const totalPatients = await AgentAuditLog.distinct('patientId').length;

      return {
        success: true,
        data: {
          eventStatistics: stats,
          totalSessions,
          totalOrders,
          totalPatients
        }
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AgentLoggingService();
