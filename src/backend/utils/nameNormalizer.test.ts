import { normalizeEntityName } from './nameNormalizer';

describe('normalizeEntityName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeEntityName('MY-PROJECT')).toBe('my-project');
  });

  it('should trim whitespace', () => {
    expect(normalizeEntityName('  project  ')).toBe('project');
  });

  it('should replace multiple spaces with single space', () => {
    expect(normalizeEntityName('my    project   name')).toBe('my project name');
  });

  it('should handle empty string', () => {
    expect(normalizeEntityName('')).toBe('');
  });

  it('should handle undefined by returning empty string', () => {
    expect(normalizeEntityName(undefined)).toBe('');
  });

  it('should handle already normalized name', () => {
    expect(normalizeEntityName('my-project')).toBe('my-project');
  });

  it('should handle mixed case with spaces', () => {
    expect(normalizeEntityName('My Project Name')).toBe('my project name');
  });

  it('should handle null-like values', () => {
    expect(normalizeEntityName(null as any)).toBe('');
  });
});

