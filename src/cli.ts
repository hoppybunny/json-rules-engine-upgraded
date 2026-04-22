import { readFile } from 'node:fs/promises';
import { OperatorRegistry } from './operators/index.js';
import { validateRule } from './rule.js';
import { RULE_JSON_SCHEMA } from './schema.js';
import { RulesEngineError } from './errors.js';
import type { Rule } from './types.js';

const USAGE = `json-rules — CLI for json-rules-engine-upgraded

Usage:
  json-rules validate <file.json> [<file.json>...]
  json-rules schema
  json-rules help

Commands:
  validate   Load and structurally validate one or more rule JSON files.
  schema     Print the rule DSL JSON Schema to stdout.
  help       Show this message.

Exit codes:
  0   success
  1   validation failure
  2   usage error`;

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(USAGE);
    return cmd ? 0 : 2;
  }
  if (cmd === 'schema') {
    console.log(JSON.stringify(RULE_JSON_SCHEMA, null, 2));
    return 0;
  }
  if (cmd === 'validate') {
    if (rest.length === 0) {
      console.error('error: validate requires at least one file');
      console.error(USAGE);
      return 2;
    }
    return validateFiles(rest);
  }
  console.error(`error: unknown command "${cmd}"`);
  console.error(USAGE);
  return 2;
}

async function validateFiles(files: string[]): Promise<number> {
  const operators = new OperatorRegistry();
  let hadError = false;
  for (const file of files) {
    try {
      const raw = await readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as Rule;
      validateRule(parsed, { operators });
      console.log(`✓ ${file}`);
    } catch (err) {
      hadError = true;
      if (err instanceof RulesEngineError) {
        console.error(`✗ ${file}`);
        console.error(`  [${err.code}] ${err.message}`);
        if (Object.keys(err.context).length > 0) {
          console.error(`  context: ${JSON.stringify(err.context)}`);
        }
      } else if (err instanceof SyntaxError) {
        console.error(`✗ ${file}`);
        console.error(`  [JSON_PARSE] ${err.message}`);
      } else {
        console.error(`✗ ${file}`);
        console.error(`  ${(err as Error).message}`);
      }
    }
  }
  return hadError ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
