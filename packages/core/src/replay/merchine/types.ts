
import { TEventWithTime } from "../../types";
import { Emitter, PlayerConfig } from "../types";
import Timer from "../timer";

export type SpeedContext = {
  normalSpeed: PlayerConfig['speed'];
  timer: Timer;
};

export type SpeedEvent =
  | {
      type: 'FAST_FORWARD';
      payload: { speed: PlayerConfig['speed'] };
    }
  | {
      type: 'BACK_TO_NORMAL';
    }
  | {
      type: 'SET_SPEED';
      payload: { speed: PlayerConfig['speed'] };
  };

export type SpeedState =
  | {
      value: 'normal';
      context: SpeedContext;
    }
  | {
      value: 'skipping';
      context: SpeedContext;
  };

export type PlayerContext = {
    events: TEventWithTime[];
    timer: Timer;
    timeOffset: number;
    baselineTime: number;
    lastPlayedEvent: TEventWithTime | null;
};

export type PlayerEvent =
  | {
      type: 'PLAY';
      payload: {
        timeOffset: number;
      };
    }
  | {
      type: 'CAST_EVENT';
      payload: {
        event: TEventWithTime;
      };
    }
  | { type: 'PAUSE' }
  | { type: 'TO_LIVE'; payload: { baselineTime?: number } }
  | {
      type: 'ADD_EVENT';
      payload: {
        event: TEventWithTime;
      };
    }
  | {
      type: 'END';
    };

export type PlayerState =
  | {
      value: 'playing';
      context: PlayerContext;
    }
  | {
      value: 'paused';
      context: PlayerContext;
    }
  | {
      value: 'live';
      context: PlayerContext;
    };



export type PlayerAssets = {
  emitter: Emitter;
  applyEventsSynchronously(events: Array<TEventWithTime>): void;
  getCastFn(event: TEventWithTime, isSync: boolean): () => void;
};


