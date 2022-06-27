import { IContextOptions, IncrementalSource } from '../../../types';

export interface IFontOptions {
  doc: IContextOptions['doc'];
  hooks?: {
    font?: (payload: TFontParam) => void;
  };
  collectFonts?: boolean;
}

export type TFontParam = {
  family: string;
  fontSource: string;
  buffer: boolean;
  descriptors?: FontFaceDescriptors;
};

export type TFontData = {
  source: IncrementalSource.Font;
} & TFontParam;
