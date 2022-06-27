
import RecordPlugin from '../plugin';
import { IFetchHandlerData, INetworkPayload, INetworkRecordPluginOptions, IXHRHandlerData } from './types';
import { observerFetch } from './fetch';
import { observerXHR } from './xhr';
import { ErrorStackParser, StackFrame } from '../../util/error-stack-parser';
import { EventType, IncrementalSource } from '../../../types';
import { combineRegExp, getAllResponseHeaders, deepEncrypt, defaultDeepEncryptHandler } from './util';

class NetworkRecordPlugin extends RecordPlugin {
  private restoreMethodHandles: (() => void)[] = [];
  private requestMap: Map<number, INetworkPayload> = new Map();
  private blackListUrlMap: Map<string, boolean> = new Map();
  constructor(private options: INetworkRecordPluginOptions) {
    super();
    this.observer();
  }
  private blockRecord(url: string) {
    if(this.blackListUrlMap.get(url)) {
      return true;
    }
    const {network = {}} = this.options;
    const {blackListUrl = []} = network;
    const backListUrlRegex = combineRegExp(blackListUrl);
    const isBLock = backListUrlRegex.test(url);
    if(isBLock) {
      this.blackListUrlMap.set(url, true);
    }
    return isBLock
  }
  private handleXHRSendStage(data: IXHRHandlerData) {
    const { reqHeaders, stage, startTimestamp, reqId, url, method, body } = data;
    const _url = url instanceof URL ? url.href : url;

    if(this.blockRecord(_url)) {
      return;
    }
    this.requestMap.set(reqId, {
      type: 'xhr',
      url: _url,
      method,
      body,
      reqHeaders,
      startTimestamp: startTimestamp!,
      stage,
    });
  }

  private handleXHRResponse(data: IXHRHandlerData) {
    const {xhr, reqId, endTimestamp } = data;
    const request = this.requestMap.get(reqId);
    if(request) {
      request.status = xhr.status;
      request.statusText = xhr.statusText;
      request.endTimestamp = endTimestamp;
      request.resHeaders = getAllResponseHeaders(xhr);
      const isText = !xhr.responseType || xhr.responseType === 'text';
      if (xhr.readyState === 4) {
        request.response = isText ? xhr.responseText : xhr.response;
      }
      this.record(request);
      this.requestMap.delete(reqId);
    }
  }
  private handlerXHR = (type: 'fetch' | 'xhr', data: IXHRHandlerData) => {
    try {
      const {stage} = data;
      if(stage === 'send') {
        this.handleXHRSendStage(data);
        return;
      }
      if(['abort', 'error'].includes(stage)) {
        this.handlerError(data);
        return;
      }
      if(stage === 'response') {
        this.handleXHRResponse(data);
      }
    } catch(err: any){
      this.handlerError({
        ...data,
        error: err,
        stage: 'rrweb-error',
      });
    }
  }
  private handlerError = ( data: IFetchHandlerData | IXHRHandlerData) => {
    const {reqId, error, endTimestamp, stage} = data;
    const request = this.requestMap.get(reqId!);
    if(request) {
      request.stage = stage;
      request.endTimestamp = endTimestamp;
      request.error = ErrorStackParser.parse(
        error instanceof Error ? error! : new Error(error?.type as string),
      ).map((stackFrame: StackFrame) => stackFrame.toString());

      this.record(request);
      this.requestMap.delete(reqId);
    }
  }


  private handlerFetchSendStage(data: IFetchHandlerData) {
    const {args, reqId, startTimestamp, stage } = data;
    const [input, init] = args;
    const inputIsRequest = typeof input !== 'string';
    let url = inputIsRequest ? (input as Request).url : input;
    url = /^https?:\/\//.test(url as string) ? url : location.origin + url;
    // 黑名单跳过
    if(this.blockRecord(url)) {
      return;
    }
    const method = inputIsRequest ? (input as Request).method : init?.method || 'GET';
    const requestParams = inputIsRequest ? (input as Request).body : init?.body;
    const headers = inputIsRequest ? (input as Request).headers : init?.headers;
    let reqHeaders: Record<string, any> = {};
    if (headers instanceof Headers) {
      // @ts-ignore
      for (let p of headers) {
        reqHeaders[p[0]] = p[1];
      }
    } else {
      reqHeaders = headers || {};
    }
    this.requestMap.set(reqId, {
      type: 'fetch',
      url,
      method,
      body: requestParams?.toString(),
      reqHeaders,
      startTimestamp,
      stage,
    });
  }
  private async handlerFetchResponse(data: IFetchHandlerData) {
    const {reqId, response, endTimestamp, stage} = data;
    const request = this.requestMap.get(reqId);
    if(request) {
      request.endTimestamp = endTimestamp;
      request.stage = stage;

      const contentType = response?.headers.get('content-type');
      const resHeaders: Record<string, any> = {};
      response?.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });

      request.resHeaders = resHeaders;
      request.status = response?.status;
      request.statusText = response?.statusText;

      const clonedResponse = response?.clone();
      if (contentType?.includes('application/json')) {
        request.response = await clonedResponse?.json()!;
      } else {
        request.response = await clonedResponse?.text();
      }


      this.record(request);
      this.requestMap.delete(reqId);
    }

  }
  private handlerFetch = (type: string, data: IFetchHandlerData) => {

    try {
      const { stage} = data;
      if(stage === 'send') {
        this.handlerFetchSendStage(data);
        return;
      }

      if(stage === 'error') {
        this.handlerError(data);
        return;
      }

      if(stage === 'response') {
        this.handlerFetchResponse(data);
      }
    } catch(err: any){
      this.handlerError({
        ...data,
        error: err,
        stage: 'rrweb-error',
      });
    }
  }
  private observer() {
    const {sampling = {}} = this.options;
    const {network = 'all' } = sampling;
    if(network === 'all') {
      observerFetch(this.handlerFetch, this.restoreMethodHandles);
      observerXHR(this.handlerXHR, this.restoreMethodHandles);
      return;
    }
    if(network === 'fetch') {
      observerFetch(this.handlerFetch, this.restoreMethodHandles);
      return;
    }

    if(network === 'xhr') {
      observerFetch(this.handlerFetch, this.restoreMethodHandles);
      return;
    }
  }

  private encryptResponseData(payload: INetworkPayload) {
    const {network = {}} = this.options;
    const {encryptResponse, maskResponseFields, ignoreHeaderKeys} = network;
    if(encryptResponse) {
      return encryptResponse(payload);
    }
    if(maskResponseFields?.length) {
      payload.response = deepEncrypt(payload.response!, defaultDeepEncryptHandler(maskResponseFields));
    }

    if(ignoreHeaderKeys?.length) {
      Object.keys(payload.resHeaders!).forEach(key => {
        if(ignoreHeaderKeys.includes(key)) {
          delete payload.resHeaders![key];
        }
      });
    }
    return payload;
  }
  private record(payload: INetworkPayload) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Network,
        ...this.encryptResponseData(payload),
      }
    })
  }
  public stopRecord(): void {
    this.restoreMethodHandles.forEach(h => h());
  }
}

export default NetworkRecordPlugin;
