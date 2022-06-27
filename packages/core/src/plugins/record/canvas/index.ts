import { ICanvas } from "../../../snapshot";
import { isBlocked } from "../../../utils/is";
import { rewritMethod } from '../../util/rewrite-method';
import RecordPlugin from '../plugin';
import ObserverCanvas from "./observer-canvas";
import SampleObserverCanvas from "./sample-observer-canvas";
import { ICanvasRecordPluginOptions } from "./types";

class CanvasRecordPlugin extends RecordPlugin {
  private restoreMethodHandles: (() => void)[] = [];
  private observerCanvas: ObserverCanvas | SampleObserverCanvas | null = null;
  constructor (private options: ICanvasRecordPluginOptions) {
    super();
    const {recordCanvas, sampling } = options;
    if(!recordCanvas) {
      return;
    }
    this.canvasContextObserver();
    this.observerCanvas = sampling?.canvas === 'all' ?
      new ObserverCanvas(options) :
      new SampleObserverCanvas(options);
  }
  private canvasContextObserver() {
    const {win, blockClass} = this.options;
    try {
      const restoreHandler = rewritMethod<HTMLCanvasElement, HTMLCanvasElement['getContext']>(
        win.HTMLCanvasElement.prototype,
        'getContext',
        // @ts-ignore
        function (getContext){
        return function(this: ICanvas,
          contextType: string,
          options: any) {
            if (!isBlocked(this, blockClass, true)) {
              if (!('__context' in this)) this.__context = contextType;
            }
            return getContext?.apply(this, [contextType, options]);
        }
      });
      this.restoreMethodHandles.push(restoreHandler);
    } catch(e) {
      console.error('failed to rewrite HTMLCanvasElement.prototype.getContext');
    }
  }

  public stopRecord(): void {
    this.restoreMethodHandles.forEach(h => h());
    this.observerCanvas?.stopRecord();
  }
}

export default CanvasRecordPlugin;
