
import { TEventWithTime, TMutationData } from '../../../types';
import { hasShadowRoot } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
class DOMRemoveReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const { removes,  } = event.data as TMutationData;
    if(removes?.length) {
      this.removeNode(event.data as TMutationData);
    }
  }
  private removeNode(data: TMutationData) {
    const {removes} = data;
    removes.forEach(mutation => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (removes.find((r) => r.id === mutation.parentId)) {
          // no need to warn, parent was already removed
          return;
        }
        return this.warnNodeNotFound(data, mutation.id);
      }
      let parent: Node | null | ShadowRoot = mirror.getNode(
        mutation.parentId,
      );
      if (!parent) {
        return this.warnNodeNotFound(data, mutation.parentId);
      }
      if (mutation.isShadow && hasShadowRoot(parent as Node)) {
        parent = (parent as Element).shadowRoot;
      }
       // target may be removed with its parents before
       mirror.removeNodeFromMap(target as Node);
       if(parent) {
        try {
          parent.removeChild(target as Node);
        } catch (error) {
          if (error instanceof DOMException) {
            this.warn(
              'parent could not remove child in mutation',
              parent,
              target,
              data,
            );
          } else {
            throw error;
          }
        }
       }
    });
  }
}

export default DOMRemoveReplayPlugin;

