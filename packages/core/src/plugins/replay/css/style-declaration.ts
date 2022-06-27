
import { TEventWithTime, TStyleDeclarationData } from '../../../types';
import { mirror } from '../../../utils/mirror';

import ReplayPlugin from '../plugin';
import { getNestedRule } from './util';

class StyleDeclarationReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const d = event.data as TStyleDeclarationData;
    const target = (mirror.getNode(
      d.id,
    ) as Node) as HTMLStyleElement;
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    const styleSheet = target.sheet!;
    if (d.set) {
      const rule = (getNestedRule(
        styleSheet.rules,
        d.index,
      ) as unknown) as CSSStyleRule;
      rule.style.setProperty(d.set.property, d.set.value, d.set.priority);
    }

    if (d.remove) {
      const rule = (getNestedRule(
        styleSheet.rules,
        d.index,
      ) as unknown) as CSSStyleRule;
      rule.style.removeProperty(d.remove.property);
    }
  }
}

export default StyleDeclarationReplayPlugin;
