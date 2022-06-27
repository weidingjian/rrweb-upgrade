import { needMaskingText } from "../../../snapshot";
// import { IMutationOptions, TTextCursor } from "../../../types";
import { mirror } from "../../../utils/mirror";
import { IDOMRecordPluginOptions, TTextCursor } from "./types";

class MutationCharacterData {
  private texts: TTextCursor[] = [];
  public getRecordData = () => {
    const texts =  this.texts
    .map((text) => ({
      id: mirror.getId(text.node),
      value: text.value,
    }))
    // text mutation's id was not in the mirror map means the target node has been removed
    .filter((text) => mirror.has(text.id));
    if(!texts.length) {
      return;
    }
    this.texts = [];
    return {
      texts
    }
  }
  public mutaition = (mutation: MutationRecord) => {
    const {target,oldValue} = mutation;
    const { maskTextClass, maskTextSelector, maskTextFn} = this.options;
    let value = target.textContent;
    if(value === oldValue) {
      return;
    }
    if(needMaskingText(target, maskTextClass, maskTextSelector) && value) {
      value = maskTextFn?.(value) || value.replace(/[\S]/g, '*');
    }
    this.texts.push({
      value,
      node: target
    });
  }
  constructor(private options: IDOMRecordPluginOptions) {}
}

export default MutationCharacterData;
