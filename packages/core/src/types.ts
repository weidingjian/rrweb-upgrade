import { ECanvasContext, ICanvasRecordPluginOptions, TCanvasArg, TCanvasMutationCommand, TCanvasMutationData, TCanvasMutationParam, TSerializedCanvasArg } from "./plugins/record/canvas/types";
import { LogLevel, LogRecordOptions, TLogData } from "./plugins/record/console/types";
import { ICssRecordPluginOptions, TStyleDeclarationData, TStyleSheetRuleData } from "./plugins/record/css/types";
import { IEventOptions, MouseInteractions, TInputData, TMouseInteractionData, TMousemoveData, TScrollData, TViewportResizeData, TViewportResizeDimension } from "./plugins/record/dom-events/types";
import { IDOMRecordPluginOptions, TMutationData } from "./plugins/record/dom/types";
import { IFontOptions, TFontData } from "./plugins/record/font/types";
import { IFullSnapshotOptions } from "./plugins/record/full-snapshot/types";
import { FullSnapshotEvent, metaEvent, TEventWithTime, TIncrementalData } from "./plugins/record/init/types";
import { IMediaInteractionOptions, MediaInteractions, TMediaInteractionData } from "./plugins/record/media-interaction/types";
import { IShadowDomOptions } from "./plugins/record/shadow-dom/types";
import { MaskInputFn, MaskTextFn, MaskInputOptions, } from "./snapshot";

export * from './plugins/record/dom/types';


export enum ERecordPluginType {
  Full,
  Increment,
  Start,
}

export enum ERecordEvent {
  Recording = 'recording',
  StartRecord = 'start-record',
  TaskFullSnapshot = 'take-full-snapshot',
  StopRecord = 'stop-record',
  CollectStopRecordFn = 'collect-stop-record-fn',
  NeedGetRecordData = 'need-get-record-data',
  GetMemoryRecordData = 'get-memory-record-data',
  StoreIfame = 'add-iframe',
  AttachIframe = 'attach-iframe',
  AttachShadowDom = 'attach-shadowDom',
  AddShadowRoot = 'add-shadow-root',
  LockMutation = 'lock-mutation',
  UnlokcMutation = 'unlock-mutation'
}

export interface IContextOptions {
  doc: Document;
  win: IWindow;
}

export type TBlockClass = string | RegExp;

export interface IMaskOptions {
  maskTextClass?: TBlockClass;
  maskTextSelector?: string;
  maskTextFn?: MaskTextFn;
  maskInputOptions?: MaskInputOptions;
  maskInputFn?: MaskInputFn;
  maskAllInputs?: boolean;
}

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;


export type IWindow = Window & typeof globalThis;


export type SamplingStrategy = Partial<{
  /**
   * false means not to record mouse/touch move events
   * number is the throttle threshold of recording mouse/touch move
   */
  mousemove: boolean | number;
  /**
   * number is the throttle threshold of mouse/touch move callback
   */
  mousemoveCallback: number;
  /**
   * false means not to record mouse interaction events
   * can also specify record some kinds of mouse interactions
   */
  mouseInteraction: boolean | Record<string, boolean | undefined>;
  /**
   * number is the throttle threshold of recording scroll
   */
  scroll: number;
  /**
   * number is the throttle threshold of recording media interactions
   */
  media: number;
  /**
   * 'all' will record all the input eventsCanvasContextCanvasContext
   * 'last' will only record the last input value while input a sequence of chars
   */
  input: 'all' | 'last';
  /**
   * 'all' will record every single canvas call
   * number between 1 and 60, will record an image snapshots in a web-worker a (maximum) number of times per second.
   *                          Number only supported where [`OffscreenCanvas`](http://mdn.io/offscreencanvas) is supported.
   */
  canvas: 'all' | number;

  log: Omit<LogRecordOptions, 'win'>;

  network: 'all' | 'xhr' | 'fetch'
}>;

export interface ICommonOptions {
  blockClass?: TBlockClass;
  sampling?: SamplingStrategy;
}

export type throttleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

export enum IncrementalSource {
  Mutation,
  MouseMove,
  MouseInteraction,
  Scroll,
  ViewportResize,
  Input,
  TouchMove,
  MediaInteraction,
  StyleSheetRule,
  CanvasMutation,
  Font,
  Log,
  Drag,
  StyleDeclaration,
  Network,
}

export enum EventType {
  DomContentLoaded,
  Load,
  FullSnapshot,
  IncrementalSnapshot,
  Meta,
  Custom,
  Plugin,
}

export type THooks = ICanvasRecordPluginOptions['hooks'] |
    IDOMRecordPluginOptions['hooks'] |
    ICssRecordPluginOptions['hooks'] |
    IEventOptions['hooks'] |
    IFontOptions['hooks'] |
    IMediaInteractionOptions['hooks'];

export type recordOptions<T = TEventWithTime> = Omit<
  {
    emit: (e: T, isCheckout?: boolean) => void;
    hooks?: THooks;
  } &
  Partial<
    IFullSnapshotOptions &
    ICanvasRecordPluginOptions &
    IDOMRecordPluginOptions &
    ICssRecordPluginOptions &
    IEventOptions & IFontOptions &
    IMediaInteractionOptions &
    IShadowDomOptions
  >, 'doc' | 'win'>;

export {
  TEventWithTime,
  metaEvent,
  MouseInteractions,
  FullSnapshotEvent,
  TIncrementalData,
  TMousemoveData,
  TMouseInteractionData,
  TScrollData,
  TViewportResizeData,
  TInputData,
  TMediaInteractionData,
  MediaInteractions,
  TStyleSheetRuleData,
  TStyleDeclarationData,
  TCanvasMutationData,
  TCanvasMutationCommand,
  TCanvasArg,
  TSerializedCanvasArg,
  ECanvasContext,
  TCanvasMutationParam,
  TFontData,
  TViewportResizeDimension,
  TLogData,
  LogLevel
}

export enum ReplayerEvents {
  Start = 'start',
  Pause = 'pause',
  Resume = 'resume',
  Resize = 'resize',
  Finish = 'finish',
  Play = 'play',
  ResetCache = 'reset-cache',
  ToggleTouchActive = 'toggle-touch-active',
  FirstFullsnapshot = 'first-full-snapshot',
  FullsnapshotRebuilded = 'fullsnapshot-rebuilded',
  LoadStylesheetStart = 'load-stylesheet-start',
  LoadStylesheetEnd = 'load-stylesheet-end',
  SkipStart = 'skip-start',
  SkipEnd = 'skip-end',
  MouseInteraction = 'mouse-interaction',
  EventCast = 'event-cast',
  CustomEvent = 'custom-event',
  Flush = 'flush',
  StateChange = 'state-change',
  PlayBack = 'play-back',
}


