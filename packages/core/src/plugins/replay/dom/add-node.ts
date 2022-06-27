
import { BuildCache, buildNodeWithSN, createCache, NodeType } from '../../../snapshot';
import { ReplayerEvents, TAddedNodeMutation, TEventWithTime, TMutationData } from '../../../types';
import { hasShadowRoot, isSerializedIframe } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
import { AppendedIframe, missingNodeMap } from '../types';
import { iterateResolveTree, nextNotInDOM, queueToResolveTrees } from '../util';
import { getInjectStyleRules } from './util';

class DOMAddNodeReplaylPlugin extends ReplayPlugin {
  protected newDocumentQueue: TMutationData['adds'] = [];
  // The replayer uses the cache to speed up replay and scrubbing.
  protected cache: BuildCache = createCache();
  protected legacy_missingNodeRetryMap: missingNodeMap = {};

  protected init() {
    this.listen(ReplayerEvents.ResetCache, this.resetCache)
  }
  public replay(event: TEventWithTime, isSync?: boolean): void {
      const {adds} = event.data as TMutationData;
      if(adds?.length) {
        this.addNode(event.data as TMutationData);
      }
  }
  private resetCache = () => {
    this.cache = createCache();
  }
  private addNode(data: TMutationData) {
    const {adds} = data;
    const queue: TMutationData['adds'] = [];

    const legacy_missingNodeMap: missingNodeMap = {
      ...this.legacy_missingNodeRetryMap,
    };

    if (!this.ctx.iframe.contentDocument) {
      return console.warn('Looks like your replayer has been destroyed.');
    }

    adds.forEach(mutation => {
      this.appendNode(mutation, queue, legacy_missingNodeMap);
    });
    const startTime = Date.now();
    while (queue.length) {
      // transform queue to resolve tree
      const resolveTrees = queueToResolveTrees(queue);
      queue.length = 0;
      if (Date.now() - startTime > 500) {
        this.warn(
          'Timeout in the loop, please check the resolve tree data:',
          resolveTrees,
        );
        break;
      }
      for (const tree of resolveTrees) {
        const parent = mirror.getNode(tree.value.parentId);
        if (!parent) {
          this.debug(
            'Drop resolve tree since there is no parent for the root node.',
            tree,
          );
        } else {
          iterateResolveTree(tree, (mutation) => {
            this.appendNode(mutation, queue, legacy_missingNodeMap);
          });
        }
      }
    }
    if (Object.keys(legacy_missingNodeMap).length) {
      Object.assign(this.legacy_missingNodeRetryMap, legacy_missingNodeMap);
    }
  }

