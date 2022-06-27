let reqId = 0;
export const insReqId = () => {
  reqId++;
  return reqId;
}

export function supportsFetch(): boolean {
  if (!('fetch' in window)) {
    return false;
  }

  try {
    new Headers();
    new Request('');
    new Response();
    return true;
  } catch (e) {
    return false;
  }
}

export function supportsNativeFetch(): boolean {
  if (!supportsFetch()) {
    return false;
  }

  // Fast path to avoid DOM I/O
  // eslint-disable-next-line @typescript-eslint/unbound-method
  if (isNativeFetch(window.fetch)) {
    return true;
  }

  // window.fetch is implemented, but is polyfilled or already wrapped (e.g: by a chrome extension)
  // so create a "pure" iframe to see if that has native fetch
  let result = false;
  const doc = window.document;
  // eslint-disable-next-line deprecation/deprecation
  if (doc && typeof (doc.createElement as unknown) === 'function') {
    try {
      const sandbox = doc.createElement('iframe');
      sandbox.hidden = true;
      doc.head.appendChild(sandbox);
      if (sandbox.contentWindow && sandbox.contentWindow.fetch) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        result = isNativeFetch(sandbox.contentWindow.fetch);
      }
      doc.head.removeChild(sandbox);
    } catch (err) {
        console.warn('Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ', err);
    }
  }

  return result;
}

export function isNativeFetch(func: Function): boolean {
  return func && /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
}

export const getAllResponseHeaders = function (xhr: XMLHttpRequest) {
  if (!('getAllResponseHeaders' in xhr)) {
    return {}
  }
  const headers = xhr.getAllResponseHeaders();
  const arr = headers.trim().split(/[\r\n]+/);
  return arr.reduce((o: any, line: string) => {
    const parts = line.split(': ');
    const header = parts.shift();
    const value = parts.join(': ');
    if (header) {
      o[header] = value;
    }
    return o;
  }, {});
}

export function combineRegExp(patterns: (string | RegExp)[]) {
  // Combine an array of regular expressions and strings into one large regexp
  // Be mad.
  let sources = [],
      i = 0, len = patterns.length,
      pattern;
  if(len === 0){
    return /''/;
  }
  for (; i < len; i++) {
      pattern = patterns[i];
      if (typeof pattern === 'string') {
          // If it's a string, we need to escape it
          // Taken from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
          sources.push(pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'));
      } else if (pattern && pattern.source) {
          // If it's a regexp already, we want to extract the source
          sources.push(pattern.source);
      }
      // Intentionally skip other cases
  }
  return new RegExp(sources.join('|'), 'i');
}

export const deepEncrypt = <T = any>(o: T, handler: (key: string, value: any) => any): T => {
  try {
    return JSON.parse(JSON.stringify(o, handler))
  } catch(e) {
    return o;
  }
}

export const defaultDeepEncryptHandler = (keys: string[]) => {
  return (key: string, value: any) => {
    if(keys.includes(key)) {
      if(['number', 'string'].includes(typeof value)){
          return String(value).replace(/[\S]/g, '*');
      }
      return '*'
    }
    return value;
  }
}
