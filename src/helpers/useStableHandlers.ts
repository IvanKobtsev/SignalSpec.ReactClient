import { useLayoutEffect, useMemo, useRef } from "react";

/**
 * This is basically MUI's {@link useEventCallback} hook, but designed for objects
 * containing handlers instead of a singular handler.
 * @param handlers
 */
export function useStableHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T | undefined,
): T {
  const ref = useRef(handlers);

  useLayoutEffect(() => {
    ref.current = handlers;
  });

  return useMemo(() => {
    const result: any = {};

    if (!handlers) {
      return result;
    }

    for (const key of Object.keys(handlers)) {
      result[key] = (...args: any[]) => {
        return ref.current![key](...args);
      };
    }

    return result as T;
  }, []);
}
