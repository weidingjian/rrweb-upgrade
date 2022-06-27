import { serializedNodeWithId } from "../../../snapshot";
import { EventType, TMutationData } from "../../../types";
import { TCanvasMutationData } from "../canvas/types";
import { TLogData } from "../console/types";
import { TStyleDeclarationData, TStyleSheetRuleData } from "../css/types";
import { TInputData, TMouseInteractionData, TMousemoveData, TScrollData, TViewportResizeData } from "../dom-events/types";
import { TFontData } from "../font/types";
import { TMediaInteractionData } from "../media-interaction/types";
import { TNetworkEventData } from "../network/types";

export type domContentLoadedEvent = {
  type: EventType.DomContentLoaded;
  data: {};
};

export type loadedEvent = {
  type: EventType.Load;
  data: {};
};

export type FullSnapshotEvent = {
  type: EventType.FullSnapshot;
  data: {
    node: serializedNodeWithId;
    initialOffset: {
      top: number;
      left: number;
    };
  };
};
export type TIncrementalData =
  | TMutationData
  | TMousemoveData
  | TMouseInteractionData
  | TScrollData
  | TViewportResizeData
  | TInputData
  | TMediaInteractionData
  | TStyleSheetRuleData
  | TCanvasMutationData
  | TFontData
  | TStyleDeclarationData
  | TLogData
  | TNetworkEventData;

export type incrementalSnapshotEvent = {
  type: EventType.IncrementalSnapshot;
  data: TIncrementalData;
};

export type metaEvent = {
  type: EventType.Meta;
  data: {
    href: string;
    width: number;
    height: number;
  };
};

export type customEvent<T = unknown> = {
  type: EventType.Custom;
  data: {
    tag: string;
    payload: T;
  };
};

export type pluginEvent<T = unknown> = {
  type: EventType.Plugin;
  data: {
    plugin: string;
    payload: T;
  };
};

export type styleSheetEvent = {};


export type TEvent =
  | domContentLoadedEvent
  | loadedEvent
  | FullSnapshotEvent
  | incrementalSnapshotEvent
  | metaEvent
  | customEvent
  | pluginEvent;


export type TEventWithTime = TEvent & {
  timestamp: number;
  delay?: number;
};
