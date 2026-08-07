import { describe, it, expect } from 'vitest';
import { validate } from '../validate';

describe('Validation', () => {
  it('should return empty array for valid data', () => {
    const errors = validate(
      { name: 'Test', age: 25 },
      { name: { required: true, type: 'string' }, age: { required: true, type: 'number', min: 0, max: 100 } }
    );
    expect(errors).toHaveLength(0);
  });

  it('should catch missing required fields', () => {
    const errors = validate({}, { name: { required: true, type: 'string' } });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('name');
  });

  it('should validate string types', () => {
    const errors = validate({ name: 123 }, { name: { required: true, type: 'string' } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate number min/max', () => {
    const errors = validate({ val: 150 }, { val: { required: true, type: 'number', min: 0, max: 100 } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate enum values', () => {
    const errors = validate({ status: 'invalid' }, { status: { required: true, enum: ['active', 'inactive'] } });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept valid enum values', () => {
    const errors = validate({ status: 'active' }, { status: { required: true, enum: ['active', 'inactive'] } });
    expect(errors).toHaveLength(0);
  });
});
