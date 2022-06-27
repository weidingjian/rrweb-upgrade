
import { PlayerConfig } from '../../../replay/types';
import { IncrementalSource, TEventWithTime, TIncrementalData } from '../../../types';
// import ReplayPlugin from '../plugin';
import { IReplayPluginCtx } from '../types';
import InputReplayPlugin from './input';
import MediaInteractionReplayPlugin from './media-interaction';
import MouseMoveReplayPlugin from './mouse-move';
import ScrollReplayPlugin from './scroll';
import ViewportResizeReplayPlugin from './viewprot-resize';

class DOMEventsReplayPlugin {
  private inputPlugin: InputReplayPlugin;
  private mediaInteractionPlugin: MediaInteractionReplayPlugin;
  private mouseMovePlugin: MouseMoveReplayPlugin;
  private scrollPlugin: ScrollReplayPlugin;
  private viewportPlugin: ViewportResizeReplayPlugin;
  constructor(config: PlayerConfig, ctx: IReplayPluginCtx) {
      // super(config, ctx);
      this.inputPlugin = new InputReplayPlugin(config, ctx);
      this.mediaInteractionPlugin = new MediaInteractionReplayPlugin(config, ctx);
      this.mouseMovePlugin = new MouseMoveReplayPlugin(config, ctx);
      this.scrollPlugin = new ScrollReplayPlugin(config, ctx);
      this.viewportPlugin = new ViewportResizeReplayPlugin(config, ctx);
  }
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const d = event.data as TIncrementalData;
    switch(d.source) {
      case IncrementalSource.Drag:
      case IncrementalSource.TouchMove:
      case IncrementalSource.MouseMove:
        this.mouseMovePlugin.replay(event, isSync);
        break;
      case IncrementalSource.MouseInteraction:
        this.mediaInteractionPlugin.replay(event, isSync);
        break;
      case IncrementalSource.Scroll:
        this.scrollPlugin.replay(event, isSync);
        break;
      case IncrementalSource.ViewportResize:
        this.viewportPlugin.replay(event, isSync);
        break;
      case IncrementalSource.Input:
        this.inputPlugin.replay(event, isSync);
        break;
      case IncrementalSource.MediaInteraction:
        this.mediaInteractionPlugin.replay(event, isSync);
        break;
      default:
    }
  }
}

export default DOMEventsReplayPlugin;
