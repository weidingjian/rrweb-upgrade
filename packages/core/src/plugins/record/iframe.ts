import { serializedNodeWithId } from '../../snapshot';
import { ERecordEvent, EventType, IncrementalSource } from '../../types';
import { mirror } from '../../utils/mirror';
import RecordPlugin from './plugin';

class IframeRecordPlugin extends RecordPlugin {
  private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap();
  constructor() {
    super();
    this.listen(ERecordEvent.StoreIfame, this.addIframe);
    this.listen(ERecordEvent.AttachIframe, this.attachIframe)
  }
  private addIframe = (iframeEl: HTMLIFrameElement) => {
    this.iframes.set(iframeEl, true);
  }
  private attachIframe = (
    iframeEl: HTMLIFrameElement,
    childSn: serializedNodeWithId,
  ) => {

    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Mutation,
        adds: [
          {
            parentId: mirror.getId(iframeEl),
            nextId: null,
            node: childSn,
          },
        ],
        removes: [],
        texts: [],
        attributes: [],
        isAttachIframe: true
      },
    });
    // this.loadListener?.(iframeEl);
  }
  public stopRecord(): void {

  }
}

export default IframeRecordPlugin;
