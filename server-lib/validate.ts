/**
 * Lightweight validation helpers used to guard every write endpoint.
 * No external dependency — rules are declared inline.
 */
type Rule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'enum';
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: RegExp;
};

export type ValidationSchema = Record<string, Rule>;

export function validate(body: Record<string, any> | undefined, schema: ValidationSchema): string[] {
  const errors: string[] = [];
  const src = body || {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = src[field];

    if (value === undefined || value === null || value === '') {
      if (rule.required) errors.push(`${field} is required`);
      continue;
    }

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    } else if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`${field} must be a number`);
    } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }

    if (typeof value === 'number' && rule.min !== undefined && value < rule.min) {
      errors.push(`${field} must be at least ${rule.min}`);
    }
    if (typeof value === 'number' && rule.max !== undefined && value > rule.max) {
      errors.push(`${field} must be at most ${rule.max}`);
    }
    if (typeof value === 'string' && rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field} is not valid`);
    }
  }

  return errors;
}

export function ok(body: any): boolean {
  return !!body && typeof body === 'object';
}