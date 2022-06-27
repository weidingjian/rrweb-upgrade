import { UnpackFn } from "../packer/base";
import { LogLevel } from "../types";

export interface PlayerConfig {
  speed: number;
  liveMode?: boolean;
  unpackFn?: UnpackFn;
  showWarning?: boolean;
  showDebug?: boolean;
  mouseTail:
  | boolean
  | {
      duration?: number;
      lineCap?: string;
      lineWidth?: number;
      strokeStyle?: string;
    };
  triggerFocus?: boolean;
  blockClass?: string;
  insertStyleRules: string[];
  pauseAnimation: boolean;
  UNSAFE_replayCanvas: boolean;
  loadTimeout: number;
  root: Element;
  maxSpeed: number;
  skipInactive: boolean;
  level?: LogLevel[];
}

export type Handler = (event?: unknown) => void;

export type Emitter = {
  on(type: string, handler: Handler): void;
  emit(type: string, event?: unknown): void;
  off(type: string, handler: Handler): void;
};


export type PlayerMetaData = {
  startTime: number;
  endTime: number;
  totalTime: number;
};
