const { GoogleGenAI } = require('@google/genai');
const patientTools = require('../tools/patientTools');
const gapAnalysisService = require('../services/gapAnalysis.service');
const orderUpdateService = require('../services/orderUpdate.service');
const agentLoggingService = require('../services/agentLogging.service');

class TestPanelAgent {
  constructor() {
    this.genAI = null;
    this.modelName = null;
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        console.warn('Gemini API key not configured. Agent will run in mock mode.');
        this.initialized = false;
        return;
      }

      this.genAI = new GoogleGenAI({
        apiKey
      });

      this.modelName = 'gemini-3.6-flash';
      this.initialized = true;
      console.log('Test Panel Agent initialized successfully');
    } catch (error) {
      console.error('Error initializing Test Panel Agent:', error);
      this.initialized = false;
    }
  }

  async analyzeOrder(orderId, sessionId = null) {
    try {
      // Log analysis start
      if (sessionId) {
        await agentLoggingService.logAnalysisStarted(sessionId, orderId, null, { timestamp: new Date() });
      }

      // Get order details
      const orderResult = await patientTools.getCurrentOrder(orderId);
      if (!orderResult.success) {
        if (sessionId) {
          await agentLoggingService.logError(sessionId, orderId, null, 'order_retrieval_failed', orderResult.error);
        }
        return {
          success: false,
          error: orderResult.error,
          message: 'Failed to retrieve order'
        };
      }

      const order = orderResult.data;

      // Get patient profile
      const patientResult = await patientTools.getPatientProfile(order.patientId);
      if (!patientResult.success) {
        if (sessionId) {
          await agentLoggingService.logError(sessionId, orderId, order.patientId, 'patient_retrieval_failed', patientResult.error);
        }
        return {
          success: false,
          error: patientResult.error,
          message: 'Failed to retrieve patient profile'
        };
      }

      const patient = patientResult.data;

      // Get medical history (non-fatal if missing)
      const historyResult = await patientTools.getMedicalHistory(order.patientId);
      const medicalHistory = historyResult.success ? historyResult.data : null;

      // --- Deterministic gap analysis (source of truth) ---
      const gapRecommendations = gapAnalysisService.analyzeGaps(patient, order, medicalHistory);
      const explanation = gapAnalysisService.getRecommendationExplanation(gapRecommendations, patient);

      // Allowed test names (whitelist): only what the rules produced
      const allowedTestNames = new Set(gapRecommendations.map(g => g.recommendedTest));

      // --- Gemini AI analysis (enhancement, not source of truth) ---
      let aiSummary = null;
      let aiRecommendations = null;
      let aiFallback = false;

      if (this.initialized && gapRecommendations.length > 0) {
        try {
          const aiResult = await this.getAIAnalysis(patient, order, medicalHistory, gapRecommendations);

          if (aiResult && aiResult.recommendations) {
            // Whitelist filter: only keep tests the gap-analysis already identified
            const filtered = aiResult.recommendations.filter(
              rec => rec.test && allowedTestNames.has(rec.test)
            );

            aiSummary = aiResult.summary || null;
            aiRecommendations = filtered.length > 0 ? filtered : null;
          }

          if (!aiRecommendations) {
            aiFallback = true;
          }
        } catch (aiError) {
          console.warn('AI analysis failed, falling back to rule-based analysis:', aiError.message);
          aiFallback = true;
        }
      } else if (!this.initialized) {
        aiFallback = true;
      }

      // Build the final recommendation list sent to the client.
      // Prefer AI-enriched recommendations when available, otherwise use gap recs.
      // Shape is always { recommendedTest, priority, reasons[] }.
      let finalRecommendations;
      if (aiRecommendations && aiRecommendations.length > 0) {
        // Merge Gemini's reason text back into the gap shape
        finalRecommendations = gapRecommendations.map(gap => {
          const aiMatch = aiRecommendations.find(r => r.test === gap.recommendedTest);
          return {
            ...gap,
            // If Gemini provided a patient-friendly reason, surface it as first item
            reasons: aiMatch && aiMatch.reason
              ? [aiMatch.reason, ...gap.reasons.filter(r => r !== aiMatch.reason)]
              : gap.reasons
          };
        });
      } else {
        finalRecommendations = gapRecommendations;
      }

      // Log recommendation generation
      if (sessionId) {
        await agentLoggingService.logRecommendationGenerated(
          sessionId,
          orderId,
          order.patientId,
          finalRecommendations,
          patient,
          order
        );
      }

      return {
        success: true,
        data: {
          orderId,
          patientId: order.patientId,
          patientName: patient.name,
          currentTests: order.tests,
          patientCondition: patient.condition,
          recommendedGaps: finalRecommendations,
          explanation,
          aiSummary,
          aiFallback
        },
        message: 'Order analysis completed successfully'
      };
    } catch (error) {
      console.error('Error analyzing order:', error);
      if (sessionId) {
        await agentLoggingService.logError(sessionId, orderId, null, 'analysis_error', error.message);
      }
      return {
        success: false,
        error: error.message,
        message: 'Failed to analyze order'
      };
    }
  }

  /**
   * Calls Gemini and expects structured JSON back.
   * Returns parsed object or null on any failure.
   */
  async getAIAnalysis(patient, order, medicalHistory, gaps) {
    try {
      const prompt = this.buildAnalysisPrompt(patient, order, medicalHistory, gaps);

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt
      });

      const rawText = (response.text || '').trim();

      // Strip accidental markdown fences
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Parse JSON
      const parsed = JSON.parse(cleaned);

      // Validate minimum shape
      if (!parsed || !Array.isArray(parsed.recommendations)) {
        console.warn('Gemini returned JSON without a recommendations array. Falling back.');
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('Gemini JSON parse/call failed:', error.message);
      return null;
    }
  }

  /**
   * Builds the structured prompt for Gemini.
   * The model is told ONLY to work with the provided gap candidates.
   * It must return valid JSON — no markdown, no extra text.
   */
  buildAnalysisPrompt(patient, order, medicalHistory, gaps) {
    // Build gap candidates list for Gemini
    const candidateList = gaps.map((g, i) => {
      const reasons = g.reasons || (g.reason ? [g.reason] : []);
      return `${i + 1}. Test: ${g.recommendedTest}\n   Priority: ${g.priority}\n   Reasons: ${reasons.join(' | ')}`;
    }).join('\n\n');

    const currentTests = (order.tests || []).join(', ') || 'None';
    const conditions = medicalHistory
      ? [patient.condition, ...(medicalHistory.conditions || [])].filter(Boolean).join(', ')
      : patient.condition || 'None';
    const medications = medicalHistory ? (medicalHistory.medications || []).join(', ') : 'None';

    const prompt = `You are a test-panel recommendation assistant for a healthcare application.

You are NOT a doctor.
You must NOT diagnose the patient.
You must NOT prescribe medication.
You must NOT invent medical history.
You must NOT invent tests.
You may only use the patient information, current order, and identified recommendation candidates provided below.

The backend has already identified potentially relevant test gaps.

---

PATIENT CONTEXT:
- Age: ${patient.age}
- Gender: ${patient.gender}
- Conditions: ${conditions}
- Medications: ${medications}

CURRENT ORDER (tests already ordered — do NOT recommend these):
${currentTests}

IDENTIFIED TEST GAP CANDIDATES (you may ONLY use tests from this list):
${candidateList}

---

Your task is to:
1. Review the provided patient context and current order.
2. Review the identified test gap candidates.
3. Do NOT recommend any test that is already in the current order.
4. For each candidate test, write a concise, patient-friendly explanation of why it may be relevant.
5. Combine any overlapping reasons for the same test into one clear sentence.
6. Preserve the priority level provided (do not change it).
7. Return results for ALL candidates listed above (do not drop any).

Return ONLY valid JSON in this exact schema:

{
  "summary": "Brief overview of the recommendations for the patient.",
  "recommendations": [
    {
      "test": "Exact test name as given in the candidates list",
      "priority": "high|medium|low",
      "reason": "Single concise patient-friendly explanation."
    }
  ]
}

Do not include markdown.
Do not include \`\`\`json.
Do not include any text outside the JSON object.`;

    return prompt;
  }

  async processPatientResponse(orderId, patientResponse, testToAdd, confirmationSessionId = null, patientId = null) {
    try {
      // Get current order state for logging
      const orderResult = await patientTools.getCurrentOrder(orderId);
      const previousOrderState = orderResult.success ? orderResult.data : null;

      // Log patient response
      if (confirmationSessionId && patientId) {
        await agentLoggingService.logPatientResponse(
          confirmationSessionId,
          orderId,
          patientId,
          patientResponse,
          testToAdd
        );
      }

      if (patientResponse.toLowerCase() === 'yes' && testToAdd) {
        // Use order update service for validated order updates
        const result = await orderUpdateService.addTestToOrder(orderId, testToAdd, confirmationSessionId);

        if (!result.success) {
          if (confirmationSessionId && patientId) {
            await agentLoggingService.logError(
              confirmationSessionId,
              orderId,
              patientId,
              'order_update_failed',
              result.error
            );
          }
          return {
            success: false,
            error: result.error,
            message: 'Failed to add test to order'
          };
        }

        // Log order update
        if (confirmationSessionId && patientId && previousOrderState) {
          await agentLoggingService.logOrderUpdated(
            confirmationSessionId,
            orderId,
            patientId,
            previousOrderState,
            result.data,
            testToAdd
          );
        }

        return {
          success: true,
          action: 'test_added',
          data: result.data,
          message: `Test "${testToAdd}" has been added to order ${orderId}`,
          confirmationSessionId
        };
      } else {
        // Log order unchanged
        if (confirmationSessionId && patientId) {
          await agentLoggingService.logOrderUnchanged(
            confirmationSessionId,
            orderId,
            patientId,
            'patient_declined_recommendation'
          );
        }

        return {
          success: true,
          action: 'no_change',
          message: `No changes made to order ${orderId} based on patient response`,
          confirmationSessionId
        };
      }
    } catch (error) {
      console.error('Error processing patient response:', error);
      if (confirmationSessionId) {
        await agentLoggingService.logError(
          confirmationSessionId,
          orderId,
          patientId,
          'patient_response_error',
          error.message
        );
      }
      return {
        success: false,
        error: error.message,
        message: 'Failed to process patient response'
      };
    }
  }

  isInitialized() {
    return this.initialized;
  }
}

module.exports = new TestPanelAgent();
