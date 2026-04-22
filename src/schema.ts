import { DSL_VERSION } from './types.js';

/**
 * JSON Schema (draft 2020-12) for the rule DSL. Exported both as a TS const
 * and as a standalone subpath import (`json-rules-engine-upgraded/schema`) so
 * consumers in other languages can validate rule JSON without installing the
 * runtime package.
 */
export const RULE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://json-rules-engine-upgraded.dev/schema/v${DSL_VERSION.split('.')[0]}/rule.json`,
  title: 'Rule',
  type: 'object',
  required: ['name', 'conditions', 'event'],
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    priority: { type: 'number' },
    conditions: { $ref: '#/$defs/Condition' },
    event: { $ref: '#/$defs/Event' },
  },
  $defs: {
    Event: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', minLength: 1 },
        params: { type: 'object', additionalProperties: { $ref: '#/$defs/JsonValue' } },
      },
    },
    Condition: {
      oneOf: [
        { $ref: '#/$defs/LeafCondition' },
        { $ref: '#/$defs/AllCondition' },
        { $ref: '#/$defs/AnyCondition' },
        { $ref: '#/$defs/NotCondition' },
      ],
    },
    LeafCondition: {
      type: 'object',
      required: ['fact', 'operator', 'value'],
      additionalProperties: false,
      properties: {
        fact: { type: 'string', minLength: 1 },
        operator: { type: 'string', minLength: 1 },
        value: { $ref: '#/$defs/ConditionValue' },
        path: { type: 'string' },
        params: { type: 'object', additionalProperties: { $ref: '#/$defs/JsonValue' } },
        name: { type: 'string' },
      },
    },
    AllCondition: {
      type: 'object',
      required: ['all'],
      additionalProperties: false,
      properties: {
        all: { type: 'array', minItems: 1, items: { $ref: '#/$defs/Condition' } },
        name: { type: 'string' },
        priority: { type: 'number' },
      },
    },
    AnyCondition: {
      type: 'object',
      required: ['any'],
      additionalProperties: false,
      properties: {
        any: { type: 'array', minItems: 1, items: { $ref: '#/$defs/Condition' } },
        name: { type: 'string' },
        priority: { type: 'number' },
      },
    },
    NotCondition: {
      type: 'object',
      required: ['not'],
      additionalProperties: false,
      properties: {
        not: { $ref: '#/$defs/Condition' },
        name: { type: 'string' },
      },
    },
    ConditionValue: {
      oneOf: [
        { $ref: '#/$defs/JsonValue' },
        {
          type: 'object',
          required: ['fact'],
          additionalProperties: false,
          properties: {
            fact: { type: 'string', minLength: 1 },
            path: { type: 'string' },
            params: { type: 'object', additionalProperties: { $ref: '#/$defs/JsonValue' } },
          },
        },
      ],
    },
    JsonValue: {
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'null' },
        { type: 'array', items: { $ref: '#/$defs/JsonValue' } },
        { type: 'object', additionalProperties: { $ref: '#/$defs/JsonValue' } },
      ],
    },
  },
} as const;

export type RuleJsonSchema = typeof RULE_JSON_SCHEMA;
