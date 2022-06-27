
import { TEventWithTime, TFontData } from '../../types';

import ReplayPlugin from './plugin';

class FontReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const d = event.data as TFontData;
    try {
      const fontFace = new FontFace(
        d.family,
        d.buffer ? new Uint8Array(JSON.parse(d.fontSource)) : d.fontSource,
        d.descriptors,
      );
      this.ctx.iframe.contentDocument?.fonts.add(fontFace);
    } catch (error) {
      if (this.config.showWarning) {
        console.warn(error);
      }
    }
  }
}

export default FontReplayPlugin;
