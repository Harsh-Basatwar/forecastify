/**
 * Operational Replay Engine
 * Replays past events across historical time windows for debugging and verification.
 */

import { eventBus, SystemEventPayload } from "../events";

export class OperationalReplay {
  public replayEventWindow(startTime: string, endTime: string): { replayedCount: number; events: SystemEventPayload[] } {
    const history = eventBus.getHistory();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    const matches = history.filter((e) => {
      const t = new Date(e.createdAt).getTime();
      return t >= start && t <= end;
    });

    return {
      replayedCount: matches.length,
      events: matches,
    };
  }
}

export const operationalReplay = new OperationalReplay();
