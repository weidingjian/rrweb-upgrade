
// import { EventType, IEventOptions, IncrementalSource, MouseInteractions } from '../../../types';
import { EventType, IncrementalSource } from '../../../types';
import { on } from '../../../utils';
import { isBlocked, isTouchEvent } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import RecordPlugin from '../plugin';
import { IEventOptions, MouseInteractions } from './types';
import { getEventTarget } from './util';

class MouseInteractionRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IEventOptions) {
      super();
      this.listenDomEvent();
  }
  private record(payload: {type: MouseInteractions; id: number; x: number; y: number}) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.MouseInteraction,
        ...payload,
      },
    });
    this.options.hooks?.mouseInteraction?.(payload);
  }
  private listenDomEvent() {
    const { sampling = {}, doc, blockClass } = this.options;
    const {mouseInteraction, mousemoveCallback} = sampling;
    if(mouseInteraction === false) {
      return;
    }
    const disableMap: Record<string, boolean | undefined> =
      mouseInteraction === true || mouseInteraction === undefined
        ? {}
        : mouseInteraction;
    const listenHandler = (eventKey: keyof typeof MouseInteractions) => {
      return (event: MouseEvent | TouchEvent) => {
        const target = getEventTarget(event) as Node;
        if (isBlocked(target, blockClass, true)) {
          return;
        }
        const e = isTouchEvent(event) ? event.changedTouches[0] : event;
        if (!e) {
          return;
        }
        const id = mirror.getId(target);
        const { clientX, clientY } = e;
        this.record({
          type: MouseInteractions[eventKey],
          id,
          x: clientX,
          y: clientY,
        });
      };
    };

    Object.keys(MouseInteractions)
    .filter(
      (key) =>
        Number.isNaN(Number(key)) &&
        !key.endsWith('_Departed') &&
        disableMap[key] !== false,
    )
    .forEach((eventKey) => {
      const eventName = eventKey.toLowerCase();
      const handler = listenHandler(eventKey as keyof typeof MouseInteractions);
      this.removeListeners.push(on(eventName, handler as EventListener, doc));
    });
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default MouseInteractionRecordPlugin;
