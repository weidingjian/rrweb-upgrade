// import { canvasMutationCommand, canvasMutationParam, canvasMutationWithType, ERecordEvent, EventType, ICanvasManagerOptions, IncrementalSource, TCanvasManagerMutationCallback } from "../../../types";
import { ERecordEvent, EventType, IncrementalSource } from "../../../types";
import { mirror } from "../../../utils/mirror";
import RecordPlugin from "../plugin";
import observer2DCanvas from "./observer-2d";
import observerWebglCanvas from "./observer-webgl";
import { ICanvasRecordPluginOptions, TCanvasMutationCallback, TCanvasMutationCommand, TCanvasMutationParam, TCanvasMutationWithType } from "./types";

export type RafStamps = { latestId: number; invokeId: number | null };
type TPendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  TCanvasMutationWithType[]
>;

class ObserverCanvas extends RecordPlugin{
  private locked: boolean = false;
  private rafStamps: RafStamps = { latestId: 0, invokeId: null };
  private pendingCanvasMutations: TPendingCanvasMutationsMap = new Map();
  private restoreMethodHandles: (() => void)[] = [];

  constructor(private options: ICanvasRecordPluginOptions) {
    super();
    this.observer();
    this.listen(ERecordEvent.LockMutation, this.lock);
    this.listen(ERecordEvent.UnlokcMutation, this.unlock);
  }
  private startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp: DOMHighResTimeStamp) => {
      this.rafStamps.latestId = timestamp;
      requestAnimationFrame(setLatestRAFTimestamp);
    };
    requestAnimationFrame(setLatestRAFTimestamp);
  }

  private startPendingCanvasMutationFlusher() {
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }

 private flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (values: TCanvasMutationCommand[], canvas: HTMLCanvasElement) => {
        const id = mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      },
    );
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }

  private flushPendingCanvasMutationFor(canvas: HTMLCanvasElement, id: number) {
    if(this.locked) {
      return;
    }
    const valuesWithType = this.pendingCanvasMutations.get(canvas);
    if (!valuesWithType || id === -1) return;

    const values = valuesWithType.map((value) => {
      const { type, ...rest } = value;
      return rest;
    });
    const { type } = valuesWithType[0];

    this.record({ id, type, commands: values });
    this.pendingCanvasMutations.delete(canvas);
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
  private processMutation: TCanvasMutationCallback = (target, mutation,) => {
    const newFrame =
      this.rafStamps.invokeId &&
      this.rafStamps.latestId !== this.rafStamps.invokeId;
    if (newFrame || !this.rafStamps.invokeId)
      this.rafStamps.invokeId = this.rafStamps.latestId;

    if (!this.pendingCanvasMutations.has(target)) {
      this.pendingCanvasMutations.set(target, []);
    }

    this.pendingCanvasMutations.get(target)!.push(mutation);
  }
  private lock = () => {
    this.locked = true;
  }
  private unlock = () => {
    this.locked = false;
  }
  private observer() {
    this.startRAFTimestamping();
    this.startPendingCanvasMutationFlusher();

    this.restoreMethodHandles.push(
      ...observer2DCanvas(this.options, this.processMutation),
      ...observerWebglCanvas(this.options, this.processMutation),
    );
  }
  public stopRecord(): void {
    this.restoreMethodHandles.forEach(h => h());
  }
}

export default ObserverCanvas;
