import { ERecordEvent, EventType, recordOptions } from "../types";
// import InitRecordPlugin from './init';
import { mirror } from '../utils/mirror';
import InitRecordPlugin from "../plugins/record/init";

class Record {
  private init: InitRecordPlugin | null = null;
  constructor(options: recordOptions){
    this.init = new InitRecordPlugin(options);
  }
  public addCustomEvent<T>(tag: string, payload: T) {
    this.init?.recordData({
      type: EventType.Custom,
      data: {
        tag,
        payload,
      },
    })
  }
  public freezePage() {
    this.init?.emit(ERecordEvent.LockMutation);
  }
  public takeFullSnapshot(isCheckout?: boolean) {
    this.init?.setIsCheckout(isCheckout);
    this.init?.emit(ERecordEvent.TaskFullSnapshot);
  }
  public stopRecord(){
    this.init?.stopRecord();
  }
}

let init: Record | null = null;

function record(options: recordOptions,) {
    init = new Record(options);
  return () => {
    init?.stopRecord();
    init = null;
  }
}

record.addCustomEvent = <T>(tag: string, payload: T) => {
  init?.addCustomEvent(tag, payload);
}

record.freezePage = () => {
  init?.freezePage();
}

record.takeFullSnapshot = (isCheckout?: boolean) => {
  init?.takeFullSnapshot(isCheckout);
}

record.mirror = mirror;

export default record;
