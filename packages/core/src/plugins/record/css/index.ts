import RecordPlugin from '../plugin';
import StyleDeclarationRecordPlugin from './style';
import StyleSheetRecordPlugin from './stylesheet';
import { ICssRecordPluginOptions } from './types';

class CssRecordPlugin extends RecordPlugin {
  private styleDeclaration: StyleDeclarationRecordPlugin | null = null;
  private styleSheet: StyleSheetRecordPlugin | null = null;
  constructor(options: ICssRecordPluginOptions){
    super();
    this.styleDeclaration = new StyleDeclarationRecordPlugin(options);
    this.styleSheet = new StyleSheetRecordPlugin(options);
  }
  public stopRecord(): void {
    this.styleDeclaration?.stopRecord();
    this.styleSheet?.stopRecord();
  }
}

export default CssRecordPlugin;
