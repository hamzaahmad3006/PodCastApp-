// ============================================
// CENTRALIZED COLOR CONSTANTS
// ============================================
// All color values used throughout the application

export const COLORS = {
  // Primary Colors
  PRIMARY: '#A637FF',
  PRIMARY_LIGHT: '#F4E5FF',
  LIGHT_PINK: '#FFB6C1',
  PRIMARY_THUMB: '#A067FF',

  // Neutral Colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: 'gray',
  LIGHT_GRAY: '#DDDDDD',
  BACKGROUND_GRAY: '#F9F9F9',
  INPUT_GRAY: '#EDEDED',
  BORDER_GRAY: '#E0E0E0',
  DARK_GRAY: '#D3D3D3',
  BACKGROUND_LIGHT: '#F2F2F2',

  SUCCESS: '#4CAF50',
  ERROR: '#FF3B30',

  TRANSPARENT: 'transparent',
} as const;


export type ColorKey = keyof typeof COLORS;
