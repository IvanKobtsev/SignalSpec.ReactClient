import { HubConnectionState, type HubConnection } from "@microsoft/signalr";

/**
 * Safely invokes the SignalR hub method, i.e. it will only throw in case of an actual error,
 * and will return `Warning` object in case the connection hasn't yet been established or
 * has been already closed.
 */
export async function safeInvokeHubMethod(
  connection: HubConnection | null,
  methodName: string,
  ...args: any[]
): Promise<any> {
  if (connection?.state !== HubConnectionState.Connected) {
    console.warn("[SignalSpec] Skipped invocation: not connected");
    return;
  }

  try {
    return await connection.invoke(methodName, ...args);
  } catch (err) {
    if (err instanceof Error && err.message.includes("underlying connection being closed")) {
      console.warn("[SignalSpec] Skipped invocation: connection is being closed");
      return;
    }
    throw err;
  }
}
