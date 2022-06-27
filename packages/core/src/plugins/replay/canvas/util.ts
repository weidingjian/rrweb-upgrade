import { ECanvasContext } from "../../../types";
import { variableListFor } from "./deserialize-args";

export function getContext(
  target: HTMLCanvasElement,
  type: ECanvasContext,
): WebGLRenderingContext | WebGL2RenderingContext | null {
  // Note to whomever is going to implement support for `contextAttributes`:
  // if `preserveDrawingBuffer` is set to true,
  // you might have to do `ctx.flush()` before every webgl canvas event
  try {
    if (type === ECanvasContext.WebGL) {
      return (target.getContext('webgl')! ||
        target.getContext('experimental-webgl'));
    }
    return target.getContext('webgl2')!;
  } catch (e) {
    return null;
  }
}

const WebGLVariableConstructorsNames = [
  'WebGLActiveInfo',
  'WebGLBuffer',
  'WebGLFramebuffer',
  'WebGLProgram',
  'WebGLRenderbuffer',
  'WebGLShader',
  'WebGLShaderPrecisionFormat',
  'WebGLTexture',
  'WebGLUniformLocation',
  'WebGLVertexArrayObject',
];

export function saveToWebGLVarMap(
  ctx: WebGLRenderingContext | WebGL2RenderingContext,
  result: any,
) {
  if (!result?.constructor) return; // probably null or undefined

  const { name } = result.constructor;
  if (!WebGLVariableConstructorsNames.includes(name)) return; // not a WebGL variable

  const variables = variableListFor(ctx, name);
  if (!variables.includes(result)) variables.push(result);
}
