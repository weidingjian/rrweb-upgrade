
import { MaskInputOptions, maskInputValue } from '../../../snapshot';
import { EventType, IncrementalSource } from '../../../types';
// import { EventType, IEventOptions, IncrementalSource, inputValue, MouseInteractions } from '../../../types';
import { on, throttle } from '../../../utils';
import { isBlocked, isTouchEvent } from '../../../utils/is';
import { mirror } from '../../../utils/mirror';
import { rewirtMethodByDefineProperty } from '../../util/rewrite-method';
import RecordPlugin from '../plugin';
import { IEventOptions, TInputValue } from './types';
import { getEventTarget, getWindowHeight, getWindowWidth, wrapEventWithUserTriggeredFlag } from './util';

export const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

class InputResizeRecordPlugin extends RecordPlugin {
  private lastInputValueMap: WeakMap<EventTarget, TInputValue> = new WeakMap();
  private removeListeners: (() => void)[] = []
  constructor(private options: IEventOptions) {
      super();
      this.listenDomEvent();
  }
  private record(target: EventTarget, v: TInputValue) {
    const lastInputValue = this.lastInputValueMap.get(target);
    if (
      !lastInputValue ||
      lastInputValue.text !== v.text ||
      lastInputValue.isChecked !== v.isChecked
    ) {
      this.lastInputValueMap.set(target, v);
      const id = mirror.getId(target as Node);
      const payload = {
        ...v,
        id
      }
      this.recordData({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Input,
          ...payload,
        },
      });
      this.options.hooks?.input?.(payload);
    }
  }
  private inputListenHandler = (event: Event) => {
    const {
      ignoreClass,
      blockClass,
      userTriggeredOnInput = false,
      maskInputOptions,
      maskInputFn,
    } = this.options;
    let target = getEventTarget(event);
    const userTriggered = event.isTrusted;
      /**
     * If a site changes the value 'selected' of an option element, the value of its parent element, usually a select element, will be changed as well.
     * We can treat this change as a value change of the select element the current target belongs to.
     */
    if (target && (target as Element).tagName === 'OPTION') {
      target = (target as Element).parentElement;
    }
    if (
      !target ||
      !(target as Element).tagName ||
      INPUT_TAGS.indexOf((target as Element).tagName) < 0 ||
      isBlocked(target as Node, blockClass, true)
    ) {
      return;
    }

    if (ignoreClass && (target as HTMLElement).classList.contains(ignoreClass)) {
      return;
    }

    const type: string | undefined = (target as HTMLInputElement).type;
    let text = (target as HTMLInputElement).value;
    let isChecked = false;
    if (type === 'radio' || type === 'checkbox') {
      isChecked = (target as HTMLInputElement).checked;
    } else if (
      maskInputOptions![
        (target as Element).tagName.toLowerCase() as keyof MaskInputOptions
      ] ||
      maskInputOptions![type as keyof MaskInputOptions]
    ) {
      text = maskInputValue({
        maskInputOptions: maskInputOptions!,
        tagName: (target as HTMLElement).tagName,
        type,
        value: text,
        maskInputFn,
      });
    }

    this.record(
      target,
      wrapEventWithUserTriggeredFlag(
        { text, isChecked, userTriggered },
        userTriggeredOnInput,
      ),
    );
    const name: string | undefined = (target as HTMLInputElement).name;
    if (type === 'radio' && name && isChecked) {
      this.handleCheckedRadioTarget(target);
    }
  }
  private handleCheckedRadioTarget = (target: EventTarget) => {
    const {doc, userTriggeredOnInput = false} = this.options;
    doc
    .querySelectorAll(`input[type="radio"][name="${name}"]`)
    .forEach((el) => {
      if (el !== target) {
        this.record(
          el,
          wrapEventWithUserTriggeredFlag(
            {
              text: (el as HTMLInputElement).value,
              isChecked: !(target as HTMLInputElement).checked,
              userTriggered: false,
            },
            userTriggeredOnInput,
          ),
        );
      }
    });
  }
  private listenDomEvent() {
    const {
      sampling = {},
      doc,
    } = this.options;
    const {input} = sampling;

    const events = input === 'last' ? ['change'] : ['input', 'change'];
    this.removeListeners = events.map((eventName) => on(eventName, this.inputListenHandler, doc));
    const self = this;
    const propertyDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    const hookProperties: Array<[HTMLElement, string]> = [
      [HTMLInputElement.prototype, 'value'],
      [HTMLInputElement.prototype, 'checked'],
      [HTMLSelectElement.prototype, 'value'],
      [HTMLTextAreaElement.prototype, 'value'],
      // Some UI library use selectedIndex to set select value
      [HTMLSelectElement.prototype, 'selectedIndex'],
      [HTMLOptionElement.prototype, 'selected'],
    ];
    if (propertyDescriptor && propertyDescriptor.set) {
      this.removeListeners.push(
        ...hookProperties.map((p) =>
          rewirtMethodByDefineProperty<HTMLElement>(p[0], p[1] as keyof HTMLElement, {
            set() {
              // mock to a normal event
              self.inputListenHandler({ target: this } as Event);
            },
          }),
        ),
      );
    }
  }
  public stopRecord(): void {
    this.removeListeners.forEach(h => h());
  }
}

export default InputResizeRecordPlugin;
