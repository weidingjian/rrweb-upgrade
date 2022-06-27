// import { canvasMutationWithType, ECanvasContext, ICanvasManagerOptions, IWindow, TBlockClass, TCanvasManagerMutationCallback } from '../../../types';
import { isBlocked } from '../../../utils/is';
import { saveWebGLVar, serializeArgs } from './serialize-args';
import { rewirtMethodByDefineProperty, rewritMethod } from '../../util/rewrite-method';
import { ECanvasContext, ICanvasRecordPluginOptions, TCanvasMutationCallback, TCanvasMutationWithType } from './types';
import { ICommonOptions, IWindow } from '../../../types';

export default function observerWebglCanvas(
  { win,
    blockClass
  }: ICanvasRecordPluginOptions,
  processMutation: TCanvasMutationCallback,
) {
  const restorehandles = [];

  restorehandles.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      ECanvasContext.WebGL,
      processMutation,
      blockClass,
      win,
    ),
  );

  if (typeof win.WebGL2RenderingContext !== 'undefined') {
    restorehandles.push(
      ...patchGLPrototype(
        win.WebGL2RenderingContext.prototype,
        ECanvasContext.WebGL2,
        processMutation,
        blockClass,
        win,
      ),
    );
  }

  return restorehandles;
}

function patchGLPrototype(
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  type: ECanvasContext,
  processMutation: TCanvasMutationCallback,
  blockClass: ICommonOptions['blockClass'],
  win: IWindow,
){
  const handlers = [];

  const props = Object.getOwnPropertyNames(prototype);

  for (const propName of props) {
    const prop = propName as keyof typeof prototype;
    try {
      if (typeof prototype[prop] !== 'function') {
        continue;
      }
      const restoreHandler = rewritMethod(
        prototype,
        prop,
        // @ts-ignore
        function (original) {
        return function (this: typeof prototype, ...args: Array<unknown>) {
          const result = (original as Function).apply(this, args);
          saveWebGLVar(result, win, prototype);
          if (!isBlocked(this.canvas, blockClass, true)) {
            const recordArgs = serializeArgs([...args], win, prototype);
            const mutation: TCanvasMutationWithType = {
              type,
              property: prop,
              args: recordArgs,
            };
            // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
            processMutation(this.canvas, mutation);
          }

          return result;
        };
      });
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = rewirtMethodByDefineProperty<typeof prototype>(prototype, prop, {
        set(this: typeof prototype, v) {
          // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
          processMutation(this.canvas as HTMLCanvasElement, {
            type,
            property: prop,
            args: [v],
            setter: true,
          });
        },
      });
      handlers.push(hookHandler);
    }
  }

  return handlers;
}
