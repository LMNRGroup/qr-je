export type VcardFontOption = {
  label: string;
  value: string;
  note: string;
};

export const VCARD_DEFAULT_FONT_FAMILY =
  '"Manrope", "Inter", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export const VCARD_FONT_OPTIONS: VcardFontOption[] = [
  {
    label: 'Manrope',
    value: VCARD_DEFAULT_FONT_FAMILY,
    note: 'Modern default',
  },
  {
    label: 'Plus Jakarta Sans',
    value: '"Plus Jakarta Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
    note: 'Polished business',
  },
  {
    label: 'Sora',
    value: '"Sora", "Inter", "Helvetica Neue", Arial, sans-serif',
    note: 'Sharp and premium',
  },
  {
    label: 'Outfit',
    value: '"Outfit", "Inter", "Helvetica Neue", Arial, sans-serif',
    note: 'Bold contemporary',
  },
  {
    label: 'DM Sans',
    value: '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
    note: 'Clean and balanced',
  },
  {
    label: 'Space Grotesk',
    value: '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
    note: 'Tech-forward',
  },
  {
    label: 'Lora',
    value: '"Lora", Georgia, serif',
    note: 'Editorial serif',
  },
];

const LEGACY_VCARD_FONT_MAP: Record<string, string> = {
  'Arial, sans-serif': VCARD_DEFAULT_FONT_FAMILY,
  'Helvetica, Arial, sans-serif': VCARD_DEFAULT_FONT_FAMILY,
  '"Times New Roman", Times, serif': '"Lora", Georgia, serif',
  'Georgia, serif': '"Lora", Georgia, serif',
  '"Trebuchet MS", Arial, sans-serif': '"Plus Jakarta Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Verdana, Geneva, sans-serif': '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Courier New", Courier, monospace': '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
  '"Lucida Console", Monaco, monospace': '"Space Grotesk", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Tahoma, Geneva, sans-serif': '"DM Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  'Garamond, "Times New Roman", serif': '"Lora", Georgia, serif',
};

const SUPPORTED_VCARD_FONTS = new Set(VCARD_FONT_OPTIONS.map((font) => font.value));

export const normalizeVcardFontFamily = (value?: string | null) => {
  const font = value?.trim() ?? '';
  if (!font) {
    return VCARD_DEFAULT_FONT_FAMILY;
  }

  if (SUPPORTED_VCARD_FONTS.has(font)) {
    return font;
  }

  return LEGACY_VCARD_FONT_MAP[font] ?? VCARD_DEFAULT_FONT_FAMILY;
};
