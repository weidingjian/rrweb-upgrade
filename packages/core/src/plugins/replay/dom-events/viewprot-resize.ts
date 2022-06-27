
import { ReplayerEvents, TEventWithTime, TViewportResizeData } from '../../../types';
import ReplayPlugin from '../plugin';

class ViewportResizeReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const data = event.data as TViewportResizeData;
    this.emit(ReplayerEvents.Resize, {
      width: data.width,
      height: data.height,
    });
  }
}

export default ViewportResizeReplayPlugin;
