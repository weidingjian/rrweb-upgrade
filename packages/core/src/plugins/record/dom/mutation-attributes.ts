// import { IMutationOptions, TAttributeCursor } from "../../../types";
import {
  maskInputValue,
  transformAttribute
} from "../../../snapshot";
import { mirror } from "../../../utils/mirror";
import { IDOMRecordPluginOptions, TAttributeCursor } from "./types";

class MutationAttributes {
  private attributes: Map<Node, TAttributeCursor['attributes']> = new Map();
  constructor(private options: IDOMRecordPluginOptions){}
  public getRecordData = () => {
    const attributes = Array.from(this.attributes)
    .map(([node, attributes]) => ({
      id: mirror.getId(node),
      attributes: attributes,
    }))
    // attribute mutation's id was not in the mirror map means the target node has been removed
    .filter((attribute) => mirror.has(attribute.id));

    if(!attributes.length) {
      return;
    }

    this.attributes = new Map();
    return {
      attributes,
    }
  }
  public mutation = (mutation: MutationRecord) => {
    const {oldValue, attributeName} = mutation;
    const { maskInputOptions, maskInputFn, doc} = this.options;
    const target = mutation.target as HTMLElement;
    let value = target.getAttribute(attributeName!);
    if(value === oldValue) {
      return;
    }
    if(attributeName === 'value') {
      value = maskInputValue({
        maskInputOptions: maskInputOptions!,
        tagName: target.tagName,
        type: target.getAttribute('type'),
        value,
        maskInputFn,
      });
    }
    if(!this.attributes.get(target)) {
      this.attributes.set(target, {});
    }
    const attributeValue = this.attributes.get(target)!;
    if(attributeName === 'style') {
      const old = doc.createElement('span');
      if(oldValue) {
        old.setAttribute('style', oldValue);
      }
      if(attributeValue.style === undefined || attributeValue.style === null) {
        attributeValue.style = {};
      }
      const targetStyle = target.style;
      for(const styleName of Array.from(targetStyle)) {
        const newValue = targetStyle.getPropertyValue(styleName);
        const oldValue = old.style.getPropertyValue(styleName);
        const newPriority = targetStyle.getPropertyPriority(styleName);
        const oldPriority = old.style.getPropertyPriority(styleName);
        if(newValue !== oldValue || newPriority !== oldPriority) {
          attributeValue.style[styleName] = newPriority === '' ? newValue :  [newValue, newPriority]
        }
      }

      for (const styleName of Array.from(old.style)) {
        if (targetStyle.getPropertyValue(styleName) === '') {
          // "if not set, returns the empty string"
          attributeValue.style[styleName] = false; // delete
        }
      }
    } else {
      attributeValue[attributeName!] = transformAttribute(doc, target.tagName, attributeName!, value!);
    }
    this.attributes.set(target, attributeValue);
  }
}

export default MutationAttributes;
