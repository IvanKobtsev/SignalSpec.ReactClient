export enum SignalRMethodType {
  Default = "default",
  FrontendMethod = "frontendMethod",
  BackendMethod = "backendMethod",
}

export type MethodParameter = {
  name: string;
  type: string;
};

export type SignalRClientMethod = {
  name: string;
  methodType: SignalRMethodType;
  parameters: MethodParameter[];
  returns: string;
};

/*
 * Converts unknown types into records or void's
 */
function safeType(p: { type: string } | string | undefined) {
  if (!p) return "void";
  if (typeof p === "string") return p;
  if (p.type === "object") return "Record<string, unknown>";
  else return p.type;
}

/*
 * For differentiating between interfaces and types
 */
function isInterface(name: unknown) {
  return typeof name === "string" && name.startsWith("I");
}

/*
 * For skipping frontend methods when generating invoker
 */
function isBackendMethod(method?: SignalRClientMethod) {
  return (
    method?.methodType === SignalRMethodType.BackendMethod ||
    method?.methodType === SignalRMethodType.Default
  );
}

/*
 * For skipping backend when generating handling interface
 */

function isFrontendMethod(method?: SignalRClientMethod) {
  return (
    method?.methodType === SignalRMethodType.FrontendMethod ||
    method?.methodType === SignalRMethodType.Default
  );
}

/*
 * For skipping entire event block if there's no frontend methods at all
 */
function hasAnyFrontendMethods(methods?: SignalRClientMethod[]) {
  return (
    methods &&
    methods.some(
      (method) =>
        method.methodType === SignalRMethodType.FrontendMethod ||
        method.methodType === SignalRMethodType.Default,
    )
  );
}

/*
 * For skipping entire invoker block if there's no backend methods at all
 */
function hasAnyBackendMethods(methods?: SignalRClientMethod[]) {
  return (
    methods &&
    methods.some(
      (method) =>
        method.methodType === SignalRMethodType.BackendMethod ||
        method.methodType === SignalRMethodType.Default,
    )
  );
}

/*
 * For comparing values in templates, e.g. for checking if return type is void or not
 */
function eq(a: unknown, b: unknown) {
  return a === b;
}

/*
 * Concatenates two strings
 */
function concat(a?: string, b?: string) {
  return (a ?? "") + (b ?? "");
}

export default {
  eq,
  concat,
  safeType,
  isInterface,
  isBackendMethod,
  isFrontendMethod,
  hasAnyFrontendMethods,
  hasAnyBackendMethods,
};
