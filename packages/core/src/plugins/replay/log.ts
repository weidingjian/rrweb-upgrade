
import { ORIGINAL_ATTRIBUTE_NAME } from '../../constant';
import { TEventWithTime, TLogData } from '../../types';
import ReplayPlugin from './plugin';
import { ReplayLogger } from './types';

type PatchedConsoleLog = {
  [ORIGINAL_ATTRIBUTE_NAME]: typeof console.log;
};

class LogReplayPlugin extends ReplayPlugin {
  private replayLogger: ReplayLogger = this.getConsoleLogger();

  public replay(event: TEventWithTime, isSync?: boolean): void {
    let logData = event.data as TLogData;
    if (logData) {
      try {
        if (typeof this.replayLogger[logData.level] === 'function') {
          this.replayLogger[logData.level]!(logData);
        }
      } catch (error) {
        if (this.config.showWarning) {
          console.warn(error);
        }
      }
    }
  }

  private getConsoleLogger() {
    const replayLogger: ReplayLogger = {};
    for (const level of this.config.level!) {
      if (level === 'trace') {
        replayLogger[level] = (data: TLogData) => {
          const logger = ((console.log as unknown) as PatchedConsoleLog)[
            ORIGINAL_ATTRIBUTE_NAME
          ]
            ? ((console.log as unknown) as PatchedConsoleLog)[
                ORIGINAL_ATTRIBUTE_NAME
              ]
            : console.log;
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
      } else {
        replayLogger[level] = (data: TLogData) => {
          const logger = ((console[level] as unknown) as PatchedConsoleLog)[
            ORIGINAL_ATTRIBUTE_NAME
          ]
            ? ((console[level] as unknown) as PatchedConsoleLog)[
                ORIGINAL_ATTRIBUTE_NAME
              ]
            : console[level];
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
      }
    }
    return replayLogger;
  }

  /**
   * format the trace data to a string
   * @param data the log data
   */
   private formatMessage(data: TLogData): string {
    if (data.trace.length === 0) {
      return '';
    }
    const stackPrefix = '\n\tat ';
    let result = stackPrefix;
    result += data.trace.join(stackPrefix);
    return result;
  }
}

export default LogReplayPlugin;
