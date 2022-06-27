import { rewritMethod } from '../../util/rewrite-method';
import { IRRWebXMLHttpRequest, IXHRHandlerData, THandler } from './types';
import { insReqId } from './util';

const addedKey = '__rrweb_xhr_';

export function observerXHR(handler: THandler<IXHRHandlerData>, restoreHandles: (() => void)[]) {
  if (!('XMLHttpRequest' in window)) {
    return;
  }
  restoreHandles.push(
    rewritMethod<XMLHttpRequest>(XMLHttpRequest.prototype, 'open', function(originalOpen){
      return function(this: IRRWebXMLHttpRequest, ...args: Parameters<XMLHttpRequest['open']>) {
        const xhr = this;
        const reqHeaders: Record<string, any> = {};
        const reqId = insReqId();
        xhr[addedKey] = {
          reqId,
          url: args[1],
          method: args[0],
          reqHeaders,
        };

        // setRequestHeader
        restoreHandles.push(
          rewritMethod<IRRWebXMLHttpRequest>(xhr, 'setRequestHeader', function(originalSetRequestHeader){
            return function(name: string, value: string) {
              reqHeaders[name] = value;
              return originalSetRequestHeader.call(xhr, name, value);
            }
          })
        );
        // onError
        const onError = function (event: ProgressEvent) {
          handler('xhr', {
            ...xhr[addedKey],
            endTimestamp: Date.now(),
            error: event,
            // headers,
            stage: 'error',
            xhr,
          });
        }
        if ('onerror' in xhr && typeof xhr.onerror === 'function') {
          restoreHandles.push(
            rewritMethod<IRRWebXMLHttpRequest>(xhr, 'onerror', function (originalError) {
              return function (this: IRRWebXMLHttpRequest, event: ProgressEvent) {
                onError(event);
                return originalError.apply(xhr, event);
              }
          }));
        } else {
          xhr.addEventListener('error', onError);
        }
        // onabort
        const onAbort = function (event: ProgressEvent) {
          handler('xhr', {
            ...xhr[addedKey],
            endTimestamp: Date.now(),
            error: event,
            // headers,
            stage: 'abort',
            xhr,
          });
        }
        if ('onabort' in xhr && typeof xhr.onabort === 'function') {
          restoreHandles.push(
            rewritMethod<IRRWebXMLHttpRequest>(xhr, 'onabort', function (originalAbort) {
              return function (this: IRRWebXMLHttpRequest, event: ProgressEvent) {
                onAbort(event);
                return originalAbort.apply(xhr, event);
              }
          }));
        } else {
          xhr.addEventListener('abort', onAbort);
        }
        // onreadystatechange
        const onreadystatechangeHandler = function () {
          handler('xhr', {
            ...xhr[addedKey],
            endTimestamp: Date.now(),
            xhr,
            // headers,
            stage: 'response'
          });
        }
        if ('onreadystatechange' in xhr && typeof xhr.onreadystatechange === 'function') {
          restoreHandles.push(rewritMethod(xhr, 'onreadystatechange', function (originalOnreadystatechange) {
            return function (...readyStateArgs: any[]): void {
              onreadystatechangeHandler();
              return originalOnreadystatechange.apply(xhr, readyStateArgs);
            };
          }));
        } else {
          xhr.addEventListener('readystatechange', onreadystatechangeHandler);
        }

        return originalOpen.apply(xhr, args);
      }
    })
  );
  restoreHandles.push(
    rewritMethod<XMLHttpRequest>(XMLHttpRequest.prototype, 'send', function(originalSend){
      return function(this: IRRWebXMLHttpRequest, ...args: Parameters<XMLHttpRequest['send']>) {
        if (this[addedKey] && args[0] !== undefined) {
          this[addedKey].body = args[0];
        }
        handler('xhr', {
          ...this[addedKey],
          startTimestamp: Date.now(),
          xhr: this,
          stage: 'send',
        });
        return originalSend.apply(this, args);
      }
    })
  )
}
