import { createElement } from 'react';
import { Colors, Fonts, FontSizes, BorderRadius, Spacing } from '@/constants/theme';

// Web version of the date picker: the browser's own date input, with the same props
// Seen uses on the native picker (value, maximumDate, onChange(event, date)).
// Extra native-only props (mode, display, themeVariant) are accepted and ignored.

interface DatePickerProps {
  value: Date;
  maximumDate?: Date;
  onChange: (event: unknown, date?: Date) => void;
  [nativeOnly: string]: unknown;
}

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromInputValue(text: string) {
  const [year, month, day] = text.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function DatePicker({ value, maximumDate, onChange }: DatePickerProps) {
  return createElement('input', {
    type: 'date',
    value: toInputValue(value),
    max: maximumDate ? toInputValue(maximumDate) : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event, fromInputValue(event.target.value)),
    style: {
      fontFamily: Fonts.sans,
      fontSize: FontSizes.md,
      color: Colors.text,
      backgroundColor: Colors.cardBackground,
      border: `1px solid ${Colors.border}`,
      borderRadius: BorderRadius.sm,
      padding: `${Spacing.xs}px ${Spacing.sm}px`,
    },
  });
}
