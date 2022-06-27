import { IContextOptions, IncrementalSource } from '../../../types';

export interface ICssRecordPluginOptions {
  win: IContextOptions['win'];
  hooks?: {
    styleDeclaration?: (payload: any) => void;
    styleSheetRule?:(payload: any) => void;
  };
}

export type TStyleSheetAddRule = {
  rule: string;
  index?: number | number[];
};

export type TStyleSheetDeleteRule = {
  index: number | number[];
};

export type TStyleSheetRuleParam = {
  id: number;
  removes?: TStyleSheetDeleteRule[];
  adds?: TStyleSheetAddRule[];
};

export type TStyleDeclarationParam = {
  id: number;
  index: number[];
  set?: {
    property: string;
    value: string | null;
    priority: string | undefined;
  };
  remove?: {
    property: string;
  };
};

export type TStyleSheetRuleData = {
  source: IncrementalSource.StyleSheetRule;
} & TStyleSheetRuleParam;

export type TStyleDeclarationData = {
  source: IncrementalSource.StyleDeclaration;
} & TStyleDeclarationParam;
