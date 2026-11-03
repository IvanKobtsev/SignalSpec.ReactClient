import { type GeneratorScriptProps } from "typesynth";
import { dtoImports, validateSpec } from "./spec.ts";

export default async function main({ data, generate }: GeneratorScriptProps) {
  validateSpec(data);
  await generate(
    "config",
    { backendUriLiteral: JSON.stringify(process.env.SIGNAL_SPEC_BACKEND_URI ?? "") },
    "./config.ts",
  );
  await generate("dtos", data, "./DTOs.ts");

  for (const [name, hubData] of Object.entries(data["hubs"])) {
    await generate(
      "hubClient",
      { ...hubData, clientName: name, dtoImports: dtoImports(hubData, data.dtos) },
      `./hooks/use${hubData.hubName}.ts`,
    );
  }
}
