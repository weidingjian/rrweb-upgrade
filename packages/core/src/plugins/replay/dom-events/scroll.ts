
import { NodeType } from '../../../snapshot';
import { TEventWithTime, TScrollData } from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';

class ScrollReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const data = event.data as TScrollData;
    const {id} = data;
    if (id === -1) {
      return;
    }
    const target = mirror.getNode(id);
    if (!target) {
      return this.debugNodeNotFound(data, id);
    }
    const sn = mirror.getMeta(target);
    if (target === this.ctx.iframe.contentDocument) {
      this.ctx.iframe.contentWindow!.scrollTo({
        top: data.y,
        left: data.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else if (sn?.type === NodeType.Document) {
      // nest iframe content document
      (target as Document).defaultView!.scrollTo({
        top: data.y,
        left: data.x,
        behavior: isSync ? 'auto' : 'smooth',
      });
    } else {
      try {
        (target as Element).scrollTop = data.y;
        (target as Element).scrollLeft = data.x;
      } catch (error) {
        /**
         * Seldomly we may found scroll target was removed before
         * its last scroll event.
         */
      }
    }
  }
}

export default ScrollReplayPlugin;
