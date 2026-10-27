import { describe, it, expect } from 'vitest';
import {
  serializeRulesToJson,
  parseJsonToRules,
  type StateMutationRule,
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
});
