export type StateMutationOp = 'set' | 'inc' | 'dec' | 'toggle' | 'push' | 'unset';
export type StateValueType = 'string' | 'number' | 'boolean' | 'json';

export interface StateMutationRule {
  id: string;
  property: string;
  op: StateMutationOp;
  valueType: StateValueType;
  value: string;
}

function parseVal(val: string, type: StateValueType): unknown {
  const trimmed = val.trim();
  if (type === 'number') {
    const num = Number(trimmed);
    return !Number.isNaN(num) && trimmed !== '' ? num : val;
  }
  if (type === 'boolean') {
    return val === 'true';
  }
  if (type === 'json') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function formatVal(v: unknown): { valueType: StateValueType; value: string } {
  if (typeof v === 'number') {
    return { valueType: 'number', value: String(v) };
  }
  if (typeof v === 'boolean') {
    return { valueType: 'boolean', value: String(v) };
  }
  if (typeof v === 'object' && v !== null) {
    return { valueType: 'json', value: JSON.stringify(v) };
  }
  return { valueType: 'string', value: String(v ?? '') };
}

export function serializeRulesToJson(rules: StateMutationRule[]): string | undefined {
  const validRules = rules.filter((r) => r.property.trim() !== '');
  if (validRules.length === 0) {
    return undefined;
  }

  const result: Record<string, unknown> = {};

  for (const rule of validRules) {
    const prop = rule.property.trim();

    if (rule.op === 'unset') {
      result[prop] = { $unset: true };
    } else if (rule.op === 'toggle') {
      result[prop] = { $toggle: true };
    } else if (rule.op === 'inc' || rule.op === 'dec') {
      const opKey = rule.op === 'inc' ? '$inc' : '$dec';
      const trimmed = rule.value.trim();
      const num = Number(trimmed);
      result[prop] = {
        [opKey]: !Number.isNaN(num) && trimmed !== '' ? num : trimmed || 1,
      };
    } else if (rule.op === 'push') {
      result[prop] = { $push: parseVal(rule.value, rule.valueType) };
    } else {
      // op === 'set'
      result[prop] = parseVal(rule.value, rule.valueType);
    }
  }

  return JSON.stringify(result, null, 2);
}

export function parseJsonToRules(stateUpdates?: string): StateMutationRule[] {
  if (!stateUpdates || !stateUpdates.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(stateUpdates);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }

    const rules: StateMutationRule[] = [];
    let counter = 1;

    for (const [key, val] of Object.entries(parsed)) {
      const id = `rule-${counter++}`;

      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        if ('$unset' in obj) {
          rules.push({ id, property: key, op: 'unset', valueType: 'string', value: '' });
          continue;
        }
        if ('$toggle' in obj) {
          rules.push({ id, property: key, op: 'toggle', valueType: 'boolean', value: '' });
          continue;
        }
        if ('$inc' in obj) {
          rules.push({ id, property: key, op: 'inc', valueType: 'number', value: String(obj.$inc ?? 1) });
          continue;
        }
        if ('$dec' in obj) {
          rules.push({ id, property: key, op: 'dec', valueType: 'number', value: String(obj.$dec ?? 1) });
          continue;
        }
        if ('$push' in obj) {
          const pushVal = obj.$push;
          const { valueType, value } = formatVal(pushVal);
          rules.push({ id, property: key, op: 'push', valueType, value });
          continue;
        }
        if ('$set' in obj) {
          const setVal = obj.$set;
          const { valueType, value } = formatVal(setVal);
          rules.push({ id, property: key, op: 'set', valueType, value });
          continue;
        }
      }

      // Direct assignment
      const { valueType, value } = formatVal(val);
      rules.push({ id, property: key, op: 'set', valueType, value });
    }

    return rules;
  } catch {
    return [];
  }
}
