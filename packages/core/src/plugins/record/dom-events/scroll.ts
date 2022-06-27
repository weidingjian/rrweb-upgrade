
import { EventType, IncrementalSource } from '../../../types';
import { on, throttle } from '../../../utils';
import { isBlocked, isTouchEvent } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import RecordPlugin from '../plugin';
import { IEventOptions } from './types';
import { getEventTarget } from './util';

class ScrollRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IEventOptions) {
      super();
      this.listenDomEvent();
  }
  private record(payload: {id: number; x: number; y: number}) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Scroll,
        ...payload,
      },
    });
    this.options.hooks?.scroll?.(payload);
  }
  private listenDomEvent() {
    const { sampling = {}, doc, blockClass } = this.options;
    const { scroll } = sampling;
    const updatePosition = throttle<UIEvent>((evt) => {
      const target = getEventTarget(evt);
      if (!target || isBlocked(target as Node, blockClass, true)) {
        return;
      }
      const id = mirror.getId(target as Node);
      if (target === doc) {
        const scrollEl = (doc.scrollingElement || doc.documentElement)!;
        this.record({
          id,
          x: scrollEl.scrollLeft,
          y: scrollEl.scrollTop,
        });
      } else {
        this.record({
          id,
          x: (target as HTMLElement).scrollLeft,
          y: (target as HTMLElement).scrollTop,
        });
      }
    }, scroll || 100);
    this.removeListeners = [on('scroll', updatePosition as EventListener, doc)]
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default ScrollRecordPlugin;
