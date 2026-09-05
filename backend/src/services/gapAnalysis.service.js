class GapAnalysisService {
  constructor() {
    this.recommendationRules = this.getDefaultRecommendationRules();
  }

  getDefaultRecommendationRules() {
    return [
      {
        ruleId: 'R001',
        condition: 'Diabetes',
        triggerTest: 'Complete Blood Count',
        recommendedTest: 'HbA1c',
        reason: 'HbA1c test is recommended for diabetes patients to monitor long-term blood sugar control',
        priority: 'high'
      },
      {
        ruleId: 'R002',
        condition: 'Diabetes',
        triggerTest: 'Lipid Profile',
        recommendedTest: 'Kidney Function Test',
        reason: 'Diabetes patients should regularly monitor kidney function as they are at higher risk for kidney disease',
        priority: 'high'
      },
      {
        ruleId: 'R003',
        condition: 'Hypertension',
        triggerTest: 'Lipid Profile',
        recommendedTest: 'Kidney Function Test',
        reason: 'Hypertension patients should monitor kidney function as high blood pressure can damage kidneys over time',
        priority: 'high'
      },
      {
        ruleId: 'R004',
        condition: 'Hypertension',
        triggerTest: 'Complete Blood Count',
        recommendedTest: 'Electrolyte Panel',
        reason: 'Electrolyte monitoring is important for hypertension patients on certain medications',
        priority: 'medium'
      },
      {
        ruleId: 'R005',
        condition: 'Diabetes',
        triggerTest: 'Kidney Function Test',
        recommendedTest: 'Urine Albumin',
        reason: 'Urine albumin test helps detect early kidney damage in diabetes patients',
        priority: 'high'
      },
      {
        ruleId: 'R006',
        condition: 'None',
        triggerTest: 'Lipid Profile',
        recommendedTest: 'Liver Function Test',
        reason: 'Liver function test is recommended when monitoring lipid levels as some medications can affect liver',
        priority: 'medium'
      },
      {
        ruleId: 'R007',
        condition: 'None',
        triggerTest: 'Thyroid Function Test',
        recommendedTest: 'Complete Blood Count',
        reason: 'Complete Blood Count is often recommended alongside thyroid tests to check for anemia which can be related to thyroid conditions',
        priority: 'medium'
      },
      {
        ruleId: 'R008',
        condition: 'None',
        ageThreshold: 40,
        triggerTest: 'Complete Blood Count',
        recommendedTest: 'Lipid Profile',
        reason: 'Lipid profile screening is recommended for adults over 40 as part of cardiovascular health assessment',
        priority: 'medium'
      },
      {
        ruleId: 'R009',
        condition: 'Diabetes',
        triggerTest: 'Complete Blood Count',
        recommendedTest: 'Lipid Profile',
        reason: 'Diabetes patients should regularly monitor lipid levels as they are at higher risk for cardiovascular disease',
        priority: 'high'
      },
      {
        ruleId: 'R010',
        condition: 'Hypertension',
        triggerTest: 'Kidney Function Test',
        recommendedTest: 'Lipid Profile',
        reason: 'Hypertension patients should monitor lipid levels as high blood pressure and cholesterol often occur together',
        priority: 'high'
      }
    ];
  }

  setRecommendationRules(rules) {
    this.recommendationRules = rules;
  }

  getRecommendationRules() {
    return this.recommendationRules;
  }

  /**
   * Analyse gaps between the current order and what should be recommended.
   * Returns a deduplicated, merged list sorted by priority (high → medium → low).
   * Each entry uses `reasons` (array) instead of `reason` (string) so that
   * multiple conditions that trigger the same test can all be surfaced.
   */
  analyzeGaps(patient, order, medicalHistory) {
    const orderedTests = order.tests || [];
    const patientConditions = this.extractConditions(patient, medicalHistory);

    // Priority weight for comparisons
    const priorityWeight = { high: 0, medium: 1, low: 2 };

    // Accumulate raw matches keyed by recommendedTest
    const mergedMap = new Map();

    for (const rule of this.recommendationRules) {
      // Rule must apply to this patient
      if (!this.ruleApplies(rule, patientConditions, patient.age)) continue;

      // Trigger test must be present in the current order
      if (!orderedTests.includes(rule.triggerTest)) continue;

      // Skip if the recommended test is already in the order
      if (orderedTests.includes(rule.recommendedTest)) continue;

      if (mergedMap.has(rule.recommendedTest)) {
        // Merge into existing entry
        const existing = mergedMap.get(rule.recommendedTest);

        // Collect the new reason if it is not already present
        if (!existing.reasons.includes(rule.reason)) {
          existing.reasons.push(rule.reason);
        }

        // Collect all triggering rules for traceability
        existing.ruleIds.push(rule.ruleId);

        // Keep the highest priority
        if (priorityWeight[rule.priority] < priorityWeight[existing.priority]) {
          existing.priority = rule.priority;
        }
      } else {
        // First time we see this recommended test
        mergedMap.set(rule.recommendedTest, {
          ruleIds: [rule.ruleId],
          recommendedTest: rule.recommendedTest,
          reasons: [rule.reason],
          priority: rule.priority,
          triggerTest: rule.triggerTest
        });
      }
    }

    // Convert map to array and sort by priority
    const gaps = Array.from(mergedMap.values());
    gaps.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

    return gaps;
  }

  extractConditions(patient, medicalHistory) {
    const conditions = new Set();

    // Add condition from patient profile
    if (patient.condition) {
      const patientConditions = patient.condition.split(',').map(c => c.trim());
      patientConditions.forEach(c => conditions.add(c));
    }

    // Add conditions from medical history
    if (medicalHistory && medicalHistory.conditions) {
      medicalHistory.conditions.forEach(c => conditions.add(c));
    }

    return Array.from(conditions);
  }

  ruleApplies(rule, patientConditions, patientAge) {
    // For rules with no specific condition, check age threshold if it exists
    if (rule.condition === 'None') {
      if (rule.ageThreshold && patientAge) {
        return patientAge >= rule.ageThreshold;
      }
      return true;
    }

    const ruleConditions = rule.condition.split(',').map(c => c.trim());
    return ruleConditions.some(rc => patientConditions.includes(rc));
  }

  /**
   * Returns a plain-text summary for cases where AI is unavailable.
   * Handles both old single-reason shape and new reasons[] shape.
   */
  getRecommendationExplanation(gaps, patient) {
    if (gaps.length === 0) {
      return 'Based on your profile and current order, no additional test recommendations are needed at this time.';
    }

    let explanation = `Based on your profile (Age: ${patient.age}, Condition: ${patient.condition}) and current order, the following tests may be relevant:\n\n`;

    gaps.forEach((gap, index) => {
      explanation += `${index + 1}. ${gap.recommendedTest}\n`;
      explanation += `   Priority: ${gap.priority}\n`;

      // Support both shapes
      const reasons = gap.reasons || (gap.reason ? [gap.reason] : []);
      reasons.forEach(r => {
        explanation += `   - ${r}\n`;
      });
      explanation += '\n';
    });

    explanation += 'Would you like to add any of these tests to your order?';

    return explanation;
  }
}

module.exports = new GapAnalysisService();
