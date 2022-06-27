import { createMachine, interpret, assign, StateMachine } from '@xstate/fsm';
import { SpeedContext, SpeedEvent, SpeedState } from './types';

export function createSpeedService(context: SpeedContext) {
  const speedMachine = createMachine<SpeedContext, SpeedEvent, SpeedState>(
    {
      id: 'speed',
      context,
      initial: 'normal',
      states: {
        normal: {
          on: {
            FAST_FORWARD: {
              target: 'skipping',
              actions: ['recordSpeed', 'setSpeed'],
            },
            SET_SPEED: {
              target: 'normal',
              actions: ['setSpeed'],
            },
          },
        },
        skipping: {
          on: {
            BACK_TO_NORMAL: {
              target: 'normal',
              actions: ['restoreSpeed'],
            },
            SET_SPEED: {
              target: 'normal',
              actions: ['setSpeed'],
            },
          },
        },
      },
    },
    {
      actions: {
        setSpeed: (ctx, event) => {
          if ('payload' in event) {
            ctx.timer.setSpeed(event.payload.speed);
          }
        },
        recordSpeed: assign({
          normalSpeed: (ctx) => ctx.timer.speed,
        }),
        restoreSpeed: (ctx) => {
          ctx.timer.setSpeed(ctx.normalSpeed);
        },
      },
    },
  );

  return interpret(speedMachine);
}
