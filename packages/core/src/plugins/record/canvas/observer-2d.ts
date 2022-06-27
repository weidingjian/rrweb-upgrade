// import { ECanvasContext, ICanvasManagerOptions, TCanvasManagerMutationCallback } from "../../../types";
import { isBlocked } from "../../../utils/is";
import { rewirtMethodByDefineProperty, rewritMethod } from '../../util/rewrite-method';
import { serializeArgs } from "./serialize-args";
import { ECanvasContext, ICanvasRecordPluginOptions, TCanvasMutationCallback } from "./types";

function observer2DCanvas({
  win,
  blockClass,
}: ICanvasRecordPluginOptions, processMutation: TCanvasMutationCallback) {
  const restoreHandles = [];
  const props2D = Object.getOwnPropertyNames(
    win.CanvasRenderingContext2D.prototype,
  );

  for (const propname of props2D) {
    const prop = propname as keyof CanvasRenderingContext2D;
    try {
      if (
        typeof win.CanvasRenderingContext2D.prototype[
          prop
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = rewritMethod<CanvasRenderingContext2D>(
        win.CanvasRenderingContext2D.prototype,
        prop,
        // @ts-ignore
        function (original) {
          return function (
            this: CanvasRenderingContext2D,
            ...args: Array<unknown>
          ) {
            if (!isBlocked(this.canvas, blockClass, true)) {
              // Using setTimeout as toDataURL can be heavy
              // and we'd rather not block the main thread
              setTimeout(() => {
                const recordArgs = serializeArgs([...args], win, this);
                processMutation(this.canvas, {
                  type: ECanvasContext['2D'],
                  property: prop,
                  args: recordArgs,
                });
              }, 0);
            }
            return (original as Function).apply?.(this, args);
          };
        },
      );
      restoreHandles.push(restoreHandler);
    } catch {
      const hookHandler = rewirtMethodByDefineProperty<CanvasRenderingContext2D>(
        win.CanvasRenderingContext2D.prototype,
        prop,
        {
          set(this: CanvasRenderingContext2D, v) {
            processMutation(this.canvas, {
              type: ECanvasContext['2D'],
              property: prop,
              args: [v],
              setter: true,
            });
          },
        },
      );
      restoreHandles.push(hookHandler);
    }
  }
  return restoreHandles;
}

export default observer2DCanvas
