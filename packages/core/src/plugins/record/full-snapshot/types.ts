export interface IFullSnapshotOptions {
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  // hooks?: ICommonOptions['hooks'];
  // packFn?: PackFn;
  // plugins?: RecordPlugin[];
  // departed, please use sampling options
  mousemoveWait?: number;
  keepIframeSrcFn?: (src: string) => boolean;
}
