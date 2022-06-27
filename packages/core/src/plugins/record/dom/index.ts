import { ERecordEvent } from "../../../types";
import RecordPlugin from "../plugin";
import Mutation from "./mutition";
import { IDOMRecordPluginOptions } from "./types";
import { mutationObserverCtor } from "./util";

class DOMRecordPlugin extends RecordPlugin {
  private observer: MutationObserver | null = null;
  private mutation: Mutation | null = null;
  constructor(options: IDOMRecordPluginOptions, rootEl: Document = options.doc) {
    super();
    this.mutation = new Mutation(options, this.recordData, this.emit);
    this.listen(ERecordEvent.LockMutation, this.mutation.lock);
    this.listen(ERecordEvent.UnlokcMutation, this.mutation.unlock);

    this.observer = mutationObserverCtor(
      this.mutation.processMutations.bind(this.mutation),
      rootEl
    );
  }
  public isLock() {
    return this.mutation?.isLock() || false
  }
  public stopRecord(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
export default DOMRecordPlugin;
