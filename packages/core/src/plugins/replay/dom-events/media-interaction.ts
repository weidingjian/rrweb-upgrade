
import { TEventWithTime, TMediaInteractionData, MediaInteractions } from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';

class MediaInteractionReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
      const data = event.data as TMediaInteractionData;
      const target = mirror.getNode(data.id);
        if (!target) {
          return this.debugNodeNotFound(data, data.id);
        }
        const mediaEl = target as HTMLMediaElement;
        try {
          if (data.currentTime) {
            mediaEl.currentTime = data.currentTime;
          }
          if (data.volume) {
            mediaEl.volume = data.volume;
          }
          if (data.muted) {
            mediaEl.muted = data.muted;
          }
          if (data.type === MediaInteractions.Pause) {
            mediaEl.pause();
          }
          if (data.type === MediaInteractions.Play) {
            // remove listener for 'canplay' event because play() is async and returns a promise
            // i.e. media will evntualy start to play when data is loaded
            // 'canplay' event fires even when currentTime attribute changes which may lead to
            // unexpeted behavior
            mediaEl.play();
          }
        } catch (error: any) {
          if (this.config.showWarning) {
            console.warn(
              `Failed to replay media interactions: ${error.message || error}`,
            );
          }
        }
  }
}

export default MediaInteractionReplayPlugin;
