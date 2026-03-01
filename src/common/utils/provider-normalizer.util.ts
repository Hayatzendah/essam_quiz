import { ProviderEnum } from '../enums/provider.enum';

/**
 * Normalizes provider value to match ProviderEnum (case-insensitive)
 * @param provider - Provider value (can be any case: "Goethe", "GOETHE", "goethe")
 * @returns Normalized provider value from ProviderEnum, or the original value if not found (for validation to catch)
 */
export function normalizeProvider(provider: string | undefined | null): ProviderEnum | string | undefined {
  if (!provider) return undefined;

  const trimmed = String(provider).trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.toLowerCase();

  // Find matching enum value (case-insensitive)
  const enumValues = Object.values(ProviderEnum) as string[];
  const matched = enumValues.find((value) => value.toLowerCase() === normalized);

  if (matched) {
    return matched as ProviderEnum;
  }

  // Special cases for values with special characters or different casing
  // Handle "Deutschland-in-Leben" variations
  const deutschlandVariations = [
    'deutschland-in-leben',
    'deutschland_in_leben',
    'deutschland in leben',
  ];
  if (deutschlandVariations.includes(normalized)) {
    return ProviderEnum.DEUTSCHLAND_IN_LEBEN;
  }

  // Handle "Leben in Deutschland" variations
  const lebenVariations = [
    'leben_in_deutschland',
    'leben-in-deutschland',
    'leben in deutschland',
  ];
  if (lebenVariations.includes(normalized)) {
    return ProviderEnum.LEBEN_IN_DEUTSCHLAND;
  }

  // Handle "Grammatik" variations
  if (normalized === 'grammatik' || normalized === 'grammar') {
    return ProviderEnum.GRAMMATIK;
  }

  // Handle "Wortschatz" variations
  if (normalized === 'wortschatz' || normalized === 'vocabulary') {
    return ProviderEnum.WORTSCHATZ;
  }

  // Handle "OESD" variations (osd -> oesd)
  if (normalized === 'osd') {
    return ProviderEnum.OESD;
  }

  // If no match found, return original value (validation will catch it)
  return trimmed;
}

