
import { SKIP_TIME_INTERVAL, SKIP_TIME_THRESHOLD } from '../../constant';
import { createPlayerService, createSpeedService } from '../../replay/merchine';
import { Handler, PlayerConfig } from '../../replay/types';
import Timer from '../../replay/timer';
import { EventType, IncrementalSource, metaEvent, ReplayerEvents, TEventWithTime, TViewportResizeDimension } from '../../types';
import CanvasReplayPlugin from './canvas';
import CssRelayPlugin from './css';
import DOMRelayPlugin from './dom';
import DOMEventsReplayPlugin from './dom-events';
import FontReplayPlugin from './font';
import FullSnapShotReplayPlugin from './full-snapshot';
import ReplayPlugin from './plugin';
import { IReplayPluginCtx } from './types';
import { indicatesTouchDevice, initDom } from './util';
import LogReplayPlugin from './log';
class InitReplayPlugin extends ReplayPlugin {
  public wrapper: HTMLDivElement;
  public iframe: HTMLIFrameElement;

  public emitter = {
    emit: this.emit,
    on: this.listen,
    off: this.off,
  }
  public service: ReturnType<typeof createPlayerService>;
  public speedService: ReturnType<typeof createSpeedService>;

  private nextUserInteractionEvent: TEventWithTime | null = null;
  private mouseTail: HTMLCanvasElement | null = null;

  private domPlugin: DOMRelayPlugin | null = null;
  private cssPlugin: CssRelayPlugin | null = null;
  private canvasPlugin: CanvasReplayPlugin | null = null;
  private domEventsPlugin: DOMEventsReplayPlugin | null = null;
  private fontPlugin: FontReplayPlugin | null = null;
  private fullsnapshotPlugin: FullSnapShotReplayPlugin | null = null;
  private logPlugin: LogReplayPlugin | null = null
  private initReplayPlugins(config: PlayerConfig, ctx: IReplayPluginCtx) {
    this.domPlugin = new DOMRelayPlugin(config, ctx);
    this.cssPlugin = new CssRelayPlugin(config, ctx);

    this.canvasPlugin = new CanvasReplayPlugin(config, ctx);

    this.domEventsPlugin = new DOMEventsReplayPlugin(config, ctx);
    this.fontPlugin = new FontReplayPlugin(config, ctx);
    this.fullsnapshotPlugin = new FullSnapShotReplayPlugin(config, ctx);
    this.logPlugin = new LogReplayPlugin(config, ctx);
  }

  constructor(events: (TEventWithTime | string)[], config: PlayerConfig) {
    const { iframe, mouse, mouseTail, wrapper } = initDom(config);

    const timer = new Timer([], config.speed);

    const service = createPlayerService(
      {
        events: events.map((e) => {
            if (config && config.unpackFn) {
              return config.unpackFn(e as string);
            }
            return e as TEventWithTime;
          })
          .sort((a1, a2) => a1.timestamp - a2.timestamp),
        timer,
        timeOffset: 0,
        baselineTime: 0,
        lastPlayedEvent: null,
      },
    );

    const speedService = createSpeedService({
      normalSpeed: -1,
      timer,
    });

    const ctx = {
      iframe,
      mouse,
      mouseTail,
      timer,
      service,
      speedService
    };

    super(config, ctx);

    this.mouseTail = mouseTail;
    this.service = service;
    this.speedService = speedService;
    this.wrapper = wrapper;
    this.iframe = iframe;

    this.initReplayPlugins(config, ctx);

    this.listen(ReplayerEvents.Resize, this.handleResize as Handler);

    // @ts-ignore
    service.setAssets({
      getCastFn: this.getCastFn,
      applyEventsSynchronously: this.applyEventsSynchronously,
      emitter: this.emitter,
    });

    service.start();
    service.subscribe((state) => {
      this.emit(ReplayerEvents.StateChange, {
        player: state,
      });
    });

    speedService.start();
    speedService.subscribe((state) => {
      this.emit(ReplayerEvents.StateChange, {
        speed: state,
      });
    });

    // rebuild first full snapshot as the poster of the player
    // maybe we can cache it for performance optimization
    const firstMeta = service.state.context.events.find(
      (e) => e.type === EventType.Meta,
    );
    const firstFullsnapshot = service.state.context.events.find(
      (e) => e.type === EventType.FullSnapshot,
    );

    if (firstMeta) {
      const { width, height } = firstMeta.data as metaEvent['data'];
      setTimeout(() => {
        this.emit(ReplayerEvents.Resize, {
          width,
          height,
        });
      }, 0);
    }

    if (firstFullsnapshot) {
      setTimeout(() => {
        this.emit(ReplayerEvents.FirstFullsnapshot, firstFullsnapshot);
      }, 1);
    }

    if (service.state.context.events.find(indicatesTouchDevice)) {
      mouse.classList.add('touch-device');
    }
  }

