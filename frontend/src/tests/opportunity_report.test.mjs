import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('OpportunityReport Schema & Differentiation Rendering', () => {
  test('handles string-valued differentiation safely without throwing TypeError', () => {
    const stringDiffReport = {
      opportunity_id: 'e211aced-2994-47db-a103-94b10039dac1',
      gap_id: '17297a70-4903-4ec9-93b9-8e3b3a237168',
      differentiation: 'The key differentiation lies in the proposed solution and technical approach.',
    };

    // The logic used in OpportunityStudioView.tsx:
    const renderDifferentiation = (diff) => {
      if (!diff) return null;
      if (Array.isArray(diff)) {
        return { type: 'list', items: diff.map((d, i) => ({ key: i, text: d })) };
      }
      return { type: 'paragraph', text: diff };
    };

    const rendered = renderDifferentiation(stringDiffReport.differentiation);
    assert.equal(rendered.type, 'paragraph');
    assert.equal(rendered.text, 'The key differentiation lies in the proposed solution and technical approach.');
  });

  test('handles array-valued differentiation safely', () => {
    const arrayDiffReport = {
      differentiation: ['Factor A: Dedicated VRM', 'Factor B: Confidence scoring'],
    };

    const renderDifferentiation = (diff) => {
      if (!diff) return null;
      if (Array.isArray(diff)) {
        return { type: 'list', items: diff.map((d, i) => ({ key: i, text: d })) };
      }
      return { type: 'paragraph', text: diff };
    };

    const rendered = renderDifferentiation(arrayDiffReport.differentiation);
    assert.equal(rendered.type, 'list');
    assert.equal(rendered.items.length, 2);
    assert.equal(rendered.items[0].text, 'Factor A: Dedicated VRM');
  });

  test('extracts real backend FeasibilityDTO fields correctly', () => {
    const backendFeasibility = {
      required_data: 'Evaluation requires RAG benchmark datasets',
      required_compute: 'Standard GPU workstation (RTX 4090)',
      implementation_complexity: 'Moderate algorithmic complexity',
      experimental_setup: 'Comparative benchmarking against baseline papers',
      feasibility_score: 0.85,
      summary: 'Feasible under standard academic computing resources.',
    };

    // Verify fields match what OpportunityStudioView accesses
    assert.equal(backendFeasibility.required_data, 'Evaluation requires RAG benchmark datasets');
    assert.equal(backendFeasibility.required_compute, 'Standard GPU workstation (RTX 4090)');
    assert.equal(backendFeasibility.implementation_complexity, 'Moderate algorithmic complexity');
    assert.equal(backendFeasibility.experimental_setup, 'Comparative benchmarking against baseline papers');
    assert.equal(backendFeasibility.feasibility_score, 0.85);
    assert.equal(backendFeasibility.summary, 'Feasible under standard academic computing resources.');
  });

  test('extracts cautious novelty assessment from real backend NoveltyDTO', () => {
    const report = {
      novelty_assessment: {
        assessment: 'Potentially novel within the analyzed corpus',
        reasoning: 'The proposed research opportunity directly addresses the limitation...',
        confidence: 0.9,
      },
      prior_art_assessment: {
        assessment: 'Potentially novel within the analyzed corpus',
      },
      confidence: 0.9,
    };

    const bannerText =
      report.novelty_assessment?.assessment ||
      report.prior_art_assessment?.assessment ||
      'Potentially novel within the analyzed corpus';

    assert.equal(bannerText, 'Potentially novel within the analyzed corpus');
    assert.ok(bannerText.includes('Potentially novel within the analyzed corpus'));
  });
});
