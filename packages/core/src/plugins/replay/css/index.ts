import { PlayerConfig } from "../../../replay/types";
import { IncrementalSource, TEventWithTime, TIncrementalData } from "../../../types";
import ReplayPlugin from "../plugin";

import { IReplayPluginCtx } from "../types";
import StyleDeclarationReplayPlugin from "./style-declaration";
import StyleSheetReplayPlugin from "./style-sheet";

class CssRelayPlugin {
  private stylesheetPlugin: StyleSheetReplayPlugin;
  private styleDeclarationPlugin: StyleDeclarationReplayPlugin;
  constructor(config: PlayerConfig, ctx: IReplayPluginCtx) {
    // super(config, ctx);
    this.stylesheetPlugin = new StyleSheetReplayPlugin(config, ctx);
    this.styleDeclarationPlugin = new StyleDeclarationReplayPlugin(config, ctx);
  }
  public replay(event: TEventWithTime): void {
    const d = event.data as TIncrementalData;
    switch(d.source) {
      case IncrementalSource.StyleSheetRule:
        this.stylesheetPlugin.replay(event);
        break;
      case IncrementalSource.StyleDeclaration:
        this.styleDeclarationPlugin.replay(event)
        break
      default:
    }
  }
}

export default CssRelayPlugin;
