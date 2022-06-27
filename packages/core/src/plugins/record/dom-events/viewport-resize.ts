
import { EventType, IncrementalSource } from '../../../types';
import { on, throttle } from '../../../utils';
import { isBlocked, isTouchEvent } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import RecordPlugin from '../plugin';
import { IEventOptions } from './types';
import { getEventTarget, getWindowHeight, getWindowWidth } from './util';

class ViewportResizeRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IEventOptions) {
      super();
      this.listenDomEvent();
  }
  private record(payload: {width: number; height: number;}) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.ViewportResize,
        ...payload,
      },
    });
    this.options.hooks?.viewportResize?.(payload);
  }
  private listenDomEvent() {
    let lastH = -1;
    let lastW = -1;
    const updateDimension = throttle(() => {
      const height = getWindowHeight();
      const width = getWindowWidth();
      if (lastH !== height || lastW !== width) {
        this.record({
          width: Number(width),
          height: Number(height),
        });
        lastH = height;
        lastW = width;
      }
    }, 200);
    this.removeListeners = [on('resize', updateDimension as EventListener, window)]
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default ViewportResizeRecordPlugin;
