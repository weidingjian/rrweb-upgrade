import { ERecordEvent } from "../../../types";
import { rewritMethod } from "../../util/rewrite-method";
import RecordPlugin from '../plugin';
import DOMRecordPlugin from "../dom";
import ScrollRecordPlugin from "../dom-events/scroll";
import { IShadowDomOptions } from "./types";
import { IDOMRecordPluginOptions } from '../dom/types';
import { IEventOptions } from "../dom-events/types";

class ShadowDomRecordPlugin extends RecordPlugin {
  private domRecordPlugins: (DOMRecordPlugin | ScrollRecordPlugin)[] = [];
  private restoreHandles: (() => void)[] = [];
  constructor(private options: IShadowDomOptions) {
    super();
    this.attachShadow();
    this.listen(ERecordEvent.AttachShadowDom, this.addShadowRoot);
    this.listen(ERecordEvent.AttachShadowDom, this.observeAttachShadow);
  }
  private attachShadow() {
    const self = this;
    const restoreHandle = rewritMethod<HTMLElement>(
      HTMLElement.prototype,
      'attachShadow',
      // @ts-ignore
      function(attachShadow) {
        return function(this: HTMLElement) {
          const shadowRoot = (attachShadow as Function)?.apply(this, arguments);
          if(this.shadowRoot) {
            self.addShadowRoot(this.shadowRoot, this.ownerDocument);
            return shadowRoot;
          }
        }
      }
    );
    this.restoreHandles.push(restoreHandle);
  }
  private addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    this.domRecordPlugins.push(
      new DOMRecordPlugin({
        ...this.options as IDOMRecordPluginOptions,
        doc,
      }, shadowRoot as unknown as Document),
      new ScrollRecordPlugin({
        ...this.options as IEventOptions,
        doc: (shadowRoot as unknown) as Document
      })
    );

  }

  private observeAttachShadow = (iframeElement: HTMLIFrameElement) => {
    if (iframeElement.contentWindow) {
      const self = this;
      const restoreHandle = rewritMethod(
        (iframeElement.contentWindow as Window & {
          HTMLElement: { prototype: HTMLElement };
        }).HTMLElement.prototype,
      'attachShadow',
      // @ts-ignore
      function (original) {
        return function (this: HTMLElement) {
          const shadowRoot = (original as Function).apply(this, arguments);
          if (this.shadowRoot)
          self.addShadowRoot(
              this.shadowRoot,
              iframeElement.contentDocument as Document,
            );
          return shadowRoot;
        };
      },
      );
      this.restoreHandles.push(restoreHandle);
    }
  }

  public stopRecord(): void {
    this.restoreHandles.forEach(h => h());
    this.domRecordPlugins.forEach(d => d.stopRecord());
  }
}

export default ShadowDomRecordPlugin;
