import { EventType, IncrementalSource } from "../../../types";
import { on, throttle } from "../../../utils";
import { isBlocked } from "../../../utils/is";
import { mirror } from "../../../utils/mirror";
import { getEventTarget } from "../dom-events/util";
import RecordPlugin from "../plugin";
import { IMediaInteractionOptions, MediaInteractions, TMediaInteractionParam } from "./types";

class MediaInteractionRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IMediaInteractionOptions) {
    super();
    this.observer();
  }

  private observer(){
    const { sampling = {}, blockClass } = this.options;
    const { media } = sampling;
    const handler = (type: MediaInteractions) =>
    throttle((event: Event) => {
      const target = getEventTarget(event);
      if (!target || isBlocked(target as Node, blockClass, true)) {
        return;
      }
      const { currentTime, volume, muted } = target as HTMLMediaElement;
      this.record({
        type,
        id: mirror.getId(target as Node),
        currentTime,
        volume,
        muted,
      });
    }, media || 500);

    this.removeListeners = [
      on('play', handler(MediaInteractions.Play)),
      on('pause', handler(MediaInteractions.Pause)),
      on('seeked', handler(MediaInteractions.Seeked)),
      on('volumechange', handler(MediaInteractions.VolumeChange)),
    ];
  }

  private record(payload: TMediaInteractionParam) {

    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.MediaInteraction,
        ...payload,
      },
    });
    this.options.hooks?.mediaInteaction?.(payload);
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default MediaInteractionRecordPlugin;
