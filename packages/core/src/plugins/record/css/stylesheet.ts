import { EventType, IncrementalSource } from '../../../types';
import RecordPlugin from '../plugin';
import { rewritMethod } from '../../util/rewrite-method';
import { mirror } from '../../../utils/mirror';
import { getNestedCSSRulePositions, getSupportedNestedCSSRuleTypes } from './util';
import { ICssRecordPluginOptions, TStyleSheetRuleParam } from './types';

class StyleSheetRecordPlugin extends RecordPlugin {
  private removeListeners: (() => void)[] = []
  constructor(private options: ICssRecordPluginOptions) {
    super();
    this.observerRuleMethod();
    this.observerNestedCssRule();
  }

  private observerRuleMethod(){
    const { win } = this.options;
    const self = this;
    const insetRuleRestoreHandler = rewritMethod<CSSStyleSheet>(
      win.CSSStyleSheet.prototype,
      'insertRule',
      // @ts-ignore
      function(insertRule){
        return function(this: StyleSheet, rule: string, index?: number,) {
          const id = mirror.getId(this.ownerNode);
          if (id !== -1) {
            self.record({
              id,
              adds: [{ rule, index }],
            });
          }
          return (insertRule as Function).apply(this, arguments);
        }
      }
    );
    const deleteRuleRestoreHandler = rewritMethod<CSSStyleSheet>(
      win.CSSStyleSheet.prototype,
      'deleteRule',
      // @ts-ignore
      function(deleteRule){
        return function(this: StyleSheet, index: number,) {
          const id = mirror.getId(this.ownerNode);
          if (id !== -1) {
            self.record({
              id,
              removes: [{ index }],
            });
          }
          return (deleteRule as Function).apply(this, arguments);
        }
      }
    );
    this.removeListeners.push(insetRuleRestoreHandler, deleteRuleRestoreHandler);
  }
  private observerNestedCssRule() {
    const {win} = this.options;
    const self = this;

    const  supportedNestedCSSRuleTypes = getSupportedNestedCSSRuleTypes(win)

    Object.values(supportedNestedCSSRuleTypes).forEach((type) => {
      this.removeListeners.push(rewritMethod<typeof type.prototype>(
        type.prototype,
        'insertRule',
        // @ts-ignore
        function(insertRule){
          return function(this: CSSRule, rule: string, index?: number ) {
            const id = mirror.getId(this.parentStyleSheet?.ownerNode);
            if (id !== -1) {
              self.record({
                id,
                adds: [
                  {
                    rule,
                    index: [
                      ...getNestedCSSRulePositions(this),
                      index || 0, // defaults to 0
                    ],
                  },
                ],
              })
            }
            return (insertRule as Function).apply(this, arguments);
          }
        }
      ));

      this.removeListeners.push(rewritMethod<typeof type.prototype>(
        type.prototype,
        'deleteRule',
        // @ts-ignore
        function(deleteRule){
          return function(this: CSSRule, index?: number ) {
            const id = mirror.getId(this.parentStyleSheet?.ownerNode);
            if (id !== -1) {
              self.record({
                id,
                removes: [
                  {
                    index: [
                      ...getNestedCSSRulePositions(this),
                      index || 0, // defaults to 0
                    ],
                  },
                ],
              })
            }
            return (deleteRule as Function).apply(this, arguments);
          }
        }
      ));
    });
  }
  private record(payload: TStyleSheetRuleParam) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.StyleSheetRule,
        ...payload,
      },
    });
    this.options.hooks?.styleSheetRule?.(payload);
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default StyleSheetRecordPlugin;
