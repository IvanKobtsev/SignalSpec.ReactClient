import { create } from "zustand";
import * as SignalR from "@microsoft/signalr";

export interface SignalRConnectionData {
  connection: SignalR.HubConnection;
  componentsSubscribed: number;
}

export function isConnectionAlive(connectionState: SignalR.HubConnectionState | null | undefined) {
  return (
    connectionState &&
    connectionState !== SignalR.HubConnectionState.Disconnected &&
    connectionState !== SignalR.HubConnectionState.Disconnecting
  );
}

export interface SignalRConnections {
  createConnection: (hubName: string) => Promise<SignalRConnectionData>;
  setupEventHandlers: <T>(
    hubName: string,
    handlers: Partial<T>,
    onConnected?: (connection: SignalR.HubConnection) => void,
  ) => Promise<void>;
  deleteConnection: <T>(hubName: string, handlers: Partial<T>) => void;
}

interface SignalRConnectionsStore extends SignalRConnections {
  backendUri: string;
  EnableSignalRDebug: boolean;
  connectionsStore: Map<string, SignalRConnectionData>;
}

const useSignalRConnectionsStore = create<SignalRConnectionsStore>((set, get) => ({
  backendUri: "",
  EnableSignalRDebug: false,
  connectionsStore: new Map(),

  async createConnection(hubName) {
    let data = get().connectionsStore.get(hubName);
    if (!data) {
      const { backendUri, EnableSignalRDebug } = get();
      data = {
        connection: new SignalR.HubConnectionBuilder()
          .withUrl(backendUri + "/hubs/" + hubName, { withCredentials: true })
          .configureLogging(
            EnableSignalRDebug ? SignalR.LogLevel.Information : SignalR.LogLevel.None,
          )
          .withAutomaticReconnect()
          .build(),
        componentsSubscribed: 0,
      };
      const connectionsStore = new Map(get().connectionsStore);
      connectionsStore.set(hubName, data);
      set({ connectionsStore });
    }
    if (!isConnectionAlive(data.connection.state)) {
      await data.connection.start().catch((error: unknown) => {
        if (get().EnableSignalRDebug) console.error(error);
      });
    }
    return data;
  },

  async setupEventHandlers(hubName, handlers, onConnected) {
    let data = get().connectionsStore.get(hubName);
    if (!data) {
      data = await get().createConnection(hubName);
    }
    onConnected?.(data.connection);

    for (const key of Object.keys(handlers) as (keyof typeof handlers)[]) {
      const handler = handlers[key];
      if (handler !== undefined) {
        data.connection.on(key as string, handler as (...args: any[]) => any);
      }
    }
    data.componentsSubscribed++;
    set({ connectionsStore: new Map(get().connectionsStore) });
  },

  deleteConnection(hubName, handlers) {
    const data = get().connectionsStore.get(hubName);
    if (!data) return;
    for (const key of Object.keys(handlers) as (keyof typeof handlers)[]) {
      const handler = handlers[key];
      if (handler !== undefined) {
        data.connection.off(key as string, handler as (...args: any[]) => any);
      }
    }
    data.componentsSubscribed--;
    const connectionsStore = new Map(get().connectionsStore);
    if (data.componentsSubscribed === 0) {
      void data.connection.stop().catch((error: unknown) => {
        if (get().EnableSignalRDebug) console.error(error);
      });
      connectionsStore.delete(hubName);
    }
    set({ connectionsStore });
  },
}));

export interface SignalRConfiguration {
  backendUri: string;
  enableDebug?: boolean;
}

/** Configure SignalR before mounting consumers. Backend switching is not supported. */
export function configureSignalR({ backendUri, enableDebug = false }: SignalRConfiguration): void {
  useSignalRConnectionsStore.setState({ backendUri, EnableSignalRDebug: enableDebug });
}

export function useSignalRConnections(): SignalRConnections {
  const createConnection = useSignalRConnectionsStore((state) => state.createConnection);
  const setupEventHandlers = useSignalRConnectionsStore((state) => state.setupEventHandlers);
  const deleteConnection = useSignalRConnectionsStore((state) => state.deleteConnection);
  return { createConnection, setupEventHandlers, deleteConnection };
}
