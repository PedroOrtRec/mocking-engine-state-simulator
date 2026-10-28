import { describe, it, expect } from 'vitest';
import {
  serializeRulesToJson,
  parseJsonToRules,
  serializeSchemaRulesToJson,
  parseJsonToSchemaRules,
  extractPathParams,
  extractSchemaFields,
  extractStateProperties,
  type StateMutationRule,
  type SchemaFieldRule,
} from './mutation-rules';

describe('mutation-rules utility', () => {
  it('serializeRulesToJson: serializa reglas a formato Opción 2 del backend', () => {
    const rules: StateMutationRule[] = [
      { id: '1', property: 'balance', op: 'inc', valueType: 'number', value: '25' },
      { id: '2', property: 'isLoggedIn', op: 'toggle', valueType: 'boolean', value: '' },
      { id: '3', property: 'cart', op: 'push', valueType: 'string', value: 'item_123' },
      { id: '4', property: 'oldToken', op: 'unset', valueType: 'string', value: '' },
      { id: '5', property: 'theme', op: 'set', valueType: 'string', value: 'dark' },
      { id: '6', property: 'discount', op: 'dec', valueType: 'number', value: '{{body.coupon}}' },
    ];

    const json = serializeRulesToJson(rules);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json!);
    expect(parsed).toEqual({
      balance: { $inc: 25 },
      isLoggedIn: { $toggle: true },
      cart: { $push: 'item_123' },
      oldToken: { $unset: true },
      theme: 'dark',
      discount: { $dec: '{{body.coupon}}' },
    });
  });

  it('serializeRulesToJson: ignora reglas con property vacía y devuelve undefined si no hay reglas válidas', () => {
    expect(serializeRulesToJson([])).toBeUndefined();
    expect(
      serializeRulesToJson([
        { id: '1', property: '   ', op: 'set', valueType: 'string', value: 'val' },
      ])
    ).toBeUndefined();
  });

  it('parseJsonToRules: deserializa JSON de estado a reglas visuales', () => {
    const json = JSON.stringify({
      balance: { $inc: 50 },
      isVip: { $toggle: true },
      tags: { $push: 'beta' },
      tempKey: { $unset: true },
      role: 'admin',
    });

    const rules = parseJsonToRules(json);
    expect(rules).toHaveLength(5);

    expect(rules[0]).toMatchObject({ property: 'balance', op: 'inc', value: '50' });
    expect(rules[1]).toMatchObject({ property: 'isVip', op: 'toggle' });
    expect(rules[2]).toMatchObject({ property: 'tags', op: 'push', value: 'beta' });
    expect(rules[3]).toMatchObject({ property: 'tempKey', op: 'unset' });
    expect(rules[4]).toMatchObject({ property: 'role', op: 'set', value: 'admin' });
  });

  it('parseJsonToRules: devuelve array vacío para JSON inválido o nulo', () => {
    expect(parseJsonToRules(undefined)).toEqual([]);
    expect(parseJsonToRules('')).toEqual([]);
    expect(parseJsonToRules('invalid-json')).toEqual([]);
  });

  it('serializeRulesToJson y parseJsonToRules: preservan $type cuando un placeholder tiene tipo explícito (number, boolean, json)', () => {
    const rules: StateMutationRule[] = [
      { id: '1', property: 'lastUserId', op: 'set', valueType: 'number', value: '{{path.id}}' },
      { id: '2', property: 'scores', op: 'push', valueType: 'number', value: '{{body.score}}' },
    ];

    const json = serializeRulesToJson(rules);
    expect(JSON.parse(json!)).toEqual({
      lastUserId: { $set: '{{path.id}}', $type: 'number' },
      scores: { $push: '{{body.score}}', $type: 'number' },
    });

    const parsedBack = parseJsonToRules(json);
    expect(parsedBack).toHaveLength(2);
    expect(parsedBack[0]).toMatchObject({
      property: 'lastUserId',
      op: 'set',
      valueType: 'number',
      value: '{{path.id}}',
    });
    expect(parsedBack[1]).toMatchObject({
      property: 'scores',
      op: 'push',
      valueType: 'number',
      value: '{{body.score}}',
    });
  });

  it('extractPathParams y extractSchemaFields: detectan parámetros {param} y campos del JSON Schema recursivamente', () => {
    expect(extractPathParams('/api/v1/users/{userId}/orders/{orderId}')).toEqual([
      'userId',
      'orderId',
    ]);
    expect(extractPathParams('/api/v1/static')).toEqual([]);

    const schema = JSON.stringify({
      type: 'object',
      properties: {
        amount: { type: 'number' },
        isVip: { type: 'boolean' },
        customer: {
          type: 'object',
          properties: {
            email: { type: 'string' },
          },
        },
      },
    });

    expect(extractSchemaFields(schema)).toEqual([
      { path: 'amount', valueType: 'number' },
      { path: 'isVip', valueType: 'boolean' },
      { path: 'customer', valueType: 'json' },
      { path: 'customer.email', valueType: 'string' },
    ]);

    // Debe rechazar e ignorar un JSON plano que no sea un JSON Schema
    const plainBodyExample = JSON.stringify({
      price: 120,
      couponActive: true,
    });
    expect(extractSchemaFields(plainBodyExample)).toEqual([]);

    expect(extractStateProperties('{"theme":"dark","count":1,"active":true}')).toEqual([
      { name: 'theme', valueType: 'string' },
      { name: 'count', valueType: 'number' },
      { name: 'active', valueType: 'boolean' },
    ]);
  });

  it('serializeSchemaRulesToJson y parseJsonToSchemaRules: construyen y deserializan JSON Schema Draft-07 con restricciones avanzadas', () => {
    const schemaRules: SchemaFieldRule[] = [
      {
        id: 'f1',
        name: 'amount',
        type: 'number',
        required: true,
        minimum: '10',
        maximum: '500',
      },
      {
        id: 'f2',
        name: 'role',
        type: 'string',
        required: true,
        minLength: '3',
        maxLength: '20',
        pattern: '^[A-Z]+$',
        enumValues: 'USER, ADMIN',
      },
      {
        id: 'f3',
        name: 'email',
        type: 'string',
        required: false,
        format: 'email',
      },
    ];

    const jsonSchemaStr = serializeSchemaRulesToJson(schemaRules);
    expect(jsonSchemaStr).toBeDefined();

    const parsedSchema = JSON.parse(jsonSchemaStr!);
    expect(parsedSchema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['amount', 'role'],
      properties: {
        amount: { type: 'number', minimum: 10, maximum: 500 },
        role: {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          pattern: '^[A-Z]+$',
          enum: ['USER', 'ADMIN'],
        },
        email: { type: 'string', format: 'email' },
      },
    });

    const roundTrip = parseJsonToSchemaRules(jsonSchemaStr);
    expect(roundTrip).toHaveLength(3);
    expect(roundTrip[0]).toMatchObject({
      name: 'amount',
      type: 'number',
      required: true,
      minimum: '10',
      maximum: '500',
    });
    expect(roundTrip[1]).toMatchObject({
      name: 'role',
      type: 'string',
      required: true,
      minLength: '3',
      maxLength: '20',
      pattern: '^[A-Z]+$',
      enumValues: 'USER, ADMIN',
    });
    expect(roundTrip[2]).toMatchObject({
      name: 'email',
      type: 'string',
      required: false,
      format: 'email',
    });
  });
});
