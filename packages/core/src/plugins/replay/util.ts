import { PlayerConfig } from "../../replay/types";
import { EventType, IncrementalSource, IWindow, MouseInteractions, TAddedNodeMutation, TEventWithTime, TTextMutation } from "../../types";
import { polyfill } from "../../utils";
import { mirror } from "../../utils/mirror";
import { smoothscrollPolyfill } from "./smoothscroll";
import { DocumentDimension } from "./types";

   // next not present at this moment
export const nextNotInDOM = (mutation: TAddedNodeMutation) => {
  let next: Node | null = null;
  if (mutation.nextId) {
    next = mirror.getNode(mutation.nextId) as Node | null;
  }
  // next not present at this moment
  if (
    mutation.nextId !== null &&
    mutation.nextId !== undefined &&
    mutation.nextId !== -1 &&
    !next
  ) {
    return true;
  }
  return false;
};

type ResolveTree = {
  value: TAddedNodeMutation;
  children: ResolveTree[];
  parent: ResolveTree | null;
};

export function queueToResolveTrees(queue: TAddedNodeMutation[]): ResolveTree[] {
  const queueNodeMap: Record<number, ResolveTree> = {};
  const putIntoMap = (
    m: TAddedNodeMutation,
    parent: ResolveTree | null,
  ): ResolveTree => {
    const nodeInTree: ResolveTree = {
      value: m,
      parent,
      children: [],
    };
    queueNodeMap[m.node.id] = nodeInTree;
    return nodeInTree;
  };

  const queueNodeTrees: ResolveTree[] = [];
  for (const mutation of queue) {
    const { nextId, parentId } = mutation;
    if (nextId && nextId in queueNodeMap) {
      const nextInTree = queueNodeMap[nextId];
      if (nextInTree.parent) {
        const idx = nextInTree.parent.children.indexOf(nextInTree);
        nextInTree.parent.children.splice(
          idx,
          0,
          putIntoMap(mutation, nextInTree.parent),
        );
      } else {
        const idx = queueNodeTrees.indexOf(nextInTree);
        queueNodeTrees.splice(idx, 0, putIntoMap(mutation, null));
      }
      continue;
    }
    if (parentId in queueNodeMap) {
      const parentInTree = queueNodeMap[parentId];
      parentInTree.children.push(putIntoMap(mutation, parentInTree));
      continue;
    }
    queueNodeTrees.push(putIntoMap(mutation, null));
  }

  return queueNodeTrees;
}

export function iterateResolveTree(
  tree: ResolveTree,
  cb: (mutation: TAddedNodeMutation) => unknown,
) {
  cb(tree.value);
  /**
   * The resolve tree was designed to reflect the DOM layout,
   * but we need append next sibling first, so we do a reverse
   * loop here.
   */
  for (let i = tree.children.length - 1; i >= 0; i--) {
    iterateResolveTree(tree.children[i], cb);
  }
}

/**
 * Returns the latest mutation in the queue for each node.
 * @param  {TTextMutation[]} mutations The text mutations to filter.
 * @returns {TTextMutation[]} The filtered text mutations.
 */
 export function uniqueTextMutations(mutations: TTextMutation[]): TTextMutation[] {
  const idSet = new Set<number>();
  const uniqueMutations: TTextMutation[] = [];

  for (let i = mutations.length; i--; ) {
    const mutation = mutations[i];
    if (!idSet.has(mutation.id)) {
      uniqueMutations.push(mutation);
      idSet.add(mutation.id);
    }
  }

  return uniqueMutations;
}

export function getBaseDimension(
  node: Node,
  rootIframe: Node,
): DocumentDimension {
  const frameElement = node.ownerDocument?.defaultView?.frameElement;
  if (!frameElement || frameElement === rootIframe) {
    return {
      x: 0,
      y: 0,
      relativeScale: 1,
      absoluteScale: 1,
    };
  }

  const frameDimension = frameElement.getBoundingClientRect();
  const frameBaseDimension = getBaseDimension(frameElement, rootIframe);
  // the iframe element may have a scale transform
  const relativeScale = frameDimension.height / frameElement.clientHeight;
  return {
    x:
      frameDimension.x * frameBaseDimension.relativeScale +
      frameBaseDimension.x,
    y:
      frameDimension.y * frameBaseDimension.relativeScale +
      frameBaseDimension.y,
    relativeScale,
    absoluteScale: frameBaseDimension.absoluteScale * relativeScale,
  };
}

export const initDom = (config: PlayerConfig) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('replayer-wrapper');
  config.root.appendChild(wrapper);

  const mouse = document.createElement('div');
  mouse.classList.add('replayer-mouse');
  wrapper.appendChild(mouse);

  let mouseTail = null;
  if (config.mouseTail !== false) {
    mouseTail = document.createElement('canvas');
    mouseTail.classList.add('replayer-mouse-tail');
    mouseTail.style.display = 'inherit';
    wrapper.appendChild(mouseTail);
  }

  const iframe = document.createElement('iframe');
  const attributes = ['allow-same-origin'];
  if (config.UNSAFE_replayCanvas) {
    attributes.push('allow-scripts');
  }
  // hide iframe before first meta event
  iframe.style.display = 'none';
  iframe.setAttribute('sandbox', attributes.join(' '));
  // this.disableInteract();
  iframe.setAttribute('scrolling', 'no')
  iframe.style.pointerEvents = 'none';

  wrapper.appendChild(iframe);
  if (iframe.contentWindow && iframe.contentDocument) {
    smoothscrollPolyfill(
      iframe.contentWindow,
      iframe.contentDocument,
    );
    polyfill(iframe.contentWindow as IWindow);
  }
  return {
    iframe,
    mouse,
    mouseTail,
    wrapper
  }
}

export function indicatesTouchDevice(e: TEventWithTime) {
  return (
    e.type == EventType.IncrementalSnapshot &&
    (e.data.source == IncrementalSource.TouchMove ||
      (e.data.source == IncrementalSource.MouseInteraction &&
        e.data.type == MouseInteractions.TouchStart))
  );
}
