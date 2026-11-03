# SignalSpec React Client

Generate typed React hooks and DTOs from a SignalSpec JSON document:

```sh
signal-spec generate --input=./signal-spec.json --output=./src/generated --backend-uri=https://localhost:49363
```

During development, use `vp run generate` followed by the same flags.
`--input` accepts a local JSON file, a tsconfig path alias such as `@/spec.json`,
or an HTTP(S) URL. `--output` accepts a local folder or tsconfig alias.
Paths resolve from the current working directory. Quote paths containing spaces.
All three options are required; both `--flag=value` and `--flag value` work.

Generated hooks automatically import `config.ts`, which initializes the shared
Zustand connection store with the supplied backend URI. No provider is required.
After importing generated hooks, applications can override the default:

```ts
import { useSignalRConnectionsStore } from "@signal-spec/react-client";

useSignalRConnectionsStore.setState({ backendUri: "https://api.example.com" });
```

Overrides affect new connections. Existing connections keep their original URL.
The URI is shared across generated clients in the same application.
Generation overwrites matching files, retains stale files, and may leave partial
output if TypeSynth reports an error. Generation failures return a nonzero exit code.

Development: `vp install`, `vp check`, `vp test`, and `vp run build`.
