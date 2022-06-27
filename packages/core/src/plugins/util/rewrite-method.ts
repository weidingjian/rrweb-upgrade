import { IWindow } from "../../types";

type TWrapFn<T> = T extends Function ? T & {__rrweb_original__: T} : T;

export function rewritMethod<T = Record<string, any>, N = T[keyof T]>(
  // tslint:disable-next-line:no-any
  source: T,
  name: keyof T,
  // tslint:disable-next-line:no-any
  replacement: (originalFn: N) => TWrapFn<N>,
): () => void {
  try {
    if (!(name in source)) {
      return () => {};
    }

    const original = source[name];
    // @ts-ignore
    const wrapped = replacement(original);

    // Make sure it's a function first, as we need to attach an empty prototype for `defineProperties` to work
    // otherwise it'll throw "TypeError: Object.defineProperties called on non-object"
    // tslint:disable-next-line:strict-type-predicates
    if (typeof wrapped === 'function') {
      wrapped.prototype = wrapped.prototype || {};
      Object.defineProperties(wrapped, {
        __rrweb_original__: {
          enumerable: false,
          value: original,
        },
      });
    }
    // @ts-ignore
    source[name] = wrapped;

    return () => {
      source[name] = original;
    };
  } catch {
    return () => {};
    // This can throw if multiple fill happens on a global object like XMLHttpRequest
    // Fixes https://github.com/getsentry/sentry-javascript/issues/2043
  }
}
interface PropertyDescriptor {
  configurable?: boolean;
  enumerable?: boolean;
  value?: any;
  writable?: boolean;
  get?(): any;
  set?(v: any): void;
}

export function rewirtMethodByDefineProperty<T>(
  target: T,
  key: keyof T,
  descriptor: PropertyDescriptor,
  isRevoked?: boolean,
  win: IWindow = window,
  ) {
  const originalDescriptor = win.Object.getOwnPropertyDescriptor(target, key);
  const propertyDescriptor = isRevoked ? descriptor : {
    set(value: any) {
      setTimeout(() => {
        descriptor.set!.call(this, value);
      }, 0);
      if (originalDescriptor && originalDescriptor.set) {
        originalDescriptor.set.call(this, value);
      }
    }
  }
  win.Object.defineProperty(target, key, propertyDescriptor);
  const restore = () => rewirtMethodByDefineProperty(target, key, originalDescriptor!,true, win);
  return restore;
}
