
import { ERecordEvent } from '../../types';
import eventCenter from '../../utils/event-center';
import { TEvent } from './init/types';

abstract class RecordPlugin {
  protected taskFullSnapshot() {
    eventCenter.emit(ERecordEvent.TaskFullSnapshot);
  }
  protected listen(eventName: string, handler: (...args: any[]) => void) {
    eventCenter.on(eventName, handler);
  }
  public recordData(data: TEvent) {
    eventCenter.emit(ERecordEvent.Recording, data);
  }
  public emit(eventName: string, ...args: any[]) {
    eventCenter.emit(eventName, ...args);
  }
  public abstract stopRecord(): void;
}

export default RecordPlugin;
