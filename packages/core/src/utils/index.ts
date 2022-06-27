import { IWindow, throttleOptions } from "../types";

export function throttle<T>(
  func: (arg: T) => void,
  wait: number,
  options: throttleOptions = {},
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  return function (this: any, arg: T) {
    const now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    const context = this;
    const args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      // @ts-ignore
      func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        // @ts-ignore
        func.apply(context, args);
      }, remaining);
    }
  };
}

export function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target: Document | IWindow = document,
): () => void {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}

export function polyfill(win = window) {
  if ('NodeList' in win && !win.NodeList.prototype.forEach) {
    win.NodeList.prototype.forEach = (Array.prototype
      .forEach as unknown) as NodeList['forEach'];
  }

  if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
    win.DOMTokenList.prototype.forEach = (Array.prototype
      .forEach as unknown) as DOMTokenList['forEach'];
  }

  // https://github.com/Financial-Times/polyfill-service/pull/183
  if (!Node.prototype.contains) {
    Node.prototype.contains = function contains(node) {
      if (!(0 in arguments)) {
        throw new TypeError('1 argument is required');
      }

      do {
        if (this === node) {
          return true;
        }
        // tslint:disable-next-line: no-conditional-assignment
      } while ((node = node && node.parentNode));

      return false;
    };
  }
}
