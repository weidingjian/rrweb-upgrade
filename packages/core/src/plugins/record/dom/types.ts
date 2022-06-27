import { serializedNodeWithId, SlimDOMOptions } from '../../../snapshot';
import { IContextOptions, IMaskOptions, ICommonOptions, IncrementalSource } from '../../../types';

export interface IDOMRecordPluginOptions extends IMaskOptions, ICommonOptions {
  doc: IContextOptions['doc'];
  blockSelector?: string;
  inlineStylesheet?: boolean;
  slimDOMOptions?: SlimDOMOptions;
  recordCanvas?: boolean;
  inlineImages?: boolean;
  hooks?: {
    mutation?: (payload: Partial<TMutationCallbackParam>) => void;
  }
}

export type TTextCursor = {
  node: Node;
  value: string | null;
};

export type TTextMutation = {
  id: number;
  value: string | null;
};

export type TAttributeCursor = {
  node: Node;
  attributes: {
    [key: string]: any;
  };
};
export type TAttributeMutation = {
  id: number;
  attributes: {
    [key: string]: any;
  };
};

export type TRemovedNodeMutation = {
  parentId: number;
  id: number;
  isShadow?: boolean;
};

export type TAddedNodeMutation = {
  parentId: number;
  // Newly recorded mutations will not have previousId any more, just for compatibility
  previousId?: number | null;
  nextId: number | null;
  node: serializedNodeWithId;
};

export type TMutationCallbackParam = {
  texts: TTextMutation[];
  attributes: TAttributeMutation[];
  removes: TRemovedNodeMutation[];
  adds: TAddedNodeMutation[];
  isAttachIframe?: true;
};

export type TMutationData = {
  source: IncrementalSource.Mutation;
} & TMutationCallbackParam;
