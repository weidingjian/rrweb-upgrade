import { isShadowRoot, serializeNodeWithId } from "../../../snapshot";
import { ERecordEvent } from "../../../types";
// import { ERecordEvent, IMutationOptions, isSerializedIframe, TAddedNodeMutation, TRemovedNodeMutation } from "../../../types";
import { hasShadowRoot, isAncestorRemoved, isIgnored, isSerialized, isSerializedIframe } from "../../../utils/is";
import { mirror } from "../../../utils/mirror";
import { IDOMRecordPluginOptions, TAddedNodeMutation, TRemovedNodeMutation } from "./types";
import { DoubleLinkedList, DoubleLinkedListNode, getNextId, getShadowHost, isAncestorInSet, isParentRemoved } from "./util";

class MutationChildList {
  private movedSet = new Set<Node>();
  private addedSet = new Set<Node>();
  private droppedSet = new Set<Node>();
  private mapRemoves: Node[] = [];
  private movedMap: Map<string, boolean> = new Map();
  private removes: TRemovedNodeMutation[] = [];
  constructor(
    private options: IDOMRecordPluginOptions,
    private emitEvents: (eventName: string, ...args: any[]) => void,
  ) {}
  private moveKey = (node: Node, targetId: number) => {
    return `${mirror.getId(node)}@${targetId}`
  }
  private genAdds = (node: Node, target?: Node) => {
    const loopChild = () => {node.childNodes.forEach((childN) => this.genAdds(childN))}
    if(!mirror.hasNode(node)) {
      this.addedSet.add(node);
      this.droppedSet.delete(node);
      loopChild();
      return;
    }

    if (isIgnored(node)) {
      return;
    }

    this.movedSet.add(node);
    let targetId: number | null = null;
    if (target && mirror.hasNode(target)) {
      targetId = mirror.getId(target);
    }

    if (targetId && targetId !== -1) {
      this.movedMap.set(this.moveKey(node, targetId), true);
    }
    loopChild();
  }
  private handleAdds = () => {
    const {doc} = this.options;
    const addList = new DoubleLinkedList();
    const adds: TAddedNodeMutation[] = [];
    const pushAdds = (node: Node) => {
      const shadowHost: Element | null = getShadowHost(node);
       // If node is in a nested shadow dom.
       let rootShadowHost: Element | null = shadowHost;
       while (getShadowHost(rootShadowHost)) {
        rootShadowHost = getShadowHost(rootShadowHost);
       }
        // ensure shadowHost is a Node, or doc.contains will throw an error
      const notInDoc = !doc.contains(node) && (!rootShadowHost || !doc.contains(rootShadowHost));

      if (!node.parentNode || notInDoc) {
        return;
      }

      const parentId = mirror.getId(isShadowRoot(node.parentNode) ? shadowHost : node.parentNode);
      const nextId = getNextId(node);

      if (parentId === -1 || nextId === -1) {
        return addList.addNode(node);
      }
      const sn = serializeNodeWithId(node, {
        mirror,
        skipChild: true,
        doc,
        blockClass: this.options.blockClass!,
        blockSelector: this.options.blockSelector!,
        maskTextClass: this.options.maskTextClass!,
        maskTextSelector: this.options.maskTextSelector!,
        inlineStylesheet: this.options.inlineStylesheet!,
        maskInputOptions: this.options.maskInputOptions,
        maskTextFn: this.options.maskTextFn,
        maskInputFn: this.options.maskInputFn,
        slimDOMOptions: this.options.slimDOMOptions!,
        recordCanvas: this.options.recordCanvas,
        inlineImages: this.options.inlineImages,
        onSerialize: (currentN) => {
          if (isSerializedIframe(currentN)) {
            this.emitEvents(ERecordEvent.StoreIfame, currentN as HTMLIFrameElement);
            // this.iframeManager.addIframe(currentN as HTMLIFrameElement);
          }
          if (hasShadowRoot(node)) {
            this.emitEvents(ERecordEvent.AddShadowRoot, node.shadowRoot, document);
            // this.shadowDomManager.addShadowRoot(node.shadowRoot, document);
          }
        },
        onIframeLoad: (iframe, childSn) => {
          this.emitEvents(ERecordEvent.AttachIframe, iframe, childSn);
          this.emitEvents(ERecordEvent.AttachShadowDom, iframe);
          // this.iframeManager.attachIframe(iframe, childSn, mirror);
          // this.shadowDomManager.observeAttachShadow(iframe);
        },
        newlyAddedElement: true,
      });
      if (sn) {
        adds.push({
          parentId,
          nextId,
          node: sn,
        });
      }
    }

    for (const node of Array.from(this.movedSet.values())) {
      if (
        isParentRemoved(this.removes, node) &&
        !this.movedSet.has(node.parentNode!)
      ) {
        continue;
      }
      pushAdds(node);
    }

    for (const n of Array.from(this.addedSet.values())) {
      if (
        !isAncestorInSet(this.droppedSet, n) &&
        !isParentRemoved(this.removes, n)
      ) {
        pushAdds(n);
      } else if (isAncestorInSet(this.movedSet, n)) {
        pushAdds(n);
      } else {
        this.droppedSet.add(n);
      }
    }

    let candidate: DoubleLinkedListNode | null = null;
    while (addList.length) {
      let node: DoubleLinkedListNode | null = null;
      if (candidate) {
        const parentId = mirror.getId(candidate.value.parentNode);
        const nextId = getNextId(candidate.value);
        if (parentId !== -1 && nextId !== -1) {
          node = candidate;
        }
      }
      if (!node) {
        for (let index = addList.length - 1; index >= 0; index--) {
          const _node = addList.get(index)!;
          // ensure _node is defined before attempting to find value
          if (_node) {
            const parentId = mirror.getId(_node.value.parentNode);
            const nextId = getNextId(_node.value);
            if (parentId !== -1 && nextId !== -1) {
              node = _node;
              break;
            }
          }
        }
      }
      if (!node) {
        /**
         * If all nodes in queue could not find a serialized parent,
         * it may be a bug or corner case. We need to escape the
         * dead while loop at once.
         */
        while (addList.head) {
          addList.removeNode(addList.head.value);
        }
        break;
      }
      candidate = node.previous;
      addList.removeNode(node.value);
      pushAdds(node.value);
    }
    return adds;
  }
  private reset() {
    this.removes = [];
    this.addedSet = new Set<Node>();
    this.movedSet = new Set<Node>();
    this.droppedSet = new Set<Node>();
    this.movedMap = new Map();
  }
  public getRecordData = () => {
    while (this.mapRemoves.length) {
      mirror.removeNodeFromMap(this.mapRemoves.shift()!);
    }
    const adds = this.handleAdds();
    const removes = this.removes;

    if(!adds.length && !removes.length) {
      return;
    }

    this.reset();
    return {
      adds,
      removes,
    }
  }
  public mutation = (mutation: MutationRecord) => {
    const { addedNodes, removedNodes, target } = mutation;
    addedNodes.forEach((node) => this.genAdds(node, target));
    removedNodes.forEach((node) => {
      const nodeId = mirror.getId(node);
      const parentId = mirror.getId(isShadowRoot(target) ? target.host : target);
      if (isIgnored(node) || !isSerialized(node)) {
        return;
      }
      if (this.addedSet.has(node)) {
        deepDelete(this.addedSet, node);
        this.droppedSet.add(node);
        this.mapRemoves.push(node);
        return;
      }

      if(this.addedSet.has(target) && nodeId === -1) {
        this.mapRemoves.push(node);
        return;
      }
      if(isAncestorRemoved(target)) {
        this.mapRemoves.push(node);
        return;
      }

      if(this.movedSet.has(node) && this.movedMap.get(this.moveKey(node, parentId))) {
        this.removes.push({
          parentId,
          id: nodeId,
          isShadow: isShadowRoot(target) ? true : undefined,
        });
        this.mapRemoves.push(node);
      }
    })
  }
}

export default MutationChildList;

function deepDelete(addsSet: Set<Node>, n: Node) {
  addsSet.delete(n);
  n.childNodes.forEach((childN) => deepDelete(addsSet, childN));

}
