import { ICommonOptions, IContextOptions, IncrementalSource } from "../../../types";

export interface ICanvas extends HTMLCanvasElement {
  __context: string;
}

export interface ICanvasRecordPluginOptions extends ICommonOptions{
  recordCanvas?: boolean;
  win: IContextOptions['win'];
  hooks?: {
    canvasMutation?: (payload: TCanvasMutationParam) => void;
  }
}

export enum ECanvasContext {
  '2D',
  WebGL,
  WebGL2,
}

export type TSerializedCanvasArg =
  | {
      rr_type: 'ArrayBuffer';
      base64: string; // base64
    }
  | {
      rr_type: 'Blob';
      data: Array<TCanvasArg>;
      type?: string;
    }
  | {
      rr_type: string;
      src: string; // url of image
    }
  | {
      rr_type: string;
      args: Array<TCanvasArg>;
    }
  | {
      rr_type: string;
      index: number;
    };

export type TCanvasArg =
  | TSerializedCanvasArg
  | string
  | number
  | boolean
  | null
  | TCanvasArg[];

export type TCanvasMutationCommand<T=unknown> = {
  property: string;
  args: Array<T>;
  setter?: true;
};

export type TCanvasMutationParam =
  | {
      id: number;
      type: ECanvasContext;
      commands: TCanvasMutationCommand[];
    }
  | ({
      id: number;
      type: ECanvasContext;
    } & TCanvasMutationCommand);

export type TCanvasMutationWithType = {
  type: ECanvasContext;
} & TCanvasMutationCommand;

export type TCanvasMutationCallback = (
  target: HTMLCanvasElement,
  p: TCanvasMutationWithType,
) => void;

export type TCanvasMutationData = {
  source: IncrementalSource.CanvasMutation;
} & TCanvasMutationParam;
