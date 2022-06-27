import { StringifyOptions } from "../../util/stringify";
import { EventType, IContextOptions, IncrementalSource } from '../../../types';


export type LogPayload = {
  level: LogLevel;
  trace: string[];
  payload: string[];
};

export type LogLevel =
  | 'assert'
  | 'clear'
  | 'count'
  | 'countReset'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'info'
  | 'log'
  | 'table'
  | 'time'
  | 'timeEnd'
  | 'timeLog'
  | 'trace'
  | 'warn';

 /* fork from interface Console */
// all kinds of console functions
export type Logger = {
  assert?: typeof console.assert;
  clear?: typeof console.clear;
  count?: typeof console.count;
  countReset?: typeof console.countReset;
  debug?: typeof console.debug;
  dir?: typeof console.dir;
  dirxml?: typeof console.dirxml;
  error?: typeof console.error;
  group?: typeof console.group;
  groupCollapsed?: typeof console.groupCollapsed;
  groupEnd?: () => void;
  info?: typeof console.info;
  log?: typeof console.log;
  table?: typeof console.table;
  time?: typeof console.time;
  timeEnd?: typeof console.timeEnd;
  timeLog?: typeof console.timeLog;
  trace?: typeof console.trace;
  warn?: typeof console.warn;
};

export interface LogRecordOptions {
  level?: LogLevel[];
  lengthThreshold?: number;
  stringifyOptions?: StringifyOptions;
  logger?: Logger | 'console';
  win: IContextOptions['win'];
};

export type TLogData =  {
  source: IncrementalSource.Log;
} & LogPayload;
