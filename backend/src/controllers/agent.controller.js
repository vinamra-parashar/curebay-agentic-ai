const testPanelAgent = require('../agents/testPanelAgent');
const patientConfirmationService = require('../services/patientConfirmation.service');
const agentLoggingService = require('../services/agentLogging.service');

async function analyzeOrderWithAgent(req, res) {
  try {
    const { orderId } = req.params;

    const result = await testPanelAgent.analyzeOrder(orderId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in agent analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Agent analysis failed'
    });
  }
}

async function initiateConfirmation(req, res) {
  try {
    const { orderId } = req.params;

    // Get order analysis first with session ID for logging
    const tempSessionId = `temp_${Date.now()}`;
    const analysisResult = await testPanelAgent.analyzeOrder(orderId, tempSessionId);
    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    // Create confirmation session
    const session = patientConfirmationService.createConfirmationSession(
      orderId,
      analysisResult.data.recommendedGaps
    );

    // Generate confirmation message
    const confirmationMessage = patientConfirmationService.generateConfirmationMessage(
      analysisResult.data.recommendedGaps,
      analysisResult.data.patientName
    );

    // Log confirmation initiation
    await agentLoggingService.logConfirmationInitiated(
      session.sessionId,
      orderId,
      analysisResult.data.patientId,
      analysisResult.data.recommendedGaps,
      confirmationMessage
    );

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        orderId,
        confirmationMessage,
        recommendations: analysisResult.data.recommendedGaps,
        aiSummary: analysisResult.data.aiSummary || null,
        aiFallback: analysisResult.data.aiFallback || false,
        expiresAt: session.expiresAt
      },
      message: 'Confirmation session initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating confirmation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to initiate confirmation'
    });
  }
}

async function processPatientConfirmation(req, res) {
  try {
    const { sessionId } = req.params;
    const { patientResponse, selectedTestIndex } = req.body;

    if (!patientResponse) {
      return res.status(400).json({
        success: false,
        message: 'patientResponse is required'
      });
    }

    // Validate response
    const validation = patientConfirmationService.validateResponse(patientResponse);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        allowedValues: validation.allowedValues
      });
    }

    // Process confirmation
    const confirmationResult = patientConfirmationService.processConfirmation(
      sessionId,
      patientResponse,
      selectedTestIndex
    );

    if (!confirmationResult.success) {
      return res.status(400).json(confirmationResult);
    }

    // If test is confirmed, add it to the order
    if (confirmationResult.action === 'test_confirmed') {
      // Get session to retrieve patientId for logging
      const sessionResult = patientConfirmationService.getSession(sessionId);
      const patientId = sessionResult.found ? sessionResult.session.patientId : null;

      const orderResult = await testPanelAgent.processPatientResponse(
        confirmationResult.orderId,
        'yes',
        confirmationResult.testToAdd,
        sessionId,
        patientId
      );

      if (!orderResult.success) {
        return res.status(400).json(orderResult);
      }

      return res.json({
        success: true,
        action: 'test_added',
        data: orderResult.data,
        confirmation: confirmationResult,
        message: `Test "${confirmationResult.testToAdd}" has been added to order ${confirmationResult.orderId}`
      });
    }

    // If awaiting selection, return selection options
    if (confirmationResult.action === 'awaiting_selection') {
      return res.json(confirmationResult);
    }

    // If declined
    res.json({
      success: true,
      action: 'no_change',
      confirmation: confirmationResult,
      message: 'Patient declined to add recommended tests'
    });
  } catch (error) {
    console.error('Error processing patient confirmation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process patient confirmation'
    });
  }
}

async function getSessionStatus(req, res) {
  try {
    const { sessionId } = req.params;

    const summary = patientConfirmationService.getSessionSummary(sessionId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get session status'
    });
  }
}

async function getAgentStatus(req, res) {
  try {
    const isInitialized = testPanelAgent.isInitialized();

    res.json({
      success: true,
      data: {
        initialized: isInitialized,
        status: isInitialized ? 'active' : 'mock_mode',
        message: isInitialized
          ? 'AI Agent is fully operational with Gemini API'
          : 'AI Agent running in mock mode (API key not configured)'
      }
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get agent status'
    });
  }
}

module.exports = {
  analyzeOrderWithAgent,
  initiateConfirmation,
  processPatientConfirmation,
  getSessionStatus,
  getAgentStatus
};
