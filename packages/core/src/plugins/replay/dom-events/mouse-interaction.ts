
import { TEventWithTime, TMouseInteractionData, MouseInteractions, ReplayerEvents, } from '../../../types';
import { mirror } from '../../../utils/mirror';
import MouseBaseReplayPlugin from './mouse-base';

class MouseInteractionReplayPlugin extends MouseBaseReplayPlugin {
  public replay(event: TEventWithTime, isSync?: boolean): void {
      const data = event.data as TMouseInteractionData;
      const {id, type} = data;
      /**
         * Same as the situation of missing input target.
         */
       if (id === -1 || isSync) {
        return;
      }

      const _event = new Event(MouseInteractions[type].toLowerCase());
      const target = mirror.getNode(id);
      if (!target) {
        return this.debugNodeNotFound(data, id);
      }
      this.emit(ReplayerEvents.MouseInteraction, {
        type,
        target,
      });
      const { triggerFocus } = this.config;
      switch (type) {
        case MouseInteractions.Blur:
          if ('blur' in (target as HTMLElement)) {
            (target as HTMLElement).blur();
          }
          break;
        case MouseInteractions.Focus:
          if (triggerFocus && (target as HTMLElement).focus) {
            (target as HTMLElement).focus({
              preventScroll: true,
            });
          }
          break;
        case MouseInteractions.Click:
        case MouseInteractions.TouchStart:
        case MouseInteractions.TouchEnd:
          if (isSync) {
            if (type === MouseInteractions.TouchStart) {
              this.touchActive = true;
            } else if (type === MouseInteractions.TouchEnd) {
              this.touchActive = false;
            }
            this.mousePos = {
              x: data.x,
              y: data.y,
              id: data.id,
              debugData: data,
            };
          } else {
            if (data.type === MouseInteractions.TouchStart) {
              // don't draw a trail as user has lifted finger and is placing at a new point
              this.tailPositions.length = 0;
            }
            this.moveAndHover(data.x, data.y, data.id, isSync!, data);
            if (data.type === MouseInteractions.Click) {
              /*
               * don't want target.click() here as could trigger an iframe navigation
               * instead any effects of the click should already be covered by mutations
               */
              /*
               * removal and addition of .active class (along with void line to trigger repaint)
               * triggers the 'click' css animation in styles/style.css
               */
              this.ctx.mouse.classList.remove('active');
              // tslint:disable-next-line
              void this.ctx.mouse.offsetWidth;
              this.ctx.mouse.classList.add('active');
            } else if (type === MouseInteractions.TouchStart) {
              void this.ctx.mouse.offsetWidth; // needed for the position update of moveAndHover to apply without the .touch-active transition
              this.ctx.mouse.classList.add('touch-active');
            } else if (type === MouseInteractions.TouchEnd) {
              this.ctx.mouse.classList.remove('touch-active');
            }
          }
          break;
        case MouseInteractions.TouchCancel:
          if (isSync) {
            this.touchActive = false;
          } else {
            this.ctx.mouse.classList.remove('touch-active');
          }
          break;
        default:
          target.dispatchEvent(_event);
      }
  }
}

export default MouseInteractionReplayPlugin;
