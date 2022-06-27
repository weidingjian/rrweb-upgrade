import { snapshot } from '../../../snapshot';
import { ERecordEvent, EventType, recordOptions } from '../../../types';
import { hasShadowRoot, isSerializedIframe } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import { getWindowHeight, getWindowWidth } from '../dom-events/util';
import RecordPlugin from '../plugin';

class FullSnapshotRecordPlugin extends RecordPlugin {
  constructor(private options: recordOptions) {
    super();
    this.observer();
    this.listen(ERecordEvent.TaskFullSnapshot, this.observer);
  }
  private observer = () => {
    this.recordData({
      type: EventType.Meta,
      data: {
        href: window.location.href,
        width: getWindowWidth(),
        height: getWindowHeight(),
      },
    });

    this.emit(ERecordEvent.LockMutation);

    const {
      blockClass,
      blockSelector,
      maskTextClass,
      maskTextSelector,
      inlineStylesheet,
      maskInputOptions,
      maskTextFn,
      slimDOMOptions,
      recordCanvas,
      inlineImages,
      keepIframeSrcFn,
    } = this.options;

    const node = snapshot(document, {
      mirror,
      blockClass,
      blockSelector,
      maskTextClass,
      maskTextSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      maskTextFn,
      slimDOM: slimDOMOptions as any,
      recordCanvas,
      inlineImages,
      onSerialize: (n) => {
        if (isSerializedIframe(n)) {
          this.emit(ERecordEvent.StoreIfame, n);
          // iframeManager.addIframe(n as HTMLIFrameElement);
        }
        if (hasShadowRoot(n)) {
          this.emit(ERecordEvent.AddShadowRoot, n.shadowRoot, document);
          // shadowDomManager.addShadowRoot(n.shadowRoot, document);
        }
      },
      onIframeLoad: (iframe, childSn) => {
        this.emit(ERecordEvent.AttachIframe, childSn);
        this.emit(ERecordEvent.AttachShadowDom, iframe);
        // iframeManager.attachIframe(iframe, childSn, mirror);
        // shadowDomManager.observeAttachShadow(iframe);
      },
      keepIframeSrcFn,
    });

    if (!node) {
      return console.warn('Failed to snapshot the document');
    }
    this.recordData({
      type: EventType.FullSnapshot,
      data: {
        node,
        initialOffset: {
          left:
            window.pageXOffset !== undefined
              ? window.pageXOffset
              : document?.documentElement.scrollLeft ||
                document?.body?.parentElement?.scrollLeft ||
                document?.body.scrollLeft ||
                0,
          top:
            window.pageYOffset !== undefined
              ? window.pageYOffset
              : document?.documentElement.scrollTop ||
                document?.body?.parentElement?.scrollTop ||
                document?.body.scrollTop ||
                0,
        },
      },
    });
    this.emit(ERecordEvent.UnlokcMutation);
  }

  public stopRecord(): void {

  }
}

export default FullSnapshotRecordPlugin;
