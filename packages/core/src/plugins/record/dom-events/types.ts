import { ICommonOptions, IContextOptions, IMaskOptions, IncrementalSource } from "../../../types";

export type TMouseMoveSource = IncrementalSource.MouseMove | IncrementalSource.TouchMove | IncrementalSource.Drag;
export interface IEventOptions extends ICommonOptions, IMaskOptions {
  ignoreClass?: string;
  userTriggeredOnInput?: boolean;
  doc: IContextOptions['doc'];
  hooks?: {
    mousemove?: (payload: TMousePosition[], source: TMouseMoveSource) => void;
    mouseInteraction?: (payload: TMouseInteractionParam) => void;
    scroll?: (payload: TScrollPosition) => void;
    viewportResize?: (payload: TViewportResizeDimension) => void;
    input?: (payload: TInputValue) => void;
  }
}

export type TInputValue = {
  text: string;
  isChecked: boolean;

  // `userTriggered` indicates if this event was triggered directly by user (userTriggered: true)
  // or was triggered indirectly (userTriggered: false)
  // Example of `userTriggered` in action:
  // User clicks on radio element (userTriggered: true) which triggers the other radio element to change (userTriggered: false)
  userTriggered?: boolean;
};

export enum MouseInteractions {
  MouseUp,
  MouseDown,
  Click,
  ContextMenu,
  DblClick,
  Focus,
  Blur,
  TouchStart,
  TouchMove_Departed, // we will start a separate observer for touch move event
  TouchEnd,
  TouchCancel,
}

export type TMousePosition = {
  x: number;
  y: number;
  id: number;
  timeOffset: number;
};

export type TScrollPosition = {
  id: number;
  x: number;
  y: number;
};

export type TScrollData = {
  source: IncrementalSource.Scroll;
} & TScrollPosition;

export type TInputData = {
  source: IncrementalSource.Input;
  id: number;
} & TInputValue;

export type TMouseInteractionData = {
  source: IncrementalSource.MouseInteraction;
} & TMouseInteractionParam;

type TMouseInteractionParam = {
  type: MouseInteractions;
  id: number;
  x: number;
  y: number;
};

export type TMousemoveData = {
  source:
    | IncrementalSource.MouseMove
    | IncrementalSource.TouchMove
    | IncrementalSource.Drag;
  positions: TMousePosition[];
};

export type TViewportResizeData = {
  source: IncrementalSource.ViewportResize;
} & TViewportResizeDimension;

export type TViewportResizeDimension = {
  width: number;
  height: number;
};
