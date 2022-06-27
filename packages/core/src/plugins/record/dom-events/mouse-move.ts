
// import { EventType, IEventOptions, IncrementalSource, mousePosition } from '../../../types';
import { EventType, IncrementalSource } from '../../../types';
import { on, throttle } from '../../../utils';
import { isTouchEvent } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import RecordPlugin from '../plugin';
import { IEventOptions, TMouseMoveSource, TMousePosition } from './types';
import { getEventTarget } from './util';

class MouseMoveRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IEventOptions) {
      super();
      this.listenDomEvent();
  }
  private record(positions: TMousePosition[], source: TMouseMoveSource) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source,
        positions,
      },
    });
    this.options.hooks?.mousemove?.(positions, source);
  }
  private listenDomEvent() {
    const { sampling = {}, doc } = this.options;
    const {mousemove, mousemoveCallback} = sampling;
    if(mousemove === false) {
      return;
    }
    const threshold = typeof mousemove === 'number' ? mousemove : 50;

    const callbackThreshold = typeof mousemoveCallback === 'number' ? mousemoveCallback : 500;
    let positions: TMousePosition[] = [];
    let timeBaseline: number | null;

    const wrappedCb = throttle(
      (
        source: TMouseMoveSource,
      ) => {
        const totalOffset = Date.now() - timeBaseline!;
        this.record(
          positions.map((p) => {
            p.timeOffset -= totalOffset;
            return p;
          }),
          source,
        );
        positions = [];
        timeBaseline = null;
      },
      callbackThreshold,
    );

    const updatePosition = throttle<MouseEvent | TouchEvent | DragEvent>(
      (evt) => {
        const target = getEventTarget(evt);
        const { clientX, clientY } = isTouchEvent(evt)
          ? evt.changedTouches[0]
          : evt;
        if (!timeBaseline) {
          timeBaseline = Date.now();
        }
        positions.push({
          x: clientX,
          y: clientY,
          id: mirror.getId(target as Node),
          timeOffset: Date.now() - timeBaseline,
        });
        // it is possible DragEvent is undefined even on devices
        // that support event 'drag'
        wrappedCb(
          typeof DragEvent !== 'undefined' && evt instanceof DragEvent
            ? IncrementalSource.Drag
            : evt instanceof MouseEvent
            ? IncrementalSource.MouseMove
            : IncrementalSource.TouchMove,
        );
      },
      threshold,
      {
        trailing: false,
      },
    );

    this.removeListeners = [
      on('mousemove', updatePosition as EventListener, doc),
      on('touchmove', updatePosition as EventListener, doc),
      on('drag', updatePosition as EventListener, doc),
    ];
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default MouseMoveRecordPlugin;
