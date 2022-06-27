import { IActionWithDelay } from "./types";

class Timer {
  private raf: number | null = null;
  private liveMode: boolean = false;
  public timeOffset = 0;

  constructor(private actions: IActionWithDelay[] = [], public speed: number) {}

  private findActionIndex(action: IActionWithDelay): number {
    let start = 0;
    let end = this.actions.length - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (this.actions[mid].delay < action.delay) {
        start = mid + 1;
      } else if (this.actions[mid].delay > action.delay) {
        end = mid - 1;
      } else {
        // already an action with same delay (timestamp)
        // the plus one will splice the new one after the existing one
        return mid + 1;
      }
    }
    return start;
  }

  public addAction(action: IActionWithDelay) {
    const index = this.findActionIndex(action);
    this.actions.splice(index, 0, action);
  }

  public addActions(actions: IActionWithDelay[]) {
    this.actions = this.actions.concat(actions);
  }

  public start() {
    this.timeOffset = 0;
    let lastTimestamp = performance.now();
    const { actions } = this;
    const self = this;
    function check() {
      const time = performance.now();
      self.timeOffset += (time - lastTimestamp) * self.speed;
      lastTimestamp = time;
      while (actions.length) {
        const action = actions[0];

        if (self.timeOffset >= action.delay) {
          actions.shift();
          action.doAction();
        } else {
          break;
        }
      }

      if (actions.length > 0 || self.liveMode) {
        self.raf = requestAnimationFrame(check);
      }
    }
    this.raf = requestAnimationFrame(check);
  }

  public clear() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.actions.length = 0;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public toggleLiveMode(mode: boolean) {
    this.liveMode = mode;
  }

  public isActive() {
    return this.raf !== null;
  }
}

export default Timer;
