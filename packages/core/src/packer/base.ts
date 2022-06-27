import type { TEventWithTime } from '../types';

export type PackFn = (event: TEventWithTime) => string;
export type UnpackFn = (raw: string) => TEventWithTime;

export type eventWithTimeAndPacker = TEventWithTime & {
  v: string;
};

export const MARK = 'v1';
