import { PlayerConfig } from "../../../replay/types";
import { TEventWithTime } from "../../../types";
// import ReplayPlugin from "../plugin";
import DOMAddNodeReplaylPlugin from "./add-node";
import DOMRemoveReplayPlugin from "./remove-node";
import DOMTextReplayPlugin from './text';
import DOMAttributesReplayPlugin from './attributes';
import { IReplayPluginCtx } from "../types";

class DOMRelayPlugin {
  private removeNodePlugin: DOMRemoveReplayPlugin;
  private addNodePlugin: DOMAddNodeReplaylPlugin;
  private textPlugin: DOMTextReplayPlugin;
  private attributesPlugin: DOMAttributesReplayPlugin;
  constructor(config: PlayerConfig, ctx: IReplayPluginCtx) {
    this.removeNodePlugin = new DOMRemoveReplayPlugin(config, ctx);
    this.addNodePlugin = new DOMAddNodeReplaylPlugin(config, ctx);
    this.textPlugin = new DOMTextReplayPlugin(config, ctx);
    this.attributesPlugin = new DOMAttributesReplayPlugin(config, ctx);
  }
  public replay(event: TEventWithTime): void {
    this.removeNodePlugin.replay(event);
    this.addNodePlugin.replay(event);
    this.textPlugin.replay(event);
    this.attributesPlugin.replay(event);
  }
}

export default DOMRelayPlugin;
