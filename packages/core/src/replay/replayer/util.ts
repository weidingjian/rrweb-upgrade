import { EventType, IncrementalSource, MouseInteractions, TEventWithTime } from "../../types";
import { PlayerConfig } from "../types";


export const defaultMouseTailConfig = {
  duration: 500,
  lineCap: 'round',
  lineWidth: 3,
  strokeStyle: 'red',
} as const;

export const defaultPlayerConfig: PlayerConfig = {
  speed: 1,
  maxSpeed: 360,
  root: document.body,
  loadTimeout: 0,
  skipInactive: false,
  showWarning: true,
  showDebug: false,
  blockClass: 'rr-block',
  liveMode: false,
  insertStyleRules: [],
  triggerFocus: true,
  UNSAFE_replayCanvas: false,
  pauseAnimation: true,
  mouseTail: defaultMouseTailConfig,
};