  private appendNode(
    mutation: TAddedNodeMutation,
    queue: TMutationData['adds'],
    legacy_missingNodeMap: missingNodeMap
  ) {
    let parent: Node | null | ShadowRoot = mirror.getNode(
      mutation.parentId,
    );
    if (!parent) {
      if (mutation.node.type === NodeType.Document) {
        // is newly added document, maybe the document node of an iframe
        return this.newDocumentQueue.push(mutation);
      }
      return queue.push(mutation);
    }

    if (mutation.node.isShadow) {
      // If the parent is attached a shadow dom after it's created, it won't have a shadow root.
      if (!hasShadowRoot(parent)) {
        (parent as Element).attachShadow({ mode: 'open' });
        parent = (parent as Element).shadowRoot! as Node;
      } else {
        parent = parent.shadowRoot as Node;
      }
    }

    let previous: Node | null = null;
    let next: Node | null = null;
    if (mutation.previousId) {
      previous = mirror.getNode(mutation.previousId);
    }
    if (mutation.nextId) {
      next = mirror.getNode(mutation.nextId);
    }
    if (nextNotInDOM(mutation)) {
      return queue.push(mutation);
    }
    if (mutation.node.rootId && !mirror.getNode(mutation.node.rootId)) {
      return;
    }
    const targetDoc = mutation.node.rootId ?
      mirror.getNode(mutation.node.rootId)
        : this.ctx.iframe.contentDocument;

    if (isSerializedIframe<typeof parent>(parent)) {
      this.attachDocumentToIframe(
        mutation,
        parent as HTMLIFrameElement,
      );
      return;
    }
    const target = buildNodeWithSN(mutation.node, {
      doc: targetDoc as Document, // can be Document or RRDocument
      mirror, // can be this.mirror or virtualDom.mirror
      skipChild: true,
      hackCss: true,
      cache: this.cache,
    }) as Node;

     // legacy data, we should not have -1 siblings any more
     if (mutation.previousId === -1 || mutation.nextId === -1) {
      legacy_missingNodeMap[mutation.node.id] = {
        node: target,
        mutation,
      };
      return;
    }
     // Typescripts type system is not smart enough
    // to understand what is going on with the types below
    const parentSn = mirror.getMeta(parent as Node);
    if (
      parentSn &&
      parentSn.type === NodeType.Element &&
      parentSn.tagName === 'textarea' &&
      mutation.node.type === NodeType.Text
    ) {
      const childNodeArray = Array.isArray(parent.childNodes)
        ? parent.childNodes
        : Array.from(parent.childNodes);

      // https://github.com/rrweb-io/rrweb/issues/745
      // parent is textarea, will only keep one child node as the value
      for (const c of childNodeArray) {
        if (c.nodeType === parent.TEXT_NODE) {
          parent.removeChild(c as Node);
        }
      }
    }
    if (previous && previous.nextSibling && previous.nextSibling.parentNode) {
      (parent as Node).insertBefore(
        target as Node,
        previous.nextSibling as Node,
      );
    } else if (next && next.parentNode) {
      // making sure the parent contains the reference nodes
      // before we insert target before next.
      (parent as Node).contains(next as Node)
        ? (parent as Node).insertBefore(target as Node, next as Node)
        : (parent as Node).insertBefore(target as Node, null);
    } else {
      /**
       * Sometimes the document changes and the MutationObserver is disconnected, so the removal of child elements can't be detected and recorded. After the change of document, we may get another mutation which adds a new html element, while the old html element still exists in the dom, and we need to remove the old html element first to avoid collision.
       */
      if (parent === targetDoc) {
        while (targetDoc.firstChild) {
          (targetDoc as Node).removeChild(targetDoc.firstChild as Node);
        }
      }

      (parent as Node).appendChild(target as Node);
    }

    if (isSerializedIframe(target)) {
      const targetId = mirror.getId(target as HTMLIFrameElement);
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === targetId,
      );
      if (mutationInQueue) {
        this.attachDocumentToIframe(
          mutationInQueue,
          target as HTMLIFrameElement,
        );
        this.newDocumentQueue = this.newDocumentQueue.filter(
          (m) => m !== mutationInQueue,
        );
      }
    }
    if (mutation.previousId || mutation.nextId) {
      this.legacy_resolveMissingNode(
        legacy_missingNodeMap,
        parent,
        target,
        mutation,
      );
    }
  }
  protected legacy_resolveMissingNode(
    map: missingNodeMap,
    parent: Node,
    target: Node,
    targetMutation: TAddedNodeMutation,
  ) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap) {
      const { node, mutation } = previousInMap;
      parent.insertBefore(node as Node, target as Node);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
    if (nextInMap) {
      const { node, mutation } = nextInMap;
      parent.insertBefore(
        node as Node,
        target.nextSibling as Node,
      );
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
  }

  protected attachDocumentToIframe(
    mutation: TAddedNodeMutation,
    iframeEl: HTMLIFrameElement,
  ) {
    const collected: AppendedIframe[] = [];
    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument! as Document,
      mirror,
      hackCss: true,
      skipChild: false,
      afterAppend: (builtNode) => {
        this.collectIframeAndAttachDocument(collected, builtNode);
        const sn = mirror.getMeta(builtNode);
        if (
          sn?.type === NodeType.Element &&
          sn?.tagName.toUpperCase() === 'HTML'
        ) {
          const { documentElement, head } = iframeEl.contentDocument!;
          this.insertStyleRules(
            documentElement as HTMLElement,
            head as HTMLElement,
          );
        }
      },
      cache: this.cache,
    });
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue,
      );
    }
  }


  protected collectIframeAndAttachDocument(
    collected: AppendedIframe[],
    builtNode: Node,
  ) {
    if (isSerializedIframe(builtNode)) {
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === mirror.getId(builtNode),
      );
      if (mutationInQueue) {
        collected.push({
          mutationInQueue,
          builtNode: builtNode as HTMLIFrameElement,
        });
      }
    }
  }

  protected insertStyleRules(
    documentElement: HTMLElement,
    head: HTMLHeadElement,
  ) {
    const injectStylesRules = getInjectStyleRules(
      this.config.blockClass!,
    ).concat(this.config.insertStyleRules);
    if (this.config.pauseAnimation) {
      injectStylesRules.push(
        'html.rrweb-paused *, html.rrweb-paused *:before, html.rrweb-paused *:after { animation-play-state: paused !important; }',
      );
    }
    const styleEl = document.createElement('style');
      (documentElement as HTMLElement)!.insertBefore(
        styleEl,
        head as HTMLHeadElement,
      );
      for (let idx = 0; idx < injectStylesRules.length; idx++) {
        styleEl.sheet!.insertRule(injectStylesRules[idx], idx);
      }
  }
}

export default DOMAddNodeReplaylPlugin;
