class PatientConfirmationService {
  constructor() {
    this.validResponses = ['yes', 'no', 'y', 'n'];
    this.confirmationStates = new Map(); // Store confirmation sessions
  }

  validateResponse(response) {
    if (!response || typeof response !== 'string') {
      return {
        valid: false,
        error: 'Response is required and must be a string'
      };
    }

    const normalizedResponse = response.toLowerCase().trim();
    
    if (!this.validResponses.includes(normalizedResponse)) {
      return {
        valid: false,
        error: 'Response must be "yes" or "no"',
        allowedValues: this.validResponses
      };
    }

    return {
      valid: true,
      normalizedResponse: normalizedResponse.startsWith('y') ? 'yes' : 'no'
    };
  }

  createConfirmationSession(orderId, recommendations) {
    const sessionId = this.generateSessionId();
    const session = {
      sessionId,
      orderId,
      recommendations,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      status: 'pending'
    };

    this.confirmationStates.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    const session = this.confirmationStates.get(sessionId);
    
    if (!session) {
      return {
        found: false,
        error: 'Confirmation session not found or expired'
      };
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.confirmationStates.delete(sessionId);
      return {
        found: false,
        error: 'Confirmation session has expired'
      };
    }

    return {
      found: true,
      session
    };
  }

  processConfirmation(sessionId, patientResponse, selectedTestIndex = null) {
    const sessionResult = this.getSession(sessionId);
    
    if (!sessionResult.found) {
      return {
        success: false,
        error: sessionResult.error
      };
    }

    const validation = this.validateResponse(patientResponse);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const session = sessionResult.session;
    session.patientResponse = validation.normalizedResponse;
    session.respondedAt = new Date();

    if (validation.normalizedResponse === 'yes') {
      // Determine which test to add
      let testToAdd = null;
      
      if (selectedTestIndex !== null && session.recommendations[selectedTestIndex]) {
        testToAdd = session.recommendations[selectedTestIndex].recommendedTest;
      } else if (session.recommendations.length === 1) {
        testToAdd = session.recommendations[0].recommendedTest;
      } else {
        session.status = 'awaiting_selection';
        this.confirmationStates.set(sessionId, session);
        
        return {
          success: true,
          action: 'awaiting_selection',
          message: 'Please specify which test you would like to add by providing the test index',
          recommendations: session.recommendations.map((rec, index) => ({
            index,
            test: rec.recommendedTest,
            reason: rec.reason
          }))
        };
      }

      session.selectedTest = testToAdd;
      session.status = 'confirmed';
      this.confirmationStates.set(sessionId, session);

      return {
        success: true,
        action: 'test_confirmed',
        testToAdd,
        orderId: session.orderId,
        message: `Patient confirmed adding "${testToAdd}" to order`
      };
    } else {
      session.status = 'declined';
      this.confirmationStates.set(sessionId, session);

      return {
        success: true,
        action: 'test_declined',
        orderId: session.orderId,
        message: 'Patient declined to add recommended tests'
      };
    }
  }

  generateConfirmationMessage(recommendations, patientName) {
    if (recommendations.length === 0) {
      return `Based on your profile, no additional test recommendations are needed at this time.`;
    }

    let message = `Hello ${patientName},\n\n`;
    message += `Based on your profile and current order, we have identified the following potentially relevant tests:\n\n`;

    recommendations.forEach((rec, index) => {
      message += `${index + 1}. ${rec.recommendedTest}\n`;
      message += `   Priority: ${rec.priority}\n`;

      // Support both shapes: reasons[] (new) and reason (old)
      const reasons = rec.reasons || (rec.reason ? [rec.reason] : []);
      if (reasons.length === 1) {
        message += `   Reason: ${reasons[0]}\n\n`;
      } else if (reasons.length > 1) {
        message += `   Reasons:\n`;
        reasons.forEach(r => {
          message += `   - ${r}\n`;
        });
        message += '\n';
      }
    });

    message += `Would you like to add any of these tests to your order?\n`;
    message += `Please respond with "yes" or "no".`;

    return message;
  }

  generateSelectionMessage(recommendations) {
    let message = `You have multiple recommendations. Please select which test you would like to add:\n\n`;

    recommendations.forEach((rec, index) => {
      message += `[${index}] ${rec.recommendedTest}\n`;
      message += `    Reason: ${rec.reason}\n\n`;
    });

    message += `Please respond with the number of the test you would like to add, or "no" to decline all.`;

    return message;
  }

  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.confirmationStates.entries()) {
      if (now > session.expiresAt) {
        this.confirmationStates.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionSummary(sessionId) {
    const sessionResult = this.getSession(sessionId);
    
    if (!sessionResult.found) {
      return null;
    }

    const session = sessionResult.session;
    return {
      sessionId: session.sessionId,
      orderId: session.orderId,
      status: session.status,
      createdAt: session.createdAt,
      respondedAt: session.respondedAt,
      patientResponse: session.patientResponse,
      selectedTest: session.selectedTest,
      recommendationsCount: session.recommendations.length
    };
  }
}

module.exports = new PatientConfirmationService();
