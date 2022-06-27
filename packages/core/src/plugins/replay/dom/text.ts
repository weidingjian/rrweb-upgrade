
import { TEventWithTime, TMutationData } from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
import { uniqueTextMutations } from '../util';

class DOMTextReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const { texts, } = event.data as TMutationData;
    if(texts?.length) {
      this.modifyTextContent(event.data as TMutationData);
    }
  }
  private modifyTextContent(data: TMutationData) {
    const {texts} = data;
    uniqueTextMutations(texts).forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (data.removes?.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(data, mutation.id);
      }
      target.textContent = mutation.value;
    });
  }
}

export default DOMTextReplayPlugin;

