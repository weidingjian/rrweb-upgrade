import { IGNORED_NODE } from "../../../snapshot";
import { IWindow, Optional, TRemovedNodeMutation } from "../../../types";
import { mirror } from "../../../utils/mirror";

export function deepDelete(addsSet: Set<Node>, node: Node) {
  addsSet.delete(node);
  node.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}

export type DoubleLinkedListNode = {
  previous: DoubleLinkedListNode | null;
  next: DoubleLinkedListNode | null;
  value: NodeInLinkedList;
};
type NodeInLinkedList = Node & {
  __ln: DoubleLinkedListNode;
};

function isNodeInLinkedList(node: Node | NodeInLinkedList): node is NodeInLinkedList {
  return '__ln' in node;
}

export class DoubleLinkedList {
  public length = 0;
  public head: DoubleLinkedListNode | null = null;

  public get(position: number) {
    if (position >= this.length) {
      throw new Error('Position outside of list range');
    }

    let current = this.head;
    for (let index = 0; index < position; index++) {
      current = current?.next || null;
    }
    return current;
  }

  public addNode(n: Node) {
    const node: DoubleLinkedListNode = {
      value: n as NodeInLinkedList,
      previous: null,
      next: null,
    };
    (n as NodeInLinkedList).__ln = node;
    if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
      const current = n.previousSibling.__ln.next;
      node.next = current;
      node.previous = n.previousSibling.__ln;
      n.previousSibling.__ln.next = node;
      if (current) {
        current.previous = node;
      }
    } else if (
      n.nextSibling &&
      isNodeInLinkedList(n.nextSibling) &&
      n.nextSibling.__ln.previous
    ) {
      const current = n.nextSibling.__ln.previous;
      node.previous = current;
      node.next = n.nextSibling.__ln;
      n.nextSibling.__ln.previous = node;
      if (current) {
        current.next = node;
      }
    } else {
      if (this.head) {
        this.head.previous = node;
      }
      node.next = this.head;
      this.head = node;
    }
    this.length++;
  }

  public removeNode(n: NodeInLinkedList) {
    const current = n.__ln;
    if (!this.head) {
      return;
    }

    if (!current.previous) {
      this.head = current.next;
      if (this.head) {
        this.head.previous = null;
      }
    } else {
      current.previous.next = current.next;
      if (current.next) {
        current.next.previous = current.previous;
      }
    }
    if (n.__ln) {
      delete (n as Optional<NodeInLinkedList, '__ln'>).__ln;
    }
    this.length--;
  }
}

export const getNextId = (n: Node): number | null => {
  let ns: Node | null = n;
  let nextId: number | null = IGNORED_NODE; // slimDOM: ignored
  while (nextId === IGNORED_NODE) {
    ns = ns && ns.nextSibling;
    nextId = ns && mirror.getId(ns);
  }
  return nextId;
};

export const getShadowHost = (node: Node | Element |
   null): Element | null => {
  if(!node) {
    return null;
  }
  return (node.getRootNode?.() as ShadowRoot)?.host || null
}

export function isParentRemoved(
  removes: TRemovedNodeMutation[],
  n: Node,
): boolean {
  if (removes.length === 0) return false;
  return _isParentRemoved(removes, n);
}

function _isParentRemoved(
  removes: TRemovedNodeMutation[],
  n: Node,
): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  const parentId = mirror.getId(parentNode);
  if (removes.some((r) => r.id === parentId)) {
    return true;
  }
  return _isParentRemoved(removes, parentNode);
}

export function isAncestorInSet(set: Set<Node>, n: Node): boolean {
  if (set.size === 0) return false;
  return _isAncestorInSet(set, n);
}

function _isAncestorInSet(set: Set<Node>, n: Node): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  if (set.has(parentNode)) {
    return true;
  }
  return _isAncestorInSet(set, parentNode);
}

type WindowWithStoredMutationObserver = IWindow & {
  __rrMutationObserver?: MutationObserver;
};
type WindowWithAngularZone = IWindow & {
  Zone?: {
    __symbol__?: (key: string) => string;
  };
};

export const mutationObserverCtor = (cb: MutationCallback, rootEl: Node) => {
  let MutationObserverCtor =
  window.MutationObserver ||
  /**
   * Some websites may disable MutationObserver by removing it from the window object.
   * If someone is using rrweb to build a browser extention or things like it, they
   * could not change the website's code but can have an opportunity to inject some
   * code before the website executing its JS logic.
   * Then they can do this to store the native MutationObserver:
   * window.__rrMutationObserver = MutationObserver
   */
  (window as WindowWithStoredMutationObserver).__rrMutationObserver;

  const angularZoneSymbol = (window as WindowWithAngularZone)?.Zone?.__symbol__?.(
    'MutationObserver',
  );

  if (
    angularZoneSymbol &&
    ((window as unknown) as Record<string, typeof MutationObserver>)[
      angularZoneSymbol
    ]
  ) {
    MutationObserverCtor = ((window as unknown) as Record<
      string,
      typeof MutationObserver
    >)[angularZoneSymbol];
  }
  const observer = new (MutationObserverCtor as new (
    callback: MutationCallback,
  ) => MutationObserver)(cb);
  observer.observe(rootEl, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
  return observer;
}
