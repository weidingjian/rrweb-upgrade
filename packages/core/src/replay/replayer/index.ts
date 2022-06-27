import { ReplayerEvents, TEventWithTime } from "../../types";
import { Emitter, Handler, PlayerConfig, PlayerMetaData } from "../types";
import { defaultPlayerConfig } from "./util";
import { createPlayerService, createSpeedService } from "../merchine";
import { Mirror } from "../../snapshot";
import { mirror } from "../../utils/mirror";
import InitReplayPlugin from '../../plugins/replay/init';

class Replayer {
  public wrapper: HTMLDivElement;
  public iframe: HTMLIFrameElement;
  public emitter: Emitter;
  public service: ReturnType<typeof createPlayerService>;
  public speedService: ReturnType<typeof createSpeedService>;

  public get timer() {
    return this.service.state.context.timer;
  }

  public config: PlayerConfig;

  private initReplayPlugin: InitReplayPlugin

  constructor(events: (TEventWithTime | string)[], config?: PlayerConfig) {
    if (!config?.liveMode && events.length < 2) {
      throw new Error('Replayer need at least 2 events.');
    }

    const newConfig = Object.assign({}, defaultPlayerConfig, config);
    this.initReplayPlugin = new InitReplayPlugin(events, newConfig);

    this.config = this.initReplayPlugin.config;

    this.wrapper = this.initReplayPlugin.wrapper;
    this.iframe = this.initReplayPlugin.iframe;
    this.emitter = this.initReplayPlugin.emitter;
    this.service = this.initReplayPlugin.service;
    this.speedService = this.initReplayPlugin.speedService;

    this.on(ReplayerEvents.Play, () => {
      this.play(this.getCurrentTime());
    });

  }

  public on(event: string, handler: Handler) {
    this.emitter.on(event, handler);
    return this;
  }
  public off(event: string, handler: Handler) {
    this.emitter.off(event, handler);
    return this;
  }
  public setConfig(config: Partial<PlayerConfig>) {
    this.initReplayPlugin.setConfig(config);
  }

  public getMetaData(): PlayerMetaData {
    const firstEvent = this.service.state.context.events[0];
    const lastEvent = this.service.state.context.events[
      this.service.state.context.events.length - 1
    ];
    return {
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      totalTime: lastEvent.timestamp - firstEvent.timestamp,
    };
  }

  public getCurrentTime(): number {
    return this.timer.timeOffset + this.getTimeOffset();
  }

  public getTimeOffset(): number {
    const { baselineTime, events } = this.service.state.context;
    return baselineTime - events[0].timestamp;
  }

  public getMirror(): Mirror {
    return mirror;
  }
  /**
   * This API was designed to be used as play at any time offset.
   * Since we minimized the data collected from recorder, we do not
   * have the ability of undo an event.
   * So the implementation of play at any time offset will always iterate
   * all of the events, cast event before the offset synchronously
   * and cast event after the offset asynchronously with timer.
   * @param timeOffset number
   */
   public play(timeOffset = 0) {
    if (this.service.state.matches('paused')) {
      this.service.send({ type: 'PLAY', payload: { timeOffset } });
    } else {
      this.service.send({ type: 'PAUSE' });
      this.service.send({ type: 'PLAY', payload: { timeOffset } });
    }
    this.iframe.contentDocument
      ?.getElementsByTagName('html')[0]
      ?.classList.remove('rrweb-paused');
    this.emitter.emit(ReplayerEvents.Start);
  }

  public pause(timeOffset?: number) {
    if (timeOffset === undefined && this.service.state.matches('playing')) {
      this.service.send({ type: 'PAUSE' });
    }
    if (typeof timeOffset === 'number') {
      this.play(timeOffset);
      this.service.send({ type: 'PAUSE' });
    }
    this.iframe.contentDocument
      ?.getElementsByTagName('html')[0]
      ?.classList.add('rrweb-paused');
    this.emitter.emit(ReplayerEvents.Pause);
  }

  public resume(timeOffset = 0) {
    console.warn(
      `The 'resume' will be departed in 1.0. Please use 'play' method which has the same interface.`,
    );
    this.play(timeOffset);
    this.emitter.emit(ReplayerEvents.Resume);
  }

  public startLive(baselineTime?: number) {
    this.service.send({ type: 'TO_LIVE', payload: { baselineTime } });
  }

  public addEvent(rawEvent: TEventWithTime | string) {
    this.initReplayPlugin.addEvent(rawEvent);
  }

  public enableInteract() {
    this.iframe.setAttribute('scrolling', 'auto');
    this.iframe.style.pointerEvents = 'auto';
  }

  public disableInteract() {
    this.iframe.setAttribute('scrolling', 'no');
    this.iframe.style.pointerEvents = 'none';
  }

  /**
   * Empties the replayer's cache and reclaims memory.
   * The replayer will use this cache to speed up the playback.
   */
  public resetCache() {
    this.emitter.emit(ReplayerEvents.ResetCache);
  }
}


export default Replayer;
