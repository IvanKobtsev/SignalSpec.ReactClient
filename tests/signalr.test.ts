import { expect, test, vi } from "vite-plus/test";
import * as api from "../src/index.ts";

vi.mock("zustand", async () => {
  const { createStore } = await import("zustand/vanilla");
  return {
    create: (initializer: Parameters<typeof createStore>[0]) => {
      const store = createStore(initializer);
      return Object.assign(
        (selector: (state: unknown) => unknown) => selector(store.getState()),
        store,
      );
    },
  };
});
const mocks = vi.hoisted(() => ({
  url: vi.fn(),
  logging: vi.fn(),
  connection: {
    state: "Disconnected",
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock("@microsoft/signalr", () => ({
  HubConnectionState: { Disconnected: "Disconnected", Disconnecting: "Disconnecting" },
  LogLevel: { Information: 2, None: 6 },
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) {
      mocks.url(...args);
      return this;
    }
    configureLogging(level: number) {
      mocks.logging(level);
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    build() {
      return mocks.connection;
    }
  },
}));

test("public API hides Zustand and shares connections across subscribers", async () => {
  expect(api).not.toHaveProperty("useSignalRConnectionsStore");
  api.configureSignalR({ backendUri: "https://example.com", enableDebug: true });
  const actions = api.useSignalRConnections();
  expect(Object.keys(actions).sort()).toEqual([
    "createConnection",
    "deleteConnection",
    "setupEventHandlers",
  ]);
  const first = { Changed: vi.fn() };
  const second = { Changed: vi.fn() };
  const connected = vi.fn();
  await actions.setupEventHandlers("Test", first, connected);
  await actions.setupEventHandlers("Test", second, connected);
  expect(mocks.url).toHaveBeenCalledExactlyOnceWith("https://example.com/hubs/Test", {
    withCredentials: true,
  });
  expect(mocks.logging).toHaveBeenCalledWith(2);
  expect(connected.mock.calls).toEqual([[mocks.connection], [mocks.connection]]);
  expect(mocks.connection.on).toHaveBeenCalledWith("Changed", first.Changed);
  expect(mocks.connection.on).toHaveBeenCalledWith("Changed", second.Changed);
  actions.deleteConnection("Test", first);
  expect(mocks.connection.stop).not.toHaveBeenCalled();
  actions.deleteConnection("Test", second);
  expect(mocks.connection.off).toHaveBeenCalledWith("Changed", first.Changed);
  expect(mocks.connection.off).toHaveBeenCalledWith("Changed", second.Changed);
  expect(mocks.connection.stop).toHaveBeenCalledTimes(1);
  api.configureSignalR({ backendUri: "https://other.example.com" });
  await actions.createConnection("Test");
  expect(mocks.url).toHaveBeenLastCalledWith("https://other.example.com/hubs/Test", {
    withCredentials: true,
  });
  expect(mocks.logging).toHaveBeenLastCalledWith(6);
});
