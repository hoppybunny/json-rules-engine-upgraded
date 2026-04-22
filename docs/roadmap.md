# Roadmap

v1 is a complete, shippable release. These are the features we will layer on afterward:

## Operator packs (sibling packages)

- `json-rules-engine-upgraded-operators-temporal` — `withinLast`, `withinNext`, `dayOfWeek`, `inTimeRange`.
- `json-rules-engine-upgraded-operators-string` — `normalizedEquals`, unicode-aware matchers.
- `json-rules-engine-upgraded-operators-fuzzy` — Levenshtein-threshold similarity (gated behind a peer dep).

## Alternative expression paradigm

- `json-rules-engine-upgraded-logic` — a JsonLogic-compatible inline evaluator that shares the operator registry and almanac but expresses rules as `{op:[args]}` expressions. Useful for consumers who have existing JsonLogic rule stores.

## Runtime extensions

- **`runSync`** — a fully-synchronous evaluation path for rule sets that have no async facts. Useful in pure browser contexts and for microbenchmarks.
- **Rete-style optimization** (opt-in) — shared condition nodes across rules for large rule sets (1000+).
- **Hot reload** — invalidation hooks so long-lived processes can swap rule JSON without restart.
- **Rule composition** — `extends`, `compose`, `mixin` for reusing condition fragments.

## Decision tables

A separate DSL for row × column → outcome decision tables, drawing on DMN conventions. Will coexist with the current rules engine, not replace it.

## Tooling

- **Playground site** — live-evaluate rules against sample facts in the browser.
- **`rules explain`** CLI subcommand — render a rule as a human-readable natural-language description.
- **`rules test`** CLI subcommand — run a rule against a fixture file of `{ facts, expected }` pairs.

Nothing on this list will land without a dedicated design pass and a green CI.