  private handleResize = (dimension: TViewportResizeDimension) => {
    this.iframe.style.display = 'inherit';
    for (const el of [this.mouseTail, this.iframe]) {
      if (!el) {
        continue;
      }
      el.setAttribute('width', String(dimension.width));
      el.setAttribute('height', String(dimension.height));
    }
  }
  public setConfig(config: Partial<PlayerConfig>) {
    Object.keys(config).forEach((key) => {
      // @ts-ignore
      this.config[key] = config[key];
    });

    if (!this.config.skipInactive) {
      this.backToNormal();
    }
    if (typeof config.speed !== 'undefined') {
      this.speedService.send({
        type: 'SET_SPEED',
        payload: {
          speed: config.speed,
        },
      });
    }
    if (typeof config.mouseTail !== 'undefined') {
      if (config.mouseTail === false) {
        if (this.mouseTail) {
          this.mouseTail.style.display = 'none';
        }
      } else {
        if (!this.mouseTail) {
          this.mouseTail = document.createElement('canvas');
          this.mouseTail.width = Number.parseFloat(this.iframe.width);
          this.mouseTail.height = Number.parseFloat(this.iframe.height);
          this.mouseTail.classList.add('replayer-mouse-tail');
          this.wrapper.insertBefore(this.mouseTail, this.iframe);
        }
        this.mouseTail.style.display = 'inherit';
      }
    }
  }
  public addEvent(rawEvent: TEventWithTime | string) {
    const event = this.config.unpackFn
      ? this.config.unpackFn(rawEvent as string)
      : (rawEvent as TEventWithTime);
    if (indicatesTouchDevice(event)) {
      this.ctx.mouse.classList.add('touch-device');
    }
    Promise.resolve().then(() =>
      this.service.send({ type: 'ADD_EVENT', payload: { event } }),
    );
  }

  private applyEventsSynchronously = (events: Array<TEventWithTime>) => {
    for (const event of events) {
      switch (event.type) {
        case EventType.DomContentLoaded:
        case EventType.Load:
        case EventType.Custom:
          continue;
        case EventType.FullSnapshot:
        case EventType.Meta:
        case EventType.Plugin:
        case EventType.IncrementalSnapshot:
          break;
        default:
          break;
      }
      const castFn = this.getCastFn(event, true);
      castFn();
    }
    this.emit(ReplayerEvents.ToggleTouchActive);
  }

