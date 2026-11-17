export type FeedbackVariant = 'success' | 'error' | 'warning' | 'info';

export type FeedbackTone = 'primary' | 'warning' | 'danger';

type FeedbackPalette = {
  accent: string;
  background: string;
  icon: string;
};

export const feedbackPalettes: Record<FeedbackVariant, FeedbackPalette> = {
  success: {
    accent: '#176B52',
    background: '#E8F3ED',
    icon: '✓',
  },
  error: {
    accent: '#B84D4D',
    background: '#F9EDEC',
    icon: '!',
  },
  warning: {
    accent: '#9A6B1F',
    background: '#FBF3E2',
    icon: '!',
  },
  info: {
    accent: '#3F5E7A',
    background: '#EEF3F9',
    icon: 'i',
  },
};

export const confirmTones: Record<
  FeedbackTone,
  { accent: string; background: string }
> = {
  primary: {
    accent: '#176B52',
    background: '#E8F3ED',
  },
  warning: {
    accent: '#9A6B1F',
    background: '#FBF3E2',
  },
  danger: {
    accent: '#B84D4D',
    background: '#F9EDEC',
  },
};
