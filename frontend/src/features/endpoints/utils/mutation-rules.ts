export type StateMutationOp = 'set' | 'inc' | 'dec' | 'toggle' | 'push' | 'unset';
export type StateValueType = 'string' | 'number' | 'boolean' | 'json';

export interface StateMutationRule {
  id: string;
  property: string;
  op: StateMutationOp;
  valueType: StateValueType;
  value: string;
}

export interface SchemaFieldHint {
  path: string;
  valueType: StateValueType;
}

export type SchemaPropertyType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
export type SchemaStringFormat = '' | 'email' | 'uuid' | 'date-time' | 'uri';

export interface SchemaFieldRule {
  id: string;
  name: string;
  type: SchemaPropertyType;
  required: boolean;
  minimum?: string;
  maximum?: string;
  minLength?: string;
  maxLength?: string;
  pattern?: string;
  format?: SchemaStringFormat;
  enumValues?: string;
}

export interface StatePropertyHint {
  name: string;
  valueType: StateValueType;
}

const PLACEHOLDER_REGEX = /\{\{[a-zA-Z0-9_.]+\}\}/;
const VALID_VALUE_TYPES = new Set<StateValueType>(['string', 'number', 'boolean', 'json']);

export function isTemplatePlaceholder(val: string): boolean {
  return PLACEHOLDER_REGEX.test(val);
}

/**
 * Extrae automáticamente los nombres de los parámetros de ruta definidos entre llaves {param}
 * Ej: "/api/v1/users/{userId}/orders/{orderId}" -> ["userId", "orderId"]
 */
export function extractPathParams(pathPattern: string): string[] {
  if (!pathPattern) return [];
  const matches = pathPattern.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
  const seen = new Set<string>();
  const params: string[] = [];
  for (const m of matches) {
    const paramName = m[1];
    if (paramName && !seen.has(paramName)) {
      seen.add(paramName);
      params.push(paramName);
    }
  }
  return params;
}

function mapSchemaTypeToValueType(schemaType: unknown): StateValueType {
  if (schemaType === 'number' || schemaType === 'integer') return 'number';
  if (schemaType === 'boolean') return 'boolean';
  if (schemaType === 'object' || schemaType === 'array') return 'json';
  return 'string';
}

/**
 * Extrae recursivamente los campos declarados en un JSON Schema (properties) junto con su tipo sugerido.
 * Rechaza e ignora cualquier JSON plano que no sea una definición de JSON Schema.
 */
export function extractSchemaFields(requestSchema?: string): SchemaFieldHint[] {
  if (!requestSchema || !requestSchema.trim()) return [];
  try {
    const parsed = JSON.parse(requestSchema);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }

    const root = parsed as Record<string, unknown>;
    const hints: SchemaFieldHint[] = [];

    const isJsonSchema =
      root.type === 'object' &&
      typeof root.properties === 'object' &&
      root.properties !== null &&
      !Array.isArray(root.properties);

    if (!isJsonSchema) {
      return [];
    }

    function traverseSchema(node: Record<string, unknown>, prefix: string, depth: number) {
      if (depth > 3) return;
      const props = node.properties;
      if (typeof props !== 'object' || props === null || Array.isArray(props)) {
        return;
      }

      for (const [propName, propDef] of Object.entries(props as Record<string, unknown>)) {
        const fullPath = prefix ? `${prefix}.${propName}` : propName;
        if (typeof propDef === 'object' && propDef !== null && !Array.isArray(propDef)) {
          const defObj = propDef as Record<string, unknown>;
          const vType = mapSchemaTypeToValueType(defObj.type);
          hints.push({ path: fullPath, valueType: vType });

          if (defObj.type === 'object' && defObj.properties) {
            traverseSchema(defObj, fullPath, depth + 1);
          }
        } else {
          hints.push({ path: fullPath, valueType: 'string' });
        }
      }
    }

    traverseSchema(root, '', 1);
    return hints;
  } catch {
    return [];
  }
}

