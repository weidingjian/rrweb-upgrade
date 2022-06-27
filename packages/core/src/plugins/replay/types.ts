import { createPlayerService, createSpeedService } from "../../replay/merchine";
import Timer from "../../replay/timer";
import { LogLevel, TAddedNodeMutation, TIncrementalData, TLogData } from "../../types";

export type missingNode = {
  node: Node;
  mutation: TAddedNodeMutation;
};
export type missingNodeMap = {
  [id: number]: missingNode;
};

export type AppendedIframe = {
  mutationInQueue: TAddedNodeMutation;
  builtNode: HTMLIFrameElement;
};

export type styleValueWithPriority = [string, string];

export type TMouseMovePos = {
  x: number;
  y: number;
  id: number;
  debugData: TIncrementalData;
};

export type DocumentDimension = {
  x: number;
  y: number;
  // scale value relative to its parent iframe
  relativeScale: number;
  // scale value relative to the root iframe
  absoluteScale: number;
};

export interface IReplayPluginCtx {
  mouse: HTMLDivElement;
  mouseTail?: HTMLCanvasElement | null;
  iframe: HTMLIFrameElement;
  service: ReturnType<typeof createPlayerService>;
  speedService: ReturnType<typeof createSpeedService>;
  timer: Timer;
}

export type ReplayLogger = Partial<Record<LogLevel, (data: TLogData) => void>>;
