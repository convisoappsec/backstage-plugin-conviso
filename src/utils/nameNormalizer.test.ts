import { normalizeName } from './nameNormalizer';

describe('normalizeName', () => {
  it('should convert to lowercase', () => {
    expect(normalizeName('MY-PROJECT')).toBe('my-project');
  });

  it('should trim whitespace', () => {
    expect(normalizeName('  project  ')).toBe('project');
  });

  it('should replace multiple spaces with single space', () => {
    expect(normalizeName('my    project   name')).toBe('my project name');
  });

  it('should handle empty string', () => {
    expect(normalizeName('')).toBe('');
  });

  it('should handle already normalized name', () => {
    expect(normalizeName('my-project')).toBe('my-project');
  });

  it('should handle mixed case with spaces', () => {
    expect(normalizeName('My Project Name')).toBe('my project name');
  });
});