const VALID_SCHEMA_PROP_TYPES = new Set<SchemaPropertyType>([
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
]);

const VALID_STRING_FORMATS = new Set<SchemaStringFormat>([
  '',
  'email',
  'uuid',
  'date-time',
  'uri',
]);

/**
 * Serializa las filas del constructor visual de validación a un documento JSON Schema Draft-07.
 */
export function serializeSchemaRulesToJson(rules: SchemaFieldRule[]): string | undefined {
  const validRules = rules.filter((r) => r.name.trim() !== '');
  if (validRules.length === 0) {
    return undefined;
  }

  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const rule of validRules) {
    const fieldName = rule.name.trim();
    const propDef: Record<string, unknown> = {
      type: rule.type,
    };

    if (rule.required && !required.includes(fieldName)) {
      required.push(fieldName);
    }

    if (rule.type === 'number' || rule.type === 'integer') {
      if (rule.minimum !== undefined && rule.minimum.trim() !== '') {
        const minNum = Number(rule.minimum.trim());
        if (!Number.isNaN(minNum)) propDef.minimum = minNum;
      }
      if (rule.maximum !== undefined && rule.maximum.trim() !== '') {
        const maxNum = Number(rule.maximum.trim());
        if (!Number.isNaN(maxNum)) propDef.maximum = maxNum;
      }
    }

    if (rule.type === 'string') {
      if (rule.minLength !== undefined && rule.minLength.trim() !== '') {
        const minLen = Number.parseInt(rule.minLength.trim(), 10);
        if (!Number.isNaN(minLen) && minLen >= 0) propDef.minLength = minLen;
      }
      if (rule.maxLength !== undefined && rule.maxLength.trim() !== '') {
        const maxLen = Number.parseInt(rule.maxLength.trim(), 10);
        if (!Number.isNaN(maxLen) && maxLen >= 0) propDef.maxLength = maxLen;
      }
      if (rule.pattern !== undefined && rule.pattern.trim() !== '') {
        propDef.pattern = rule.pattern.trim();
      }
      if (rule.format && rule.format.trim() !== '') {
        propDef.format = rule.format.trim();
      }
      if (rule.enumValues !== undefined && rule.enumValues.trim() !== '') {
        const items = rule.enumValues
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '');
        if (items.length > 0) {
          propDef.enum = items;
        }
      }
    }

    properties[fieldName] = propDef;
  }

  const schemaDoc: Record<string, unknown> = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schemaDoc.required = required;
  }

  return JSON.stringify(schemaDoc, null, 2);
}

/**
 * Deserializa un JSON Schema existente en las filas del constructor visual.
 */
export function parseJsonToSchemaRules(requestSchema?: string): SchemaFieldRule[] {
  if (!requestSchema || !requestSchema.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(requestSchema);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }

    const root = parsed as Record<string, unknown>;
    if (
      root.type !== 'object' ||
      typeof root.properties !== 'object' ||
      root.properties === null ||
      Array.isArray(root.properties)
    ) {
      return [];
    }

    const requiredSet = new Set<string>(
      Array.isArray(root.required)
        ? root.required.filter((item): item is string => typeof item === 'string')
        : []
    );

    const rules: SchemaFieldRule[] = [];
    let counter = 1;

    for (const [propName, rawDef] of Object.entries(root.properties as Record<string, unknown>)) {
      const id = `schema-field-${counter++}`;
      if (typeof rawDef !== 'object' || rawDef === null || Array.isArray(rawDef)) {
        rules.push({
          id,
          name: propName,
          type: 'string',
          required: requiredSet.has(propName),
        });
        continue;
      }

      const def = rawDef as Record<string, unknown>;
      const rawType = typeof def.type === 'string' ? (def.type as SchemaPropertyType) : 'string';
      const type: SchemaPropertyType = VALID_SCHEMA_PROP_TYPES.has(rawType) ? rawType : 'string';
      const rawFormat = typeof def.format === 'string' ? (def.format as SchemaStringFormat) : '';
      const format: SchemaStringFormat = VALID_STRING_FORMATS.has(rawFormat) ? rawFormat : '';

      const rule: SchemaFieldRule = {
        id,
        name: propName,
        type,
        required: requiredSet.has(propName),
      };

      if (typeof def.minimum === 'number') rule.minimum = String(def.minimum);
      if (typeof def.maximum === 'number') rule.maximum = String(def.maximum);
      if (typeof def.minLength === 'number') rule.minLength = String(def.minLength);
      if (typeof def.maxLength === 'number') rule.maxLength = String(def.maxLength);
      if (typeof def.pattern === 'string') rule.pattern = def.pattern;
      if (format) rule.format = format;
      if (Array.isArray(def.enum) && def.enum.length > 0) {
        rule.enumValues = def.enum.map((v) => String(v)).join(', ');
      }

      rules.push(rule);
    }

    return rules;
  } catch {
    return [];
  }
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