  public replay(event: TEventWithTime, isSync?: boolean): void {

  }
  private getCastFn(event: TEventWithTime, isSync: boolean) {
    let castFn: undefined | (() => void);

    if([EventType.DomContentLoaded, EventType.Load].includes(event.type)) {
      castFn = undefined;
    } else if(event.type === EventType.Custom) {
      castFn = () => {
        /**
         * emit custom-event and pass the event object.
         *
         * This will add more value to the custom event and allows the client to react for custom-event.
         */
        this.emit(ReplayerEvents.CustomEvent, event);
      };
    } else if(event.type === EventType.Meta) {
      castFn = () => {
        this.emit(ReplayerEvents.Resize, {
          width: event.data.width,
          height: event.data.height,
        });
      }
    } else if(event.type === EventType.FullSnapshot) {
      castFn = () => {
        this.fullsnapshotPlugin?.replay(event, isSync);
      }
    } else if(event.type === EventType.IncrementalSnapshot) {
      castFn = () => {
        const { data: d } = event;
        switch(d.source) {
          case IncrementalSource.Mutation:
              this.domPlugin?.replay(event);
              break;
          case IncrementalSource.Drag:
          case IncrementalSource.TouchMove:
          case IncrementalSource.MouseMove:
          case IncrementalSource.MouseInteraction:
          case IncrementalSource.Scroll:
          case IncrementalSource.ViewportResize:
          case IncrementalSource.Input:
          case IncrementalSource.MediaInteraction:
              this.domEventsPlugin?.replay(event, isSync);
              break;
          case IncrementalSource.StyleSheetRule:
          case IncrementalSource.StyleDeclaration:
              this.cssPlugin?.replay(event);
              break;
          case IncrementalSource.CanvasMutation:
              this.canvasPlugin?.replay(event, isSync);
              break;
          case IncrementalSource.Font:
              this.fontPlugin?.replay(event, isSync);
              break;
          case IncrementalSource.Log:
              this.logPlugin?.replay(event, isSync);
              break;
          default:
        }

        if (isSync) {
          // do not check skip in sync
          return;
        }
        this.checkSkip(event);
      };
    }

    return () => {
      if (castFn) {
        castFn();
      }
      // for (const plugin of this.config.plugins || []) {
      //   plugin.handler(event, isSync, { replayer: this });
      // }
      this.sendCastEvent(event);
    };
  }
  private checkSkip(event: TEventWithTime) {
    if (event === this.nextUserInteractionEvent) {
      this.nextUserInteractionEvent = null;
      this.backToNormal();
    }
    if (this.config.skipInactive && !this.nextUserInteractionEvent) {
      for (const _event of this.service.state.context.events) {
        if (_event.timestamp <= event.timestamp) {
          continue;
        }
        if (this.isUserInteraction(_event)) {
          if (
            _event.delay! - event.delay! >
            SKIP_TIME_THRESHOLD *
              this.speedService.state.context.timer.speed
          ) {
            this.nextUserInteractionEvent = _event;
          }
          break;
        }
      }
      if (this.nextUserInteractionEvent) {
        const skipTime =
          this.nextUserInteractionEvent.delay! - event.delay!;
        const payload = {
          speed: Math.min(
            Math.round(skipTime / SKIP_TIME_INTERVAL),
            this.config.maxSpeed,
          ),
        };
        this.speedService.send({ type: 'FAST_FORWARD', payload });
        this.emit(ReplayerEvents.SkipStart, payload);
      }
    }
  }
  private sendCastEvent(event: TEventWithTime) {
    this.service.send({ type: 'CAST_EVENT', payload: { event } });

    // events are kept sorted by timestamp, check if this is the last event
    const last_index = this.service.state.context.events.length - 1;
    const finish = () => {
      if (last_index < this.service.state.context.events.length - 1) {
        // more events have been added since the setTimeout
        return;
      }
      this.backToNormal();
      this.service.send('END');
      this.emit(ReplayerEvents.Finish);
    };

    if (event === this.service.state.context.events[last_index]) {
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.MouseMove &&
        event.data.positions.length
      ) {
        // defer finish event if the last event is a mouse move
        setTimeout(() => {
          finish();
        }, Math.max(0, -event.data.positions[0].timeOffset + 50)); // Add 50 to make sure the timer would check the last mousemove event. Otherwise, the timer may be stopped by the service before checking the last event.
      } else {
        finish();
      }
    }

    this.emit(ReplayerEvents.EventCast, event);
  }
  private backToNormal() {
    this.nextUserInteractionEvent = null;
    if (this.speedService.state.matches('normal')) {
      return;
    }
    this.speedService.send({ type: 'BACK_TO_NORMAL' });

    this.emit(ReplayerEvents.SkipEnd, {
      speed: this.speedService.state.context.normalSpeed,
    });
  }

  private isUserInteraction(event: TEventWithTime): boolean {
    if (event.type !== EventType.IncrementalSnapshot) {
      return false;
    }
    return (
      event.data.source > IncrementalSource.Mutation &&
      event.data.source <= IncrementalSource.Input
    );
  }
}

export default InitReplayPlugin;
