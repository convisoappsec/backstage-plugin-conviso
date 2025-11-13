/**
 * Safely converts a string or number to a number.
 * Returns null if the value cannot be converted to a valid number.
 * 
 * @param value - String or number to convert
 * @returns Parsed number or null if invalid
 */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Safely converts a string or number to a number with a default fallback.
 * 
 * @param value - String or number to convert
 * @param defaultValue - Default value to return if conversion fails
 * @returns Parsed number or default value
 */
export function toNumberOrDefault(value: string | number | null | undefined, defaultValue: number): number {
  const parsed = toNumber(value);
  return parsed !== null ? parsed : defaultValue;
}

