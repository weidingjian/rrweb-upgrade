import { EventType, ICommonOptions, IncrementalSource } from "../../../types";

type XHRBody = null | Document | XMLHttpRequestBodyInit;
type FetchBody = RequestInit['body'];
type TStage = 'send' | 'error' | 'response' | 'rrweb-error' | 'abort';
export interface IXHRHandlerData {
  url: string | URL;
  method: string;
  status_code?: number;
  body?: XHRBody;
  reqId: number;
  xhr: XMLHttpRequest;
  startTimestamp?: number;
  endTimestamp?: number;
  stage: TStage;
  error?: ProgressEvent;
  reqHeaders?: Record<string, any>;
}

export interface IFetchHandlerData {
  reqId: number;
  args: [RequestInfo, RequestInit | undefined];
  startTimestamp: number;
  endTimestamp?: number;
  stage: TStage;
  error?: Error;
  response?: Response;
}
export interface IRRWebXMLHttpRequest extends XMLHttpRequest {
  __rrweb_xhr_: Pick<IXHRHandlerData, 'reqId' | 'method' | 'url' | 'body' | 'reqHeaders'>
}

export type THandler<T> = (type: 'fetch' | 'xhr', data: T) => void;

export interface INetworkPayload {
  response?: string;
  type: 'fetch' | 'xhr';
  url: string;
  method: string;
  body: FetchBody | XHRBody;
  reqHeaders?: Record<string, string>;
  resHeaders?: Record<string, string>;
  startTimestamp: number;
  endTimestamp?: number;
  stage: TStage;
  error?: string[];
  status?: number;
  statusText?: string;
}

export type TNetworkEventData = {
  source: IncrementalSource.Network;
} & INetworkPayload;

export interface INetworkRecordPluginOptions extends ICommonOptions {
  network?: {
    blackListUrl?: (string | RegExp)[];
    encryptResponse?: (ctx: INetworkPayload) => INetworkPayload;
    maskResponseFields?: string[];
    ignoreHeaderKeys?: string[];
  }
}
