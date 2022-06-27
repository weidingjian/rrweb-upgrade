// import { createPlayerService, createSpeedService } from "../../replay/merchine";
import { PlayerConfig } from "../../replay/types";
// import Timer from "../../replay/timer";
import { TEventWithTime, TIncrementalData } from "../../types";
import eventCenter from '../../utils/event-center';
import { IReplayPluginCtx } from "./types";

const REPLAY_CONSOLE_PREFIX = '[replayer]';

abstract class ReplayPlugin {

    protected listen(eventName: string, handler: (...args: any[]) => void) {
      eventCenter.on(eventName, handler);
    }
    public emit(eventName: string, ...args: any[]) {
      eventCenter.emit(eventName, ...args);
    }
    public off(eventName: string, handler: any) {
      eventCenter.off(eventName, handler);
    }
    constructor(public config: PlayerConfig, protected ctx: IReplayPluginCtx) {
      this.init();
    }

    protected init() {}

    public abstract replay(event: TEventWithTime, isSync?: boolean): void;

    protected warnNodeNotFound(data: TIncrementalData, id: number) {
      this.warn(`Node with id '${id}' not found. `, data);
    }

    protected warn(...args: Parameters<typeof console.warn>) {
      if (!this.config.showWarning) {
        return;
      }
      console.warn(REPLAY_CONSOLE_PREFIX, ...args);
    }

    protected debug(...args: Parameters<typeof console.log>) {
      if (!this.config.showDebug) {
        return;
      }
      // tslint:disable-next-line: no-console
      console.log(REPLAY_CONSOLE_PREFIX, ...args);
    }

    protected debugNodeNotFound(d: TIncrementalData, id: number) {
      /**
       * There maybe some valid scenes of node not being found.
       * Because DOM events are macrotask and MutationObserver callback
       * is microtask, so events fired on a removed DOM may emit
       * snapshots in the reverse order.
       */
      this.debug(REPLAY_CONSOLE_PREFIX, `Node with id '${id}' not found. `, d);
    }
}

export default ReplayPlugin;
