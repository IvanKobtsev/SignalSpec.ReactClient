import { HubConnectionState, type HubConnection } from "@microsoft/signalr";

type Warning = { warning: string };

/**
 * Safely invokes the SignalR hub method, i.e. it will only throw in case of an actual error,
 * and will return `Warning` object in case the connection hasn't yet been established or
 * has been already closed.
 */
export async function safeInvokeHubMethod(
  connection: HubConnection | null,
  methodName: string,
  ...args: any[]
): Promise<Warning | any> {
  if (connection?.state !== HubConnectionState.Connected) {
    return { warning: "Skipped invocation: not connected" };
  }

  try {
    return await connection.invoke(methodName, ...args);
  } catch (err) {
    if (err instanceof Error && err.message.includes("underlying connection being closed")) {
      return { warning: "Skipped invocation: connection is being closed" };
    }
    throw err;
  }
}
