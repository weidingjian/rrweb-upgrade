import { EventType, IncrementalSource, TEventWithTime } from "../../types";

// TODO: add speed to mouse move timestamp calculation
export function addDelay(event: TEventWithTime, baselineTime: number): number {
  // Mouse move events was recorded in a throttle function,
  // so we need to find the real timestamp by traverse the time offsets.
  if (
    event.type === EventType.IncrementalSnapshot &&
    event.data.source === IncrementalSource.MouseMove
  ) {
    const firstOffset = event.data.positions[0].timeOffset;
    // timeOffset is a negative offset to event.timestamp
    const firstTimestamp = event.timestamp + firstOffset;
    event.delay = firstTimestamp - baselineTime;
    return firstTimestamp - baselineTime;
  }

  event.delay = event.timestamp - baselineTime;
  return event.delay;
}

/**
 * If the array have multiple meta and fullsnapshot events,
 * return the events from last meta to the end.
 */
 export function discardPriorSnapshots(
  events: TEventWithTime[],
  baselineTime: number,
): TEventWithTime[] {
  for (let idx = events.length - 1; idx >= 0; idx--) {
    const event = events[idx];
    if (event.type === EventType.Meta) {
      if (event.timestamp <= baselineTime) {
        return events.slice(idx);
      }
    }
  }
  return events;
}
