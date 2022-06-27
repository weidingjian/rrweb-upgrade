import { IWindow } from "../../../types";

export const isCSSGroupingRuleSupported = typeof CSSGroupingRule !== 'undefined';
export const isCSSMediaRuleSupported = typeof CSSMediaRule !== 'undefined';
export const isCSSSupportsRuleSupported = typeof CSSSupportsRule !== 'undefined';
export const isCSSConditionRuleSupported = typeof CSSConditionRule !== 'undefined';

type GroupingCSSRule =
  | CSSGroupingRule
  | CSSMediaRule
  | CSSSupportsRule
  | CSSConditionRule;

type GroupingCSSRuleTypes =
  | typeof CSSGroupingRule
  | typeof CSSMediaRule
  | typeof CSSSupportsRule
  | typeof CSSConditionRule;

export function getNestedCSSRulePositions(rule: CSSRule): number[] {
  const positions: number[] = [];
  function recurse(childRule: CSSRule, pos: number[]) {
    if (
      (isCSSGroupingRuleSupported &&
        childRule.parentRule instanceof CSSGroupingRule) ||
      (isCSSMediaRuleSupported &&
        childRule.parentRule instanceof CSSMediaRule) ||
      (isCSSSupportsRuleSupported &&
        childRule.parentRule instanceof CSSSupportsRule) ||
      (isCSSConditionRuleSupported &&
        childRule.parentRule instanceof CSSConditionRule)
    ) {
      const rules = Array.from(
        (childRule.parentRule as GroupingCSSRule).cssRules,
      );
      const index = rules.indexOf(childRule);
      pos.unshift(index);
    } else {
      const rules = Array.from(childRule.parentStyleSheet!.cssRules);
      const index = rules.indexOf(childRule);
      pos.unshift(index);
    }
    return pos;
  }
  return recurse(rule, positions);
}

export const getSupportedNestedCSSRuleTypes = (win: IWindow) => {
  const supportedNestedCSSRuleTypes: {
    [key: string]: GroupingCSSRuleTypes;
  } = {};
  if (isCSSGroupingRuleSupported) {
    supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
  } else {
    // Some browsers (Safari) don't support CSSGroupingRule
    // https://caniuse.com/?search=cssgroupingrule
    // fall back to monkey patching classes that would have inherited from CSSGroupingRule

    if (isCSSMediaRuleSupported) {
      supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
    }
    if (isCSSConditionRuleSupported) {
      supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
    }
    if (isCSSSupportsRuleSupported) {
      supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
    }
  }
  return supportedNestedCSSRuleTypes;
}
