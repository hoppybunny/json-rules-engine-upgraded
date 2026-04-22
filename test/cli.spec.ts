import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'json-rules-cli-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('CLI', () => {
  it('prints help for --help and returns 0', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await main(['help']);
    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('prints the schema for `schema`', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await main(['schema']);
    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('"Rule"');
    logSpy.mockRestore();
  });

  it('validates a well-formed rule file', async () => {
    const file = join(dir, 'ok.json');
    await writeFile(
      file,
      JSON.stringify({
        name: 'ok',
        conditions: { fact: 'a', operator: 'equal', value: 1 },
        event: { type: 'ok' },
      }),
    );
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await main(['validate', file]);
    expect(code).toBe(0);
    logSpy.mockRestore();
  });

  it('returns exit code 1 on invalid rule with context', async () => {
    const file = join(dir, 'bad.json');
    await writeFile(
      file,
      JSON.stringify({
        name: 'bad',
        conditions: { fact: 'a', operator: 'mystery', value: 1 },
        event: { type: 'ok' },
      }),
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await main(['validate', file]);
    expect(code).toBe(1);
    const output = errSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('RULE_INVALID');
    errSpy.mockRestore();
  });

  it('returns 2 on usage error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await main(['validate']);
    expect(code).toBe(2);
    errSpy.mockRestore();
  });
});
