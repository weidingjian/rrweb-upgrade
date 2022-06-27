import { EventType, IncrementalSource, IWindow } from "../../../types";
import type { FontFaceSet } from 'css-font-loading-module';
import RecordPlugin from "../plugin";
import { rewritMethod } from '../../util/rewrite-method';
import { TFontParam, IFontOptions } from "./types";


class FontRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: IFontOptions) {
    super();
    this.observer();
  }

  private observer(){
    const { doc, collectFonts } = this.options;
    if(!collectFonts) {
      return;
    }
    const self = this;
    const win = doc.defaultView as IWindow;
    if(!win) {
      return;
    }

    const fontMap = new WeakMap<FontFace, TFontParam>();
    const fontFaceRestoreHandler = rewritMethod<IWindow>(
      win,
      'FontFace',
      // @ts-ignore
      function(FontFace: IWindow['FontFace']) {
        return function(
          this: any,
          family: string,
          source: string | ArrayBufferView,
          descriptors?: FontFaceDescriptors,
        ) {
          const fontFace = new FontFace(family, source, descriptors);
          fontMap.set(fontFace, {
            family,
            buffer: typeof source !== 'string',
            descriptors,
            fontSource:
              typeof source === 'string'
                ? source
                : // tslint:disable-next-line: no-any
                  JSON.stringify(Array.from(new Uint8Array(source as any))),
          });
          return fontFace;
        }
      }
    )
    const fontsRestoreHandler = rewritMethod<FontFaceSet>(
      doc.fonts,
      'add',
      // @ts-ignore
      function (original) {
      return function (this: FontFaceSet, fontFace: FontFace) {
        setTimeout(() => {
          const p = fontMap.get(fontFace);
          if (p) {
            self.record(p);
            fontMap.delete(fontFace);
          }
        }, 0);
        return (original as Function)?.apply?.(this, [fontFace]);
      };
    });

    this.removeListeners = [
      fontFaceRestoreHandler,
      fontsRestoreHandler,
    ];
  }

  private record(payload: TFontParam) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Font,
        ...payload,
      },
    });
    this.options.hooks?.font?.(payload);
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default FontRecordPlugin;
