
import { rebuild } from '../../snapshot';
import { TEventWithTime, FullSnapshotEvent, ReplayerEvents, EventType, IncrementalSource, TCanvasMutationCommand, TCanvasMutationData } from '../../types';
import { mirror } from '../../utils/mirror';
import DOMAddNodeReplaylPlugin from './dom/add-node';

import { AppendedIframe } from './types';

class FullSnapShotReplayPlugin extends DOMAddNodeReplaylPlugin {
  private firstFullSnapshot: TEventWithTime | true | null = null;
  protected init(): void {
      this.listen(ReplayerEvents.FirstFullsnapshot, (event) => {
        this.replay(event);
      });
      this.listen(ReplayerEvents.PlayBack, () => {
        this.firstFullSnapshot = null;
        mirror.reset();
      });
  }
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const d = event.data as FullSnapshotEvent['data']
    if (this.firstFullSnapshot) {
      if (this.firstFullSnapshot === event) {
        // we've already built this exact FullSnapshot when the player was mounted, and haven't built any other FullSnapshot since
        this.firstFullSnapshot = true; // forget as we might need to re-execute this FullSnapshot later e.g. to rebuild after scrubbing
        return;
      }
    } else {
      // Timer (requestAnimationFrame) can be faster than setTimeout(..., 1)
      this.firstFullSnapshot = true;
    }

    this.rebuildFullSnapshot(event, isSync);
    this.ctx.iframe.contentWindow!.scrollTo(d.initialOffset);
  }

  private rebuildFullSnapshot(event: TEventWithTime, isSync?: boolean) {
    const d = event.data as FullSnapshotEvent['data'];
    if (!this.ctx.iframe.contentDocument) {
      return console.warn('Looks like your replayer has been destroyed.');
    }
    if (Object.keys(this.legacy_missingNodeRetryMap).length) {
      console.warn(
        'Found unresolved missing node map',
        this.legacy_missingNodeRetryMap,
      );
    }
    this.legacy_missingNodeRetryMap = {};
    const collected: AppendedIframe[] = [];
    rebuild(d.node, {
      doc: this.ctx.iframe.contentDocument,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
      },
      cache: this.cache,
      mirror,
    });
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
    const { documentElement, head } = this.ctx.iframe.contentDocument;
    this.insertStyleRules(documentElement, head);
    if (!this.ctx.service.state.matches('playing')) {
      this.ctx.iframe.contentDocument
        .getElementsByTagName('html')[0]
        .classList.add('rrweb-paused');
    }
    this.emit(ReplayerEvents.FullsnapshotRebuilded, event, isSync);
  }
}

export default FullSnapShotReplayPlugin;
