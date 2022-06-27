
import { TEventWithTime, TInputData } from '../../../types';
import { mirror } from '../../../utils/mirror';

import ReplayPlugin from '../plugin';

class InputReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
      const data = event.data as TInputData;
       /**
         * Input event on an unserialized node usually means the event
         * was synchrony triggered programmatically after the node was
         * created. This means there was not an user observable interaction
         * and we do not need to replay it.
         */
      if (data.id === -1) {
        return;
      }
      const target = mirror.getNode(data.id);
      if (!target) {
        return this.debugNodeNotFound(data, data.id);
      }
      try {
        (target as HTMLInputElement).checked = data.isChecked;
        (target as HTMLInputElement).value = data.text;
      } catch (error) {
        // for safe
      }
  }
}

export default InputReplayPlugin;
