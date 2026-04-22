import { describe, expect, it } from 'vitest';
import { RULE_JSON_SCHEMA } from '../src/schema.js';

describe('rule JSON Schema', () => {
  it('exposes top-level required keys', () => {
    expect(RULE_JSON_SCHEMA.required).toEqual(['name', 'conditions', 'event']);
  });

  it('has $defs for Condition, LeafCondition, AllCondition, AnyCondition, NotCondition', () => {
    const defs = Object.keys(RULE_JSON_SCHEMA.$defs);
    expect(defs).toContain('Condition');
    expect(defs).toContain('LeafCondition');
    expect(defs).toContain('AllCondition');
    expect(defs).toContain('AnyCondition');
    expect(defs).toContain('NotCondition');
    expect(defs).toContain('ConditionValue');
    expect(defs).toContain('Event');
    expect(defs).toContain('JsonValue');
  });

  it('pins $id to a versioned URL', () => {
    expect(RULE_JSON_SCHEMA.$id).toMatch(/^https:\/\/json-rules-engine-upgraded\.dev\/schema\/v\d+\/rule\.json$/);
  });
});
