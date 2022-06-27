import { ECanvasContext, TCanvasArg, TCanvasMutationCommand, TCanvasMutationData, TEventWithTime } from "../../../types";

export type TImageMap =  Map<TEventWithTime | string, HTMLImageElement>;
export type TCanvasMutationFn = (params: {
  event: TEventWithTime;
  mutation: TCanvasMutationCommand<TCanvasArg>;
  target: HTMLCanvasElement;
  imageMap: TImageMap;
  type?: ECanvasContext;
  errorHandler: ( d: TCanvasMutationData | TCanvasMutationCommand,
    error: unknown,) => void;
})
 => Promise<void>;
