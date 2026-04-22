# Inspired-by scenarios

These tests adapt common rule-engine use cases to this package, proving the
engine is expressive enough for real-world workloads. They are **inspired by**
public examples (notably `json-rules-engine`'s `examples/` directory) but
rewritten to our API — they are probes, not a compatibility contract.

Scenarios:

- `basketball-foul-out.spec.ts` — priority + nested `all` from the
  json-rules-engine README quickstart.
- `microservice-orchestration.spec.ts` — asynchronous fact chains with
  cross-fact dependencies.
- `feature-flag-rollout.spec.ts` — nested `all`/`any`/`not` with mixed
  operators, fact references, and path resolution.
