const agentLoggingService = require('../services/agentLogging.service');

async function getLogsBySession(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await agentLoggingService.getLogsBySession(sessionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs by session:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch logs'
    });
  }
}

async function getLogsByOrder(req, res) {
  try {
    const { orderId } = req.params;

    const result = await agentLoggingService.getLogsByOrder(orderId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs by order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch logs'
    });
  }
}

async function getLogsByPatient(req, res) {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await agentLoggingService.getLogsByPatient(patientId, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs by patient:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch logs'
    });
  }
}

async function getSessionSummary(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await agentLoggingService.getSessionSummary(sessionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching session summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch session summary'
    });
  }
}

async function getRecentLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await agentLoggingService.getRecentLogs(limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch recent logs'
    });
  }
}

async function getLogsByEventType(req, res) {
  try {
    const { eventType } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const result = await agentLoggingService.getLogsByEventType(eventType, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs by event type:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch logs'
    });
  }
}

async function getLogsByDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required'
      });
    }

    const result = await agentLoggingService.getLogsByDateRange(startDate, endDate);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching logs by date range:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch logs'
    });
  }
}

async function getStatistics(req, res) {
  try {
    const { startDate, endDate } = req.query;

    const result = await agentLoggingService.getStatistics(startDate, endDate);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch statistics'
    });
  }
}

module.exports = {
  getLogsBySession,
  getLogsByOrder,
  getLogsByPatient,
  getSessionSummary,
  getRecentLogs,
  getLogsByEventType,
  getLogsByDateRange,
  getStatistics
};
