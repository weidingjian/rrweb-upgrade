
import {
  TEventWithTime,
  TCanvasMutationData,
  TCanvasMutationCommand,
  TCanvasMutationParam,
  ECanvasContext,
  TCanvasArg,
  ReplayerEvents,
  EventType,
  IncrementalSource
} from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
import { canvas2DMutaiton } from './2d';
import { deserializeArg } from './deserialize-args';
import { canvasWebGLMutaiton } from './webgl';

class CanvasReplayPlugin extends ReplayPlugin {
  private imageMap: Map<TEventWithTime | string, HTMLImageElement> = new Map();
  private canvasEventMap: Map<TEventWithTime, TCanvasMutationParam> = new Map();

  private warnCanvasMutationFailed = (
    d: TCanvasMutationData | TCanvasMutationCommand,
    error: unknown,
  ) => {
    this.warn(`Has error on canvas update`, error, 'canvas mutation:', d);
  }

  protected init() {
    this.listen(ReplayerEvents.FullsnapshotRebuilded, (event, isSync) => {
      if(this.config.UNSAFE_replayCanvas) {
        this.preloadAllImages();
      }
    });
  }

  public async replay(event: TEventWithTime, isSync?: boolean): Promise<void> {
    const d = event.data as TCanvasMutationData;
    const target = mirror.getNode(d.id) as HTMLCanvasElement;
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }

    try {
      const precomputedMutation: TCanvasMutationParam =
        this.canvasEventMap.get(event) || d;

      const commands: TCanvasMutationCommand[] =
        'commands' in precomputedMutation
          ? precomputedMutation.commands
          : [precomputedMutation];

      if ([ECanvasContext.WebGL, ECanvasContext.WebGL2].includes(d.type)) {
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i] as TCanvasMutationCommand<TCanvasArg>;
          await canvasWebGLMutaiton({
            event,
            mutation: command,
            type: d.type,
            target: target,
            imageMap: this.imageMap,
            errorHandler: this.warnCanvasMutationFailed,
          });
        }
        return;
      }
      // default is '2d' for backwards compatibility (rrweb below 1.1.x)
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i] as TCanvasMutationCommand<TCanvasArg>;
        await canvas2DMutaiton({
          event,
          mutation: command ,
          target,
          imageMap: this.imageMap,
          errorHandler: this.warnCanvasMutationFailed,
        });
      }
    } catch (error) {
      this.warnCanvasMutationFailed(d, error);
    }
  }

  /**
   * pause when there are some canvas drawImage args need to be loaded
   */
   private async preloadAllImages(): Promise<void[]> {
    let beforeLoadState = this.ctx.service.state;
    const stateHandler = () => {
      beforeLoadState = this.ctx.service.state;
    };
    this.listen(ReplayerEvents.Start, stateHandler);
    this.listen(ReplayerEvents.Pause, stateHandler);
    const promises: Promise<void>[] = [];
    for (const event of this.ctx.service.state.context.events) {
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.CanvasMutation
      ) {
        promises.push(
          this.deserializeAndPreloadCanvasEvents(event.data, event),
        );
        const commands =
          'commands' in event.data ? event.data.commands : [event.data];
        commands.forEach((c: TCanvasMutationCommand) => {
          this.preloadImages(c, event);
        });
      }
    }
    return Promise.all(promises);
  }

  private preloadImages(data: TCanvasMutationCommand, event: TEventWithTime) {
    if (
      data.property === 'drawImage' &&
      typeof data.args[0] === 'string' &&
      !this.imageMap.has(event)
    ) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgd = ctx?.createImageData(canvas.width, canvas.height);
      let d = imgd?.data;
      d = JSON.parse(data.args[0]);
      ctx?.putImageData(imgd!, 0, 0);
    }
  }
  private async deserializeAndPreloadCanvasEvents(
    data: TCanvasMutationData,
    event: TEventWithTime,
  ) {
    if (!this.canvasEventMap.has(event)) {
      const status = {
        isUnchanged: true,
      };
      if ('commands' in data) {
        const commands = await Promise.all(
          data.commands.map(async (c) => {
            const args = await Promise.all(
              // @ts-ignore
              c.args.map(deserializeArg(this.imageMap, null, status)),
            );
            return { ...c, args };
          }),
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, commands });
      } else {
        const args = await Promise.all(
          // @ts-ignore
          data.args.map(deserializeArg(this.imageMap, null, status)),
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, args });
      }
    }
  }
}

export default CanvasReplayPlugin;
