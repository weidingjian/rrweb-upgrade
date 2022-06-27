import { ICommonOptions, IncrementalSource } from '../../../types';

export interface IMediaInteractionOptions extends ICommonOptions {
  // win: IContextOptions['win'];
  hooks?: {
    mediaInteaction?: (payload: TMediaInteractionParam) => void;
  }
}

export const enum MediaInteractions {
  Play,
  Pause,
  Seeked,
  VolumeChange,
}

export type TMediaInteractionParam = {
  type: MediaInteractions;
  id: number;
  currentTime?: number;
  volume?: number;
  muted?: boolean;
};

export type TMediaInteractionData = {
  source: IncrementalSource.MediaInteraction;
} & TMediaInteractionParam;
