
import { ReplayerEvents, TEventWithTime, TStyleSheetRuleData } from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
import { getNestedRule, getPositionsAndIndex } from './util';

class StyleSheetReplayPlugin extends ReplayPlugin {
  protected init(): void {
    this.listen(ReplayerEvents.FullsnapshotRebuilded, (event, isSync) => {
      if(!isSync) {
        this.waitForStylesheetLoad();
      }
    });
  }
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const d = event.data as TStyleSheetRuleData;
    const target = mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    const styleSheet = (target as HTMLStyleElement).sheet!;
    d.adds?.forEach(({ rule, index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(
            styleSheet.cssRules,
            positions,
          );
          nestedRule.insertRule(rule, index);
        } else {
          const index =
            nestedIndex === undefined
              ? undefined
              : Math.min(nestedIndex, styleSheet.cssRules.length);
          styleSheet.insertRule(rule, index);
        }
      } catch (e) {
        /**
         * sometimes we may capture rules with browser prefix
         * insert rule with prefixs in other browsers may cause Error
         */
        /**
         * accessing styleSheet rules may cause SecurityError
         * for specific access control settings
         */
      }
    });

    d.removes?.forEach(({ index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(
            styleSheet.cssRules,
            positions,
          );
          nestedRule.deleteRule(index || 0);
        } else {
          styleSheet?.deleteRule(nestedIndex);
        }
      } catch (e) {
        /**
         * same as insertRule
         */
      }
    });
  }

  /**
   * pause when loading style sheet, resume when loaded all timeout exceed
   */
   private waitForStylesheetLoad() {
    const head = this.ctx.iframe.contentDocument?.head;
    if (head) {
      const unloadSheets: Set<HTMLLinkElement> = new Set();
      let timer: ReturnType<typeof setTimeout> | -1;
      let beforeLoadState = this.ctx.service.state;
      const stateHandler = () => {
        beforeLoadState = this.ctx.service.state;
      };
      this.listen(ReplayerEvents.Start, stateHandler);
      this.listen(ReplayerEvents.Pause, stateHandler);
      const unsubscribe = () => {
        this.off(ReplayerEvents.Start, stateHandler);
        this.off(ReplayerEvents.Pause, stateHandler);
      };
      head
        .querySelectorAll('link[rel="stylesheet"]')
        .forEach((css: any) => {
          if (!css.sheet) {
            unloadSheets.add(css);
            css.addEventListener('load', () => {
              unloadSheets.delete(css);
              // all loaded and timer not released yet
              if (unloadSheets.size === 0 && timer !== -1) {
                if (beforeLoadState.matches('playing')) {
                  // this.play(this.getCurrentTime());
                  this.emit(ReplayerEvents.Play);
                }
                this.emit(ReplayerEvents.LoadStylesheetEnd);
                if (timer) {
                  clearTimeout(timer);
                }
                unsubscribe();
              }
            });
          }
        });

      if (unloadSheets.size > 0) {
        // find some unload sheets after iterate
        this.ctx.service.send({ type: 'PAUSE' });
        this.emit(ReplayerEvents.LoadStylesheetStart);
        timer = setTimeout(() => {
          if (beforeLoadState.matches('playing')) {
            this.emit(ReplayerEvents.Play);
          }
          // mark timer was called
          timer = -1;
          unsubscribe();
        }, this.config.loadTimeout);
      }
    }
  }
}

export default StyleSheetReplayPlugin;
