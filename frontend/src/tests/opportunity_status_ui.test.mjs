import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 8.4.2 Opportunity Status & Rejection UI Regression', () => {

  describe('OpportunityStudioView Status Badge & Confidence Rendering', () => {
    // Pure logic mirrors OpportunityStudioView.tsx header badge and confidence rendering
    const renderHeaderBadge = (report) => {
      const isRejected = report.status === 'REJECTED';
      return {
        label: isRejected ? 'REJECTED OPPORTUNITY' : 'VALIDATED OPPORTUNITY',
        badgeClass: isRejected
          ? 'px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center space-x-1.5'
          : 'px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center space-x-1.5',
        confidenceLabel: isRejected
          ? `Historical Confidence: ${(report.confidence * 100).toFixed(1)}% (Pre-Rejection)`
          : `Confidence: ${(report.confidence * 100).toFixed(1)}%`,
        isHistorical: isRejected,
      };
    };

    const renderSidebarBadge = (opp) => {
      const isRejected = opp.status === 'REJECTED';
      return {
        statusLabel: isRejected ? 'REJECTED' : `${(opp.confidence * 100).toFixed(0)}% CONFIDENCE`,
        historicalSublabel: isRejected ? `Hist: ${(opp.confidence * 100).toFixed(0)}%` : null,
        isRejected,
      };
    };

    test('rejected opportunity displays REJECTED OPPORTUNITY badge and historical confidence label', () => {
      const rejectedReport = {
        opportunity_id: '01830146-b3d9-4503-a5bb-df8202c75105',
        gap_id: 'aab55f12-1083-49bb-9a00-3480a85a415d',
        status: 'REJECTED',
        confidence: 0.75,
        proposed_research_direction: 'Multimodal RAG with Cross-Modal Consistency',
      };

      const rendered = renderHeaderBadge(rejectedReport);
      assert.equal(rendered.label, 'REJECTED OPPORTUNITY');
      assert.ok(rendered.badgeClass.includes('bg-rose-50'));
      assert.ok(rendered.badgeClass.includes('text-rose-700'));
      assert.ok(rendered.badgeClass.includes('border-rose-200'));
      assert.equal(rendered.confidenceLabel, 'Historical Confidence: 75.0% (Pre-Rejection)');
      assert.equal(rendered.isHistorical, true);
      assert.notEqual(rendered.label, 'VALIDATED OPPORTUNITY');
      assert.notEqual(rendered.confidenceLabel, 'Confidence: 75.0%');
    });

    test('validated opportunity displays VALIDATED OPPORTUNITY badge and active confidence label', () => {
      const validatedReport = {
        opportunity_id: '11111111-2222-3333-4444-555555555555',
        gap_id: '22222222-3333-4444-5555-666666666666',
        status: 'VALIDATED',
        confidence: 0.88,
        proposed_research_direction: 'Adaptive Document Chunking with Semantic Boundaries',
      };

      const rendered = renderHeaderBadge(validatedReport);
      assert.equal(rendered.label, 'VALIDATED OPPORTUNITY');
      assert.ok(rendered.badgeClass.includes('bg-indigo-50'));
      assert.ok(rendered.badgeClass.includes('text-indigo-700'));
      assert.ok(rendered.badgeClass.includes('border-indigo-200'));
      assert.equal(rendered.confidenceLabel, 'Confidence: 88.0%');
      assert.equal(rendered.isHistorical, false);
      assert.notEqual(rendered.label, 'REJECTED OPPORTUNITY');
    });

    test('sidebar opportunity list item labels rejected opportunity and historical confidence', () => {
      const rejectedOpp = {
        id: '01830146-b3d9-4503-a5bb-df8202c75105',
        status: 'REJECTED',
        confidence: 0.75,
      };
      const validatedOpp = {
        id: '11111111-2222-3333-4444-555555555555',
        status: 'VALIDATED',
        confidence: 0.88,
      };

      const renderedRejected = renderSidebarBadge(rejectedOpp);
      assert.equal(renderedRejected.statusLabel, 'REJECTED');
      assert.equal(renderedRejected.historicalSublabel, 'Hist: 75%');
      assert.equal(renderedRejected.isRejected, true);

      const renderedValidated = renderSidebarBadge(validatedOpp);
      assert.equal(renderedValidated.statusLabel, '88% CONFIDENCE');
      assert.equal(renderedValidated.historicalSublabel, null);
      assert.equal(renderedValidated.isRejected, false);
    });
  });

  describe('OverviewView Metric 5 Validated Opportunities Calculation', () => {
    // Pure logic mirrors OverviewView.tsx line 279
    const getProposalMetricSubtitle = (stats) => {
      if (!stats) return 'Technical directions';
      return `${stats.validated_opportunities ?? 0} validated proposals ready`;
    };

    test('displays actual validated_opportunities count when rejected opportunities exist', () => {
      const liveSystemStats = {
        total_papers: 71,
        total_statements: 153,
        total_gaps: 18,
        validated_gaps: 2,
        rejected_gaps: 16,
        total_opportunities: 3,
        validated_opportunities: 2, // 2 validated, 1 rejected
      };

      const subtitle = getProposalMetricSubtitle(liveSystemStats);
      assert.equal(subtitle, '2 validated proposals ready');
      assert.notEqual(subtitle, '3 validated proposals ready', 'Must NOT count rejected opportunities as validated');
    });

    test('handles zero validated opportunities correctly without crashing or misrepresenting', () => {
      const zeroValStats = {
        total_opportunities: 3,
        validated_opportunities: 0,
      };

      const subtitle = getProposalMetricSubtitle(zeroValStats);
      assert.equal(subtitle, '0 validated proposals ready');
      assert.notEqual(subtitle, '3 validated proposals ready');
    });

    test('handles null stats gracefully with fallback placeholder', () => {
      const subtitle = getProposalMetricSubtitle(null);
      assert.equal(subtitle, 'Technical directions');
    });
  });

});
