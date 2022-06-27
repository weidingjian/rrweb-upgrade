import {
  EventType,
  IncrementalSource
} from "../../../types";
import { isBlocked, isIgnored } from "../../../utils/is";
import RecordPlugin from "../plugin";
import MutationAttributes from "./mutation-attributes";
import MutationCharacterData from "./mutation-characterData";
import MutationChildList from "./mutation-childList";
import { IDOMRecordPluginOptions, TMutationCallbackParam } from "./types";

class Mutation {
  private locked: boolean = false;
  private readonly mutationCharacterData: MutationCharacterData;
  private readonly mutationAttributes: MutationAttributes;
  private readonly mutationChildList: MutationChildList;

  constructor(
    private options: IDOMRecordPluginOptions,
    private recordData: RecordPlugin['recordData'],
    emitEvents: (eventName: string, ...args: any[]) => void,
    ) {
    this.mutationCharacterData = new MutationCharacterData(options);
    this.mutationAttributes = new MutationAttributes(options);
    this.mutationChildList = new MutationChildList(options, emitEvents);
  }

  private processMutation = (mutation: MutationRecord) => {
    const {target, type} = mutation;
    const {blockClass} = this.options;
    if (isIgnored(target) || isBlocked(target, blockClass, false)) {
      return;
    }

    if(type === 'characterData') {
      this.mutationCharacterData.mutaition(mutation);
      return;
    }

    if(type === 'attributes') {
      this.mutationAttributes.mutation(mutation);
      return;
    }

    if(type === 'childList') {
      this.mutationChildList.mutation(mutation);
    }
  }
  public processMutations = (mutations: MutationRecord[]) => {
    if(this.locked) {
      return;
    }
    mutations.forEach(this.processMutation);
    const payload = this.getRecordData();
    if(payload) {
      this.record(payload as TMutationCallbackParam);
    }
  }
  public isLock = () => {
    return this.locked;
  }
  public lock = () => {
    this.locked = true;
  }
  public unlock = () => {
    this.locked = false;
  }

  private record(payload: TMutationCallbackParam) {
    this.recordData({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Mutation,
        ...payload,
      },
    });
    this.options.hooks?.mutation?.(payload);
  }

  private getRecordData = () => {
    const textPayload = this.mutationCharacterData.getRecordData();
    const attrPayload = this.mutationAttributes.getRecordData();
    const childListPayload = this.mutationChildList.getRecordData();
    if(!textPayload && !attrPayload && !childListPayload) {
      return;
    }
    return {
      texts: textPayload?.texts,
      attributes: attrPayload?.attributes,
      adds: childListPayload?.adds,
      removes: childListPayload?.removes,
    }
  }
}


export default Mutation;
