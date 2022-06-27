import { ICanvas } from "../../../snapshot";
import ImageBitmapDataURLWorker from 'web-worker:../../workers/image-bitmap-data-url-worker.ts';
import { ImageBitmapDataURLRequestWorker } from "../../../workers/image-bitmap-data-url-worker";
import RecordPlugin from '../plugin';
import { mirror } from "../../../utils/mirror";
import { ECanvasContext, ICanvasRecordPluginOptions, TCanvasArg, TCanvasMutationParam } from "./types";
import { EventType, IncrementalSource } from "../../../types";

class SampleObserverCanvas extends RecordPlugin {
  private rafId: number = 0;
  constructor(private options: ICanvasRecordPluginOptions) {
    super();
    this.observer();
  }
  private record(payload: TCanvasMutationParam) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.CanvasMutation,
        ...payload,
      },
    });
    this.options.hooks?.canvasMutation?.(payload);
  }

  private observer() {
    const snapshotInProgressMap: Map<number, boolean> = new Map();
    const worker = new ImageBitmapDataURLWorker() as ImageBitmapDataURLRequestWorker;
    worker.onmessage = (e) => {
      const { id } = e.data;
      snapshotInProgressMap.set(id, false);

      if (!('base64' in e.data)) return;

      const { base64, type, width, height } = e.data;
      this.record({
        id,
        type: ECanvasContext['2D'],
        commands: [
          {
            property: 'clearRect', // wipe canvas
            args: [0, 0, width, height],
          },
          {
            property: 'drawImage', // draws (semi-transparent) image
            args: [
              {
                rr_type: 'ImageBitmap',
                args: [
                  {
                    rr_type: 'Blob',
                    data: [{ rr_type: 'ArrayBuffer', base64 }],
                    type,
                  },
                ],
              } as TCanvasArg,
              0,
              0,
            ],
          },
        ],
      });
    };

    const { sampling, win, blockClass } = this.options;
    const timeBetweenSnapshots = 1000 / (sampling as number);
    let lastSnapshotTime = 0;

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
      if (
        lastSnapshotTime &&
        timestamp - lastSnapshotTime < timeBetweenSnapshots
      ) {
        this.rafId = requestAnimationFrame(takeCanvasSnapshots);
        return;
      }

      lastSnapshotTime = timestamp;

      win.document
        .querySelectorAll(`canvas:not(.${blockClass} *)`)
        .forEach(async (element) => {
          const canvas = element as HTMLCanvasElement;
          const id = mirror.getId(canvas);
          if (snapshotInProgressMap.get(id)) return;
          snapshotInProgressMap.set(id, true);
          if (['webgl', 'webgl2'].includes((canvas as ICanvas).__context)) {
            // if the canvas hasn't been modified recently,
            // its contents won't be in memory and `createImageBitmap`
            // will return a transparent imageBitmap

            const context = canvas.getContext((canvas as ICanvas).__context) as
              | WebGLRenderingContext
              | WebGL2RenderingContext
              | null;
            if (
              context?.getContextAttributes()?.preserveDrawingBuffer === false
            ) {
              // Hack to load canvas back into memory so `createImageBitmap` can grab it's contents.
              // Context: https://twitter.com/Juice10/status/1499775271758704643
              // This hack might change the background color of the canvas in the unlikely event that
              // the canvas background was changed but clear was not called directly afterwards.
              context?.clear(context.COLOR_BUFFER_BIT);
            }
          }
          const bitmap = await createImageBitmap(canvas);
          worker.postMessage(
            {
              id,
              bitmap,
              width: canvas.width,
              height: canvas.height,
            },
            [bitmap],
          );
        });
      this.rafId = requestAnimationFrame(takeCanvasSnapshots);
    };

    this.rafId = requestAnimationFrame(takeCanvasSnapshots);
  }

  public stopRecord(): void {
    cancelAnimationFrame(this.rafId);
  }
}

export default SampleObserverCanvas;
