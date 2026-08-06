/**
 * Explanation History Tracker
 * Milestone 5 - Forecastify XAI
 */

import { Explanation, ExplanationDiff } from './explanation-types';
import { explanationDiffEngine } from './explanation-diff';

export interface HistoryRecord {
  explanationId: string;
  version: number;
  changesSummary: string;
  snapshot: Explanation;
  diffFromPrevious?: ExplanationDiff;
  timestamp: string;
}

export class ExplanationHistoryTracker {
  private historyMap: Map<string, HistoryRecord[]> = new Map();

  public recordVersion(explanation: Explanation, changesSummary?: string): HistoryRecord {
    const list = this.historyMap.get(explanation.explanationId) || [];
    const version = list.length + 1;
    explanation.metadata.version = version;

    let diffFromPrevious: ExplanationDiff | undefined;
    if (list.length > 0) {
      const prevSnapshot = list[list.length - 1].snapshot;
      diffFromPrevious = explanationDiffEngine.computeDiff(prevSnapshot, explanation);
    }

    const record: HistoryRecord = {
      explanationId: explanation.explanationId,
      version,
      changesSummary: changesSummary || (version === 1 ? 'Initial Explanation Created' : `Updated Explanation Version ${version}`),
      snapshot: JSON.parse(JSON.stringify(explanation)),
      diffFromPrevious,
      timestamp: new Date().toISOString(),
    };

    list.push(record);
    this.historyMap.set(explanation.explanationId, list);
    return record;
  }

  public getHistory(explanationId: string): HistoryRecord[] {
    return this.historyMap.get(explanationId) || [];
  }
}

export const explanationHistoryTracker = new ExplanationHistoryTracker();
