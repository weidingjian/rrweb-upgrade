import { deserializeArg } from "./deserialize-args";
import { TCanvasMutationFn } from "./types";
import { getContext, saveToWebGLVarMap } from "./util";

export const canvasWebGLMutaiton: TCanvasMutationFn = async (params) => {
  const {target, mutation, imageMap, errorHandler, type } = params
  try {
    const ctx = getContext(target, type!);
    if (!ctx) return;

    // NOTE: if `preserveDrawingBuffer` is set to true,
    // we must flush the buffers on every new canvas event
    // if (mutation.newFrame) ctx.flush();

    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    const args = await Promise.all(
      mutation.args.map(deserializeArg(imageMap, ctx)),
    );
    const result = original.apply(ctx, args);
    saveToWebGLVarMap(ctx, result);

    // Slows down replay considerably, only use for debugging
    const debugMode = false;
    if (debugMode) {
      if (mutation.property === 'compileShader') {
        if (!ctx.getShaderParameter(args[0], ctx.COMPILE_STATUS))
          console.warn(
            'something went wrong in replay',
            ctx.getShaderInfoLog(args[0]),
          );
      } else if (mutation.property === 'linkProgram') {
        ctx.validateProgram(args[0]);
        if (!ctx.getProgramParameter(args[0], ctx.LINK_STATUS))
          console.warn(
            'something went wrong in replay',
            ctx.getProgramInfoLog(args[0]),
          );
      }
      const webglError = ctx.getError();
      if (webglError !== ctx.NO_ERROR) {
        console.warn(
          'WEBGL ERROR',
          webglError,
          'on command:',
          mutation.property,
          ...args,
        );
      }
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
