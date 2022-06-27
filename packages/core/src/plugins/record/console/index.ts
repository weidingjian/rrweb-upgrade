import { ErrorStackParser, StackFrame } from '../../util/error-stack-parser';
import { stringify } from '../../util/stringify';
import RecordPlugin from '../plugin';
import { LogPayload, Logger, LogLevel, LogRecordOptions, TLogData } from './types';
import { rewritMethod } from '../../util/rewrite-method';
import { EventType, IncrementalSource } from '../../../types';

const defaultLogOptions: Omit<LogRecordOptions, 'win'> = {
  level: [
    'assert',
    'clear',
    'count',
    'countReset',
    'debug',
    'dir',
    'dirxml',
    'error',
    'group',
    'groupCollapsed',
    'groupEnd',
    'info',
    'log',
    'table',
    'time',
    'timeEnd',
    'timeLog',
    'trace',
    'warn',
  ],
  lengthThreshold: 1000,
  logger: 'console',
};

class ConsoleRecordPlugins extends RecordPlugin {
  private restoreMethodHandles: (() => void)[] = [];
  private logCount: number = 0;
  constructor(private options: LogRecordOptions) {
    super();
    Object.assign(this.options, defaultLogOptions);
    this.observer();
  }
  private record(payload: LogPayload) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Log,
        ...payload
      }
    })
  }
  private observer() {
    const {win, logger: loggerType, level, stringifyOptions } = this.options;
    if (!loggerType) {
      return;
    }
    let logger: Logger;
    if (typeof loggerType === 'string') {
      logger = win[loggerType];
    } else {
      logger = loggerType;
    }

    if (level!.includes('error')) {
      if (window) {
        const errorHandler = (event: ErrorEvent) => {
          const { message, error } = event;
          const trace: string[] = ErrorStackParser.parse(
            error,
          ).map((stackFrame: StackFrame) => stackFrame.toString());

          const payload = [stringify(message, stringifyOptions)];
          this.record({
            level: 'error',
            trace,
            payload,
          });
        };
        window.addEventListener('error', errorHandler);
        this.restoreMethodHandles.push(() => {
          if (window) window.removeEventListener('error', errorHandler);
        });
      }
    }
    for (const levelType of level!) {
      if (!logger[levelType]) {
        continue;
      }
      this.restoreMethodHandles.push(this.replaceMethod(logger, levelType));
    }
  }
  private replaceMethod(_logger: Logger, level: LogLevel) {
    const {stringifyOptions, lengthThreshold} = this.options;
    const self = this;
    // replace the logger.{level}. return a restore function
    return rewritMethod<Logger>(
      _logger,
      level,
      // @ts-ignore
      function(original){
      return function(this: Logger , ...args: Array<unknown>){
        (original as Function).apply(this, args);

        try {
          const trace = ErrorStackParser.parse(new Error())
            .map((stackFrame: StackFrame) => stackFrame.toString())
            .splice(1); // splice(1) to omit the hijacked log function
          const payload = args.map((s) =>
            stringify(s, stringifyOptions),
          );
          self.logCount++;

          if (self.logCount < lengthThreshold!) {
            self.record({
              level,
              trace,
              payload,
            });
            return;
          }

          if (self.logCount === lengthThreshold) {
            // notify the user
            self.record({
              level: 'warn',
              trace: [],
              payload: [
                stringify('The number of log records reached the threshold.'),
              ],
            });
          }
        } catch (error) {
          // @ts-ignore
          original?.('rrweb logger error:', error, ...args);
        }
      };
    });
  }
  public stopRecord(): void {
    this.restoreMethodHandles.forEach(h => h());
  }
}

export default ConsoleRecordPlugins;
