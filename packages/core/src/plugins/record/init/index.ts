import { ERecordEvent, EventType, IncrementalSource, recordOptions } from '../../../types';
import { on } from '../../../utils';
import DOMRecordPlugin from '../dom';
import RecordPlugin from '../plugin';
import FullSnapshotRecordPlugin from '../full-snapshot';
import DomEventsRecordPlugin from '../dom-events';
import FontRecordPlugin from '../font';
import IframeRecordPlugin from '../iframe';
import CanvasRecordPlugin from '../canvas/index';
import MediaInteractionRecordPlugin from '../media-interaction';
import ShadowDomRecordPlugin from '../shadow-dom';
import CssRecordPlugin from '../css';
import { TEventWithTime } from './types';
import { handleRecordOptions } from './util';
import ConsoleRecordPlugins from '../console';

class InitRecordPlugin extends RecordPlugin {
  private allRecordPlugins: RecordPlugin[] = [];
  private isCheckout: boolean = false;
  private restoreMethodHandles: (() => void)[] = [];
  private mutation: DOMRecordPlugin | null = null;
  private lastFullSnapshotEvent: TEventWithTime | null = null;
  private incrementalSnapshotCount: number = 0;
  constructor(private options: recordOptions) {
    super();
    this.options = handleRecordOptions(options);
    this.listen(ERecordEvent.Recording, this.wrappedEmit);
    this.observer();
  }

  private startRecord() {
    this.mutation = new DOMRecordPlugin({
      ...this.options,
      doc: document,
      win: window,
    } as any);
    this.allRecordPlugins = [
      new IframeRecordPlugin(),
      new ShadowDomRecordPlugin({
        ...this.options,
        doc: document
      }),
      this.mutation,
      new FullSnapshotRecordPlugin(this.options),
      new DomEventsRecordPlugin(this.options),
      this.options.collectFonts ? new FontRecordPlugin({
        ...this.options,
        doc: document
      }) : null,
      new CanvasRecordPlugin({
        ...this.options,
        win: window
      }),
      new MediaInteractionRecordPlugin(this.options),
      new CssRecordPlugin({
        ...this.options,
        win: window
      }),
      new ConsoleRecordPlugins({
        ...this.options?.sampling?.log,
        win: window
      })
    ].filter(Boolean) as RecordPlugin[];
  }

  private wrappedEmit = (e: TEventWithTime) =>  {
    e.timestamp = Date.now();

    const { emit, checkoutEveryNth, checkoutEveryNms } = this.options;
    if(
      this.mutation?.isLock() &&
        e.type !== EventType.FullSnapshot &&
          !(
            e.type === EventType.IncrementalSnapshot &&
            e.data.source === IncrementalSource.Mutation
          )
    ) {
      this.emit(ERecordEvent.LockMutation);
    }
    // emit(eventProcessor(e), isCheckout);
    emit?.(e, this.isCheckout);

    if(this.isCheckout) {
      this.isCheckout = false;
    }

    if (e.type === EventType.FullSnapshot) {
      this.lastFullSnapshotEvent = e;
      this.incrementalSnapshotCount = 0;
      return;
    }

    if(e.type === EventType.IncrementalSnapshot) {
      // attach iframe should be considered as full snapshot
      if (
        e.data.source === IncrementalSource.Mutation &&
        e.data.isAttachIframe
      ) {
        return;
      }
    }
    this.incrementalSnapshotCount++;
    const exceedCount =
    checkoutEveryNth && this.incrementalSnapshotCount >= checkoutEveryNth;
    const exceedTime =
      checkoutEveryNms &&
      e.timestamp - (this.lastFullSnapshotEvent?.timestamp || 0) > checkoutEveryNms;
    if (exceedCount || exceedTime) {
      // takeFullSnapshot(true);
      this.isCheckout = true;
      this.taskFullSnapshot();
    }
  }

  private observer() {
    this.restoreMethodHandles.push(
      on('DOMContentLoaded', () => {
        this.recordData({
          type: EventType.DomContentLoaded,
          data: {},
        });
      })
    )
    if (
      document.readyState === 'interactive' ||
      document.readyState === 'complete'
    ) {
      this.startRecord();
      return;
    }

    this.restoreMethodHandles.push(
      on('load', () => {
        this.recordData({
          type: EventType.Load,
          data: {},
        });
        this.startRecord();
      },
        window,
      )
    )

  }
  public setIsCheckout(isCheckout: boolean = false) {
    this.isCheckout = isCheckout
  }
  public stopRecord(): void {
    this.allRecordPlugins.forEach(p => p.stopRecord());
    this.restoreMethodHandles.forEach(h => h());
  }
}

export default InitRecordPlugin;
