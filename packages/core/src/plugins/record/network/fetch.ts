import { rewritMethod } from "../../util/rewrite-method";
import { IFetchHandlerData, THandler } from "./types";
import { insReqId, supportsNativeFetch } from './util';

export function observerFetch(handler: THandler<IFetchHandlerData>, restoreHandles: (() => void)[]) {
  if (!supportsNativeFetch()) {
    return;
  }
  restoreHandles.push(
    rewritMethod<Window>(
      window,
      'fetch',
      function(originaFetch){
        return function(input: RequestInfo, init?: RequestInit) {
          const handlerData: IFetchHandlerData = {
            reqId: insReqId(),
            args: [input, init],
            startTimestamp: Date.now(),
            stage: 'send',
          };
          handler('fetch', {...handlerData});
          return originaFetch.call(window, input, init).then(
            function(response: Response) {
              handler('fetch', {
                ...handlerData,
                endTimestamp: Date.now(),
                response,
                stage: 'response'
              });
              return response;
            },
            function(error: Error) {
              handler('fetch', {
                ...handlerData,
                endTimestamp: Date.now(),
                error,
                stage: 'error'
              });
              throw error;
            }
            )
        }
      }
    )
  );
}
