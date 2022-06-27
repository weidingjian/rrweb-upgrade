
import { ReplayerEvents, TEventWithTime, TMousemoveData } from '../../../types';
import MouseBaseReplayPlugin from './mouse-base';

class MouseMoveReplayPlugin extends MouseBaseReplayPlugin {

  protected init(): void {
    this.listen(ReplayerEvents.Flush, () => {
      if (this.mousePos) {
        this.moveAndHover(
          this.mousePos.x,
          this.mousePos.y,
          this.mousePos.id,
          true,
          this.mousePos.debugData as any,
        );
      }
      this.mousePos = null;
    });
  }
  public replay(event: TEventWithTime, isSync?: boolean): void {
      const {positions} = event.data as TMousemoveData;
      if(isSync) {
        const lastPosition = positions[positions.length - 1];
        this.mousePos = {
          x: lastPosition.x,
          y: lastPosition.y,
          id: lastPosition.id,
          debugData: event.data as TMousemoveData,
        };
        return;
      }
      positions.forEach((p) => {
        const action = {
          doAction: () => {
            this.moveAndHover(p.x, p.y, p.id, isSync!, event.data as TMousemoveData);
          },
          delay:
            p.timeOffset +
            event.timestamp -
            this.ctx.service.state.context.baselineTime,
        };
        this.ctx.timer.addAction(action);
      });
      // add a dummy action to keep timer alive
      this.ctx.timer.addAction({
        doAction() {},
        delay: event.delay! - positions[0]?.timeOffset,
      });
  }
}

export default MouseMoveReplayPlugin;
