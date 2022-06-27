import { TInputValue } from "./types";

type NonStandardEvent = Omit<Event, 'composedPath'> & {
  path: EventTarget[];
};

export function getEventTarget(event: Event | NonStandardEvent): EventTarget | null {
  try {
    if ('composedPath' in event) {
      const path = event.composedPath();
      if (path.length) {
        return path[0];
      }
    } else if ('path' in event && event.path.length) {
      return event.path[0];
    }
    return event.target;
  } catch {
    return event.target;
  }
}

export function getWindowHeight(): number {
  return (
    window.innerHeight ||
    (document.documentElement && document.documentElement.clientHeight) ||
    (document.body && document.body.clientHeight)
  );
}

export function getWindowWidth(): number {
  return (
    window.innerWidth ||
    (document.documentElement && document.documentElement.clientWidth) ||
    (document.body && document.body.clientWidth)
  );
}

export function wrapEventWithUserTriggeredFlag(
  v: TInputValue,
  enable: boolean,
): TInputValue {
  const value = { ...v };
  if (!enable) delete value.userTriggered;
  return value;
}
