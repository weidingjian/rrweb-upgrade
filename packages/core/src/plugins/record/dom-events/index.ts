import InputResizeRecordPlugin from './input';
import MouseInteractionRecordPlugin from './mouse-interaction';
import MouseMoveRecordPlugin from './mouse-move';
import ScrollRecordPlugin from './scroll';
import ViewportResizeRecordPlugin from './viewport-resize';
import RecordPlugin from '../plugin';
import { recordOptions } from '../../../types';

class DomEventsRecordPlugin extends RecordPlugin {
  private plugins: RecordPlugin[] = [];
  constructor(options: any) {
    super();
    this.plugins = [
      new InputResizeRecordPlugin(options),
      new MouseInteractionRecordPlugin(options),
      new MouseMoveRecordPlugin(options),
      new ScrollRecordPlugin(options),
      new ViewportResizeRecordPlugin(options),
    ]
  }
  public stopRecord(): void {
    this.plugins.forEach(p => p.stopRecord());
  }
}

export default DomEventsRecordPlugin;
