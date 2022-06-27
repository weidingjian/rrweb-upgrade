import { EventType, IncrementalSource } from '../../../types';
import RecordPlugin from '../plugin';
import { rewritMethod } from '../../util/rewrite-method';
import { mirror } from '../../../utils/mirror';
import { getNestedCSSRulePositions } from './util';
import { ICssRecordPluginOptions, TStyleDeclarationParam } from './types';

class StyleDeclarationRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: ICssRecordPluginOptions) {
    super();
    this.observer();
  }

  private observer(){
    const { win } = this.options;
    const self = this;
    const setPropertyRestoreHandler = rewritMethod<CSSStyleDeclaration>(
      win.CSSStyleDeclaration.prototype,
      'setProperty',
      // @ts-ignore
      function(setProperty){
        return function(
          this: CSSStyleDeclaration,
          property: string,
          value: string,
          priority: string,) {
          const id = mirror.getId(this.parentRule?.parentStyleSheet?.ownerNode);
          if (id !== -1) {
            self.record({
              id,
              set: {
                property,
                value,
                priority,
              },
              index: getNestedCSSRulePositions(this.parentRule!),
            });
          }
          return (setProperty as Function).apply(this, arguments);
        }
      }
    );
    const removePropertyRestoreHandler = rewritMethod<CSSStyleDeclaration>(
      win.CSSStyleDeclaration.prototype,
      'removeProperty',
      // @ts-ignore
      function(removeProperty){
        return function(this: CSSStyleDeclaration, property: string,) {
          const id = mirror.getId(this.parentRule?.parentStyleSheet?.ownerNode);
          if (id !== -1) {
            self.record({
              id,
              remove: {
                property,
              },
              index: getNestedCSSRulePositions(this.parentRule!),
            });
          }
          return (removeProperty as Function).apply(this, arguments);
        }
      }
    );
    this.removeListeners.push(setPropertyRestoreHandler, removePropertyRestoreHandler);
  }

  private record(payload: TStyleDeclarationParam) {

    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.StyleDeclaration,
        ...payload,
      },
    });
    this.options.hooks?.styleDeclaration?.(payload);
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default StyleDeclarationRecordPlugin;