/**
 * Extrae las propiedades de primer nivel presentes en el JSON del estado de sesión junto con su tipo actual.
 */
export function extractStateProperties(stateJson?: string): StatePropertyHint[] {
  if (!stateJson || !stateJson.trim()) return [];
  try {
    const parsed = JSON.parse(stateJson);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }
    const hints: StatePropertyHint[] = [];
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      const { valueType } = formatVal(val);
      hints.push({ name: key, valueType });
    }
    return hints;
  } catch {
    return [];
  }
}

export function serializeRulesToJson(rules: StateMutationRule[]): string | undefined {
  const validRules = rules.filter((r) => r.property.trim() !== '');
  if (validRules.length === 0) {
    return undefined;
  }

  const result: Record<string, unknown> = {};

  for (const rule of validRules) {
    const prop = rule.property.trim();
    const trimmedVal = rule.value.trim();
    const hasPlaceholder = isTemplatePlaceholder(trimmedVal);

    if (rule.op === 'unset') {
      result[prop] = { $unset: true };
    } else if (rule.op === 'toggle') {
      result[prop] = { $toggle: true };
    } else if (rule.op === 'inc' || rule.op === 'dec') {
      const opKey = rule.op === 'inc' ? '$inc' : '$dec';
      const num = Number(trimmedVal);
      result[prop] = {
        [opKey]: !Number.isNaN(num) && trimmedVal !== '' ? num : trimmedVal || 1,
      };
    } else if (rule.op === 'push') {
      if (hasPlaceholder && rule.valueType !== 'string') {
        result[prop] = { $push: trimmedVal, $type: rule.valueType };
      } else {
        result[prop] = { $push: parseVal(rule.value, rule.valueType) };
      }
    } else {
      // op === 'set'
      if (hasPlaceholder && rule.valueType !== 'string') {
        result[prop] = { $set: trimmedVal, $type: rule.valueType };
      } else {
        result[prop] = parseVal(rule.value, rule.valueType);
      }
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
        const explicitType =
          typeof obj.$type === 'string' && VALID_VALUE_TYPES.has(obj.$type as StateValueType)
            ? (obj.$type as StateValueType)
            : undefined;

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
          const formatted = formatVal(pushVal);
          rules.push({
            id,
            property: key,
            op: 'push',
            valueType: explicitType ?? formatted.valueType,
            value: formatted.value,
          });
          continue;
        }
        if ('$set' in obj) {
          const setVal = obj.$set;
          const formatted = formatVal(setVal);
          rules.push({
            id,
            property: key,
            op: 'set',
            valueType: explicitType ?? formatted.valueType,
            value: formatted.value,
          });
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

export interface RequestBuilderResult {
  resolvedPath: string;
  bodyJson?: string;
  curlCommand: string;
  errors: Record<string, string>;
  isValid: boolean;
}

/**
 * Sugiere un valor inicial válido según las reglas de un campo del JSON Schema.
 */
export function getInitialValueForSchemaField(field: SchemaFieldRule): string {
  if (field.type === 'string') {
    if (field.enumValues && field.enumValues.trim() !== '') {
      const firstEnum = field.enumValues
        .split(',')
        .map((s) => s.trim())
        .find((s) => s !== '');
      if (firstEnum) return firstEnum;
    }
    if (field.format === 'email') return 'user@example.com';
    if (field.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
    if (field.format === 'date-time') return '2026-10-28T12:00:00Z';
    if (field.format === 'uri') return 'https://example.com';
    return '';
  }
  if (field.type === 'number' || field.type === 'integer') {
    if (field.minimum !== undefined && field.minimum.trim() !== '') {
      return field.minimum.trim();
    }
    return field.required ? '1' : '';
  }
  if (field.type === 'boolean') {
    return 'true';
  }
  if (field.type === 'object') {
    return field.required ? '{}' : '';
  }
  if (field.type === 'array') {
    return field.required ? '[]' : '';
  }
  return '';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida un valor individual contra su SchemaFieldRule y devuelve un mensaje de error o null si es válido.
 */
export function validateFieldAgainstSchemaRule(
  field: SchemaFieldRule,
  rawVal: string
): string | null {
  const trimmed = rawVal.trim();

  if (trimmed === '') {
    return field.required ? `El campo '${field.name}' es obligatorio` : null;
  }

  if (field.type === 'number' || field.type === 'integer') {
    const num = Number(trimmed);
    if (Number.isNaN(num)) {
      return `Debe ser un valor numérico válido`;
    }
    if (field.type === 'integer' && !Number.isInteger(num)) {
      return `Debe ser un número entero (integer)`;
    }
    if (field.minimum !== undefined && field.minimum.trim() !== '') {
      const min = Number(field.minimum);
      if (!Number.isNaN(min) && num < min) {
        return `El valor mínimo permitido es ${min}`;
      }
    }
    if (field.maximum !== undefined && field.maximum.trim() !== '') {
      const max = Number(field.maximum);
      if (!Number.isNaN(max) && num > max) {
        return `El valor máximo permitido es ${max}`;
      }
    }
    return null;
  }

  if (field.type === 'string') {
    if (field.minLength !== undefined && field.minLength.trim() !== '') {
      const minLen = Number.parseInt(field.minLength, 10);
      if (!Number.isNaN(minLen) && rawVal.length < minLen) {
        return `Longitud mínima: ${minLen} caracteres`;
      }
    }
    if (field.maxLength !== undefined && field.maxLength.trim() !== '') {
      const maxLen = Number.parseInt(field.maxLength, 10);
      if (!Number.isNaN(maxLen) && rawVal.length > maxLen) {
        return `Longitud máxima: ${maxLen} caracteres`;
      }
    }
    if (field.enumValues && field.enumValues.trim() !== '') {
      const allowed = field.enumValues
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      if (allowed.length > 0 && !allowed.includes(rawVal)) {
        return `Valor no permitido (permitidos: ${allowed.join(', ')})`;
      }
    }
    if (field.pattern && field.pattern.trim() !== '') {
      try {
        const regex = new RegExp(field.pattern.trim());
        if (!regex.test(rawVal)) {
          return `No cumple el patrón regex: ${field.pattern}`;
        }
      } catch {
        // Ignorar si el regex es inválido
      }
    }
    if (field.format === 'email' && !EMAIL_REGEX.test(trimmed)) {
      return `Formato de email inválido`;
    }
    if (field.format === 'uuid' && !UUID_REGEX.test(trimmed)) {
      return `Formato de UUID inválido`;
    }
    if (field.format === 'uri' && !/^https?:\/\/.+/i.test(trimmed)) {
      return `Formato de URI inválido (debe iniciar con http:// o https://)`;
    }
    if (field.format === 'date-time' && Number.isNaN(Date.parse(trimmed))) {
      return `Formato date-time ISO inválido`;
    }
    return null;
  }

  if (field.type === 'object') {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return `Debe ser un objeto JSON válido (ej. {"clave": "valor"})`;
      }
    } catch {
      return `JSON inválido para objeto`;
    }
    return null;
  }

  if (field.type === 'array') {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return `Debe ser un array JSON válido (ej. ["item1", "item2"])`;
      }
    } catch {
      return `JSON inválido para array`;
    }
    return null;
  }

  return null;
}

/**
 * Construye la ruta resuelta, el JSON del body tipado, el comando cURL completo y el mapa de errores de validación.
 */
export function buildCurlRequestCommand(params: {
  baseUrl: string;
  httpMethod: string;
  pathPattern: string;
  sessionKey: string;
  pathValues: Record<string, string>;
  schemaRules: SchemaFieldRule[];
  bodyValues: Record<string, string>;
  customBodyJson?: string;
}): RequestBuilderResult {
  const {
    baseUrl,
    httpMethod,
    pathPattern,
    sessionKey,
    pathValues,
    schemaRules,
    bodyValues,
    customBodyJson,
  } = params;

  const errors: Record<string, string> = {};
  const cleanPattern = pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`;

  // 1. Validar y sustituir {pathParams}
  const pathParams = extractPathParams(cleanPattern);
  let resolvedPath = cleanPattern;
  for (const paramName of pathParams) {
    const val = (pathValues[paramName] ?? '').trim();
    if (!val) {
      errors[`path.${paramName}`] = `El parámetro de ruta '{${paramName}}' es obligatorio`;
    } else {
      resolvedPath = resolvedPath.replaceAll(`{${paramName}}`, encodeURIComponent(val));
    }
  }

  // 2. Validar y construir el Body JSON si aplica
  let bodyJson: string | undefined;

  if (schemaRules.length > 0) {
    const bodyObj: Record<string, unknown> = {};
    for (const field of schemaRules) {
      const rawVal = bodyValues[field.name] ?? '';
      const fieldError = validateFieldAgainstSchemaRule(field, rawVal);
      if (fieldError) {
        errors[`body.${field.name}`] = fieldError;
        continue;
      }

      const trimmed = rawVal.trim();
      if (trimmed === '') {
        continue; // Campo opcional vacío no se incluye en el payload
      }

      if (field.type === 'number' || field.type === 'integer') {
        bodyObj[field.name] = Number(trimmed);
      } else if (field.type === 'boolean') {
        bodyObj[field.name] = trimmed === 'true';
      } else if (field.type === 'object' || field.type === 'array') {
        try {
          bodyObj[field.name] = JSON.parse(trimmed);
        } catch {
          bodyObj[field.name] = rawVal;
        }
      } else {
        bodyObj[field.name] = rawVal;
      }
    }

    if (Object.keys(bodyObj).length > 0 || schemaRules.some((r) => r.required)) {
      bodyJson = JSON.stringify(bodyObj, null, 2);
    }
  } else if (customBodyJson && customBodyJson.trim() !== '') {
    try {
      const parsed = JSON.parse(customBodyJson);
      bodyJson = JSON.stringify(parsed, null, 2);
    } catch {
      errors['customBody'] = 'El JSON personalizado no tiene un formato sintáctico válido';
    }
  }

  const effectiveSession = sessionKey.trim() || 'default';
  const parts: string[] = [
    `curl -i -X ${httpMethod}`,
    `"${baseUrl}/mock${resolvedPath}"`,
    `-H "X-Session-ID: ${effectiveSession}"`,
  ];

  if (bodyJson !== undefined) {
    const escapedSingleQuotes = bodyJson.replaceAll("'", "'\\''");
    parts.push(`-H "Content-Type: application/json"`);
    parts.push(`-d '${escapedSingleQuotes}'`);
  }

  return {
    resolvedPath,
    bodyJson,
    curlCommand: parts.join(' \\\n  '),
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
