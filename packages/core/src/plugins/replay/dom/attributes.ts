
import { TEventWithTime, TMutationData } from '../../../types';
import { mirror } from '../../../utils/mirror';
import ReplayPlugin from '../plugin';
import { styleValueWithPriority } from '../types';

class DOMAttributesReplayPlugin extends ReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
    const { attributes, } = event.data as TMutationData;
    if(attributes?.length) {
      this.modifyAttributes(event.data as TMutationData);
    }
  }
  private modifyAttributes(data: TMutationData) {
    const {attributes} = data;
    attributes.forEach((mutation) => {
      const target = mirror.getNode(mutation.id);
      if (!target) {
        if (data.removes?.find((r) => r.id === mutation.id)) {
          // no need to warn, element was already removed
          return;
        }
        return this.warnNodeNotFound(data, mutation.id);
      }
      for (const attributeName in mutation.attributes) {
        if (typeof attributeName === 'string') {
          const value = mutation.attributes[attributeName];
          if (value === null) {
            (target as Element).removeAttribute(attributeName);
          } else if (typeof value === 'string') {
            try {
              (target as Element).setAttribute(
                attributeName,
                value,
              );
            } catch (error) {
              if (this.config.showWarning) {
                console.warn(
                  'An error occurred may due to the checkout feature.',
                  error,
                );
              }
            }
          } else if (attributeName === 'style') {
            const styleValues = value;
            const targetEl = target as HTMLElement;
            for (const s in styleValues) {
              if (styleValues[s] === false) {
                targetEl.style.removeProperty(s);
              } else if (styleValues[s] instanceof Array) {
                const svp = styleValues[s] as styleValueWithPriority;
                targetEl.style.setProperty(s, svp[0], svp[1]);
              } else {
                const svs = styleValues[s] as string;
                targetEl.style.setProperty(s, svs);
              }
            }
          }
        }
      }
    });
  }
}

export default DOMAttributesReplayPlugin;

