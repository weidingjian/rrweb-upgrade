import { classMatchesRegex, IGNORED_NODE, isShadowRoot } from "../snapshot";
import { TBlockClass } from '../types';
import { mirror } from "./mirror";

export function isIgnored(n: Node): boolean {
  // The main part of the slimDOM check happens in
  // rrweb-snapshot::serializeNodeWithId
  return mirror.getId(n) === IGNORED_NODE;
}

export function isBlocked(
  node: Node | null,
  blockClassname?: TBlockClass,
  checkAncestors: boolean = false,
): boolean {
  if (!node) {
    return false;
  }
  const el: HTMLElement | null =
    node.nodeType === node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  if (!el) return false;

  if (typeof blockClassname === 'string') {
    if (el.classList.contains(blockClassname)) return true;
    if (checkAncestors && el.closest('.' + blockClassname) !== null) return true;
  } else {
    if (classMatchesRegex(el, blockClassname, checkAncestors)) return true;
  }
  return false;
}

export function isSerialized(n: Node): boolean {
  return mirror.getId(n) !== -1;
}

export function isAncestorRemoved(target: Node): boolean {
  if (isShadowRoot(target)) {
    return false;
  }
  const id = mirror.getId(target);
  if (!mirror.has(id)) {
    return true;
  }
  if (
    target.parentNode &&
    target.parentNode.nodeType === target.DOCUMENT_NODE
  ) {
    return false;
  }
  // if the root is not document, it means the node is not in the DOM tree anymore
  if (!target.parentNode) {
    return true;
  }
  return isAncestorRemoved(target.parentNode);
}

export function hasShadowRoot<T extends Node>(
  n: T,
): n is T & { shadowRoot: ShadowRoot } {
  return Boolean(((n as unknown) as Element)?.shadowRoot);
}

export function isTouchEvent(
  event: MouseEvent | TouchEvent,
): event is TouchEvent {
  return Boolean((event as TouchEvent).changedTouches);
}


export function isSerializedIframe<TNode extends Node>(
  n: TNode,
): boolean {
  return Boolean(n.nodeName === 'IFRAME' && mirror.getMeta(n));
}
const objectToString = Object.prototype.toString;

export function isString(str: any) {
  return objectToString.call(str) === `[object String]`
}
