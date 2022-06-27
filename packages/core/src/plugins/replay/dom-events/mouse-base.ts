
import { TMouseMovePos } from '../types';
import ReplayPlugin from '../plugin';
import { ReplayerEvents, TEventWithTime, TIncrementalData } from '../../../types';
import { defaultMouseTailConfig } from '../../../replay/replayer/util';
import { getBaseDimension } from '../util';
import { mirror } from '../../../utils/mirror';

class MouseBaseReplayPlugin extends ReplayPlugin {
  protected touchActive: boolean = false;
  protected tailPositions: Array<{ x: number; y: number }> = [];
  protected mousePos: TMouseMovePos | null = null;

  protected init(): void {
    this.listen(ReplayerEvents.ToggleTouchActive, this.toggleTouchActiveClassName);
  }
  private toggleTouchActiveClassName = () => {
    if (this.touchActive === true) {
      this.ctx.mouse!.classList.add('touch-active');
    } else if (this.touchActive === false) {
      this.ctx.mouse!.classList.remove('touch-active');
    }
    this.touchActive = false;
  }

  public replay(event: TEventWithTime, isSync?: boolean): void {

  }

  protected moveAndHover(
    x: number,
    y: number,
    id: number,
    isSync: boolean,
    debugData: TIncrementalData,
  ) {
    const target = mirror.getNode(id);
    if (!target) {
      return this.debugNodeNotFound(debugData, id);
    }

    const base = getBaseDimension(target, this.ctx.iframe);
    const _x = x * base.absoluteScale + base.x;
    const _y = y * base.absoluteScale + base.y;

    this.ctx.mouse!.style.left = `${_x}px`;
    this.ctx.mouse!.style.top = `${_y}px`;
    if (!isSync) {
      this.drawMouseTail({ x: _x, y: _y });
    }
    this.hoverElements(target as Element);
  }

  private drawMouseTail(position: { x: number; y: number }) {
    if (!this.ctx.mouseTail) {
      return;
    }

    const { lineCap, lineWidth, strokeStyle, duration } =
      this.config.mouseTail === true
        ? defaultMouseTailConfig
        : Object.assign({}, defaultMouseTailConfig, this.config.mouseTail);

    const draw = () => {
      if (!this.ctx.mouseTail) {
        return;
      }
      const ctx = this.ctx.mouseTail.getContext('2d');
      if (!ctx || !this.tailPositions.length) {
        return;
      }
      ctx.clearRect(0, 0, this.ctx.mouseTail.width, this.ctx.mouseTail.height);
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.lineCap = lineCap;
      ctx.strokeStyle = strokeStyle;
      ctx.moveTo(this.tailPositions[0].x, this.tailPositions[0].y);
      this.tailPositions.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    };

    this.tailPositions.push(position);
    draw();
    setTimeout(() => {
      this.tailPositions = this.tailPositions.filter((p) => p !== position);
      draw();
    }, duration / this.ctx.speedService.state.context.timer.speed);
  }

  private hoverElements(el: Element) {
    this.ctx.iframe.contentDocument
      ?.querySelectorAll('.\\:hover')
      .forEach((hoveredEl) => {
        hoveredEl.classList.remove(':hover');
      });
    let currentEl: Element | null = el;
    while (currentEl) {
      if (currentEl.classList) {
        currentEl.classList.add(':hover');
      }
      currentEl = currentEl.parentElement;
    }
  }
}

export default MouseBaseReplayPlugin;
