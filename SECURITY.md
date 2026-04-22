# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `json-rules-engine-upgraded`, please report it via GitHub's [private vulnerability reporting](https://github.com/hoppybunny/json-rules-engine-upgraded/security/advisories/new) rather than opening a public issue.

You will receive a response within 5 business days. If the issue is confirmed, a patch release will follow as soon as a fix is ready; we will coordinate disclosure with you.

## Scope

In scope:

- Remote code execution via rule JSON evaluation
- Denial-of-service via malicious regex (ReDoS), unbounded recursion, or pathological facts
- Prototype pollution via rule or fact inputs
- Information disclosure through error messages or traces

Out of scope:

- Vulnerabilities in dependencies (please report upstream)
- Self-inflicted issues from executing untrusted code inside user-registered operators or fact resolvers

## Design Principles

- The engine never calls `eval()` or `new Function()`.
- Rule JSON is strictly validated against a JSON Schema before evaluation.
- Regex operators run through a `safe-regex2`-style check on registration.
- Facts are deep-frozen per run to prevent cross-run mutation.
