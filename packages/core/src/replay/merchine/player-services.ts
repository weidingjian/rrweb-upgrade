import { createMachine, interpret, assign } from '@xstate/fsm';
import { EventType, IncrementalSource, ReplayerEvents, TEventWithTime } from '../../types';
import { IActionWithDelay } from '../timer/types';
import { PlayerAssets, PlayerContext, PlayerEvent, PlayerState } from './types';
import { addDelay, discardPriorSnapshots } from './util';

let getCastFn: PlayerAssets['getCastFn'] = (event, isSync) => (() => {});
let applyEventsSynchronously: PlayerAssets['applyEventsSynchronously']  = () => {};
let emitter: PlayerAssets['emitter'] = {
  emit: () => {},
  on: () => {},
  off: () => {}
}
export function createPlayerService(
  context: PlayerContext,
) {
  const playerMachine = createMachine<PlayerContext, PlayerEvent, PlayerState>(
    {
      id: 'player',
      context,
      initial: 'paused',
      states: {
        playing: {
          on: {
            PAUSE: {
              target: 'paused',
              actions: ['pause'],
            },
            CAST_EVENT: {
              target: 'playing',
              actions: 'castEvent',
            },
            END: {
              target: 'paused',
              actions: ['resetLastPlayedEvent', 'pause'],
            },
            ADD_EVENT: {
              target: 'playing',
              actions: ['addEvent'],
            },
          },
        },
        paused: {
          on: {
            PLAY: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
            CAST_EVENT: {
              target: 'paused',
              actions: 'castEvent',
            },
            TO_LIVE: {
              target: 'live',
              actions: ['startLive'],
            },
            ADD_EVENT: {
              target: 'paused',
              actions: ['addEvent'],
            },
          },
        },
        live: {
          on: {
            ADD_EVENT: {
              target: 'live',
              actions: ['addEvent'],
            },
            CAST_EVENT: {
              target: 'live',
              actions: ['castEvent'],
            },
          },
        },
      },
    },
    {
      actions: {
        castEvent: assign({
          lastPlayedEvent: (ctx, event) => {
            if (event.type === 'CAST_EVENT') {
              return event.payload.event;
            }
            return ctx.lastPlayedEvent;
          },
        }),
        recordTimeOffset: assign((ctx, event) => {
          let timeOffset = ctx.timeOffset;
          if ('payload' in event && 'timeOffset' in event.payload) {
            timeOffset = event.payload.timeOffset;
          }
          return {
            ...ctx,
            timeOffset,
            baselineTime: ctx.events[0].timestamp + timeOffset,
          };
        }),
        play(ctx) {
          const { timer, events, baselineTime, lastPlayedEvent } = ctx;
          timer.clear();

          for (const event of events) {
            // TODO: improve this API
            addDelay(event, baselineTime);
          }
          const neededEvents = discardPriorSnapshots(events, baselineTime);

          let lastPlayedTimestamp = lastPlayedEvent?.timestamp;
          if (
            lastPlayedEvent?.type === EventType.IncrementalSnapshot &&
            lastPlayedEvent.data.source === IncrementalSource.MouseMove
          ) {
            lastPlayedTimestamp =
              lastPlayedEvent.timestamp +
              lastPlayedEvent.data.positions[0]?.timeOffset;
          }
          if (baselineTime < (lastPlayedTimestamp || 0)) {
            emitter.emit(ReplayerEvents.PlayBack);
          }

          const syncEvents = new Array<TEventWithTime>();
          const actions = new Array<IActionWithDelay>();
          for (const event of neededEvents) {
            if (
              lastPlayedTimestamp &&
              lastPlayedTimestamp < baselineTime &&
              (event.timestamp <= lastPlayedTimestamp ||
                event === lastPlayedEvent)
            ) {
              continue;
            }
            if (event.timestamp < baselineTime) {
              syncEvents.push(event);
            } else {
              const castFn = getCastFn(event, false);
              actions.push({
                doAction: () => {
                  castFn();
                },
                delay: event.delay!,
              });
            }
          }
          applyEventsSynchronously(syncEvents);
          emitter.emit(ReplayerEvents.Flush);
          timer.addActions(actions);
          timer.start();
        },
        pause(ctx) {
          ctx.timer.clear();
        },
        resetLastPlayedEvent: assign((ctx) => {
          return {
            ...ctx,
            lastPlayedEvent: null,
          };
        }),
        startLive: assign({
          baselineTime: (ctx, event) => {
            ctx.timer.toggleLiveMode(true);
            ctx.timer.start();
            if (event.type === 'TO_LIVE' && event.payload.baselineTime) {
              return event.payload.baselineTime;
            }
            return Date.now();
          },
        }),
        addEvent: assign((ctx, machineEvent) => {
          const { baselineTime, timer, events } = ctx;
          if (machineEvent.type === 'ADD_EVENT') {
            const { event } = machineEvent.payload;
            addDelay(event, baselineTime);

            let end = events.length - 1;
            if (!events[end] || events[end].timestamp <= event.timestamp) {
              // fast track
              events.push(event);
            } else {
              let insertionIndex = -1;
              let start = 0;
              while (start <= end) {
                const mid = Math.floor((start + end) / 2);
                if (events[mid].timestamp <= event.timestamp) {
                  start = mid + 1;
                } else {
                  end = mid - 1;
                }
              }
              if (insertionIndex === -1) {
                insertionIndex = start;
              }
              events.splice(insertionIndex, 0, event);
            }

            const isSync = event.timestamp < baselineTime;
            const castFn = getCastFn(event, isSync);
            if (isSync) {
              castFn();
            } else if (timer.isActive()) {
              timer.addAction({
                doAction: () => {
                  castFn();
                },
                delay: event.delay!,
              });
            }
          }
          return { ...ctx, events };
        }),
      },
    },
  );
  const serverice = interpret(playerMachine);
  Object.defineProperty(serverice, 'setAssets', {
    value(config: PlayerAssets) {
      getCastFn = config.getCastFn;
      applyEventsSynchronously = config.applyEventsSynchronously;
      emitter = config.emitter;
    }
  })
  return serverice;
}
