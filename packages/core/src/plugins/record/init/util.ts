import { MaskInputOptions, SlimDOMOptions } from "../../../snapshot";
import { recordOptions } from "../../../types";
import { polyfill } from "../../../utils";
import { mirror } from "../../../utils/mirror";

export function handleRecordOptions (options: recordOptions): recordOptions {
  const {
    emit,
    blockClass = 'rr-block',
    ignoreClass = 'rr-ignore',
    maskTextClass = 'rr-mask',
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    // hooks,
    // packFn,
    // plugins,
    sampling = {},
    mousemoveWait,
    recordCanvas = false,
    userTriggeredOnInput = false,
    collectFonts = false,
    inlineImages = false,
    keepIframeSrcFn = () => false,
  } = options;

  if (!emit) {
    throw new Error('emit function is required');
  }

  // move departed options to new options
  if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
    sampling.mousemove = mousemoveWait;
  }
  // reset mirror in case `record` this was called earlier
  mirror.reset();

  const maskInputOptions: MaskInputOptions =
    maskAllInputs === true
      ? {
          color: true,
          date: true,
          'datetime-local': true,
          email: true,
          month: true,
          number: true,
          range: true,
          search: true,
          tel: true,
          text: true,
          time: true,
          url: true,
          week: true,
          textarea: true,
          select: true,
          password: true,
        }
      : _maskInputOptions !== undefined
      ? _maskInputOptions
      : { password: true };

      const slimDOMOptions: SlimDOMOptions =
      _slimDOMOptions === true || _slimDOMOptions === 'all'
        ? {
            script: true,
            comment: true,
            headFavicon: true,
            headWhitespace: true,
            headMetaSocial: true,
            headMetaRobots: true,
            headMetaHttpEquiv: true,
            headMetaVerification: true,
            // the following are off for slimDOMOptions === true,
            // as they destroy some (hidden) info:
            headMetaAuthorship: _slimDOMOptions === 'all',
            headMetaDescKeywords: _slimDOMOptions === 'all',
          }
        : _slimDOMOptions
        ? _slimDOMOptions
        : {};

    polyfill();

    return {
      ...options,
      blockClass,
      ignoreClass,
      maskTextClass,
      // maskTextSelector,
      inlineStylesheet,
      maskInputOptions,
      slimDOMOptions,
      sampling,
      recordCanvas,
      userTriggeredOnInput,
      collectFonts,
      inlineImages,
      keepIframeSrcFn,
    }
}
