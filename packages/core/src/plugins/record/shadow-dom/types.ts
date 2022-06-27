
import { IContextOptions } from '../../../types';
import { IEventOptions } from '../dom-events/types';
import { IDOMRecordPluginOptions } from '../dom/types';
export interface IShadowDomOptions extends Omit<IEventOptions, 'hooks'> , IDOMRecordPluginOptions{
  doc: IContextOptions['doc'];
}
