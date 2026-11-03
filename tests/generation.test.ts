import { expect, test, vi } from "vite-plus/test";
import main from "../src/generation/main.ts";
import { dtoImports, validateSpec } from "../src/generation/spec.ts";
import { SignalRMethodType } from "../src/generation/hbs-helpers.ts";

const hub = {
  hubName: "ChangeTrackerHub",
  hubContract: {
    methods: [
      {
        name: "Changed",
        methodType: SignalRMethodType.Default,
        parameters: [{ name: "event", type: "ChangeEventDto[] | null" }],
        returns: "Promise<ChangeEventDto | ResponseDto>",
      },
    ],
  },
};
const spec = {
  hubs: { Tracker: hub },
  dtos: { ChangeEventDto: { properties: [] }, ResponseDto: { properties: [] } },
};

test("collects sorted unique DTOs from parameters and return expressions", () => {
  validateSpec(spec);
  expect(dtoImports(hub, spec.dtos)).toEqual(["ChangeEventDto", "ResponseDto"]);
  expect(dtoImports(hub, {})).toEqual([]);
});

test("passes imports to hook generation", async () => {
  const generate = vi.fn().mockResolvedValue(undefined);
  await main({ data: spec, generate } as unknown as Parameters<typeof main>[0]);
  expect(generate).toHaveBeenCalledWith(
    "hubClient",
    { ...hub, clientName: "Tracker", dtoImports: ["ChangeEventDto", "ResponseDto"] },
    "./hooks/useChangeTrackerHub.ts",
  );
});

test.each([
  null,
  {},
  { hubs: [], dtos: {} },
  { ...spec, dtos: { Broken: {} } },
  { ...spec, hubs: { Broken: { ...hub, hubContract: { methods: [{}] } } } },
])("rejects malformed specs before generating output", async (data) => {
  const generate = vi.fn();
  await expect(main({ data, generate } as unknown as Parameters<typeof main>[0])).rejects.toThrow(
    /Invalid SignalSpec at \$.*incompatible SignalSpec version/,
  );
  expect(generate).not.toHaveBeenCalled();
});
