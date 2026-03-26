/**
 * Telegram Mini App theme integration.
 *
 * Reads themeParams + colorScheme from the Telegram WebApp SDK and exposes a
 * typed palette that adapts to the user's Telegram client theme (light/dark).
 *
 * Usage:
 *   const theme = getTMATheme();
 *   <View style={{ backgroundColor: theme.bg }}>
 */

import { isTelegramMiniApp } from './telegram-webapp';

export interface TMATheme {
  bg: string;
  secondaryBg: string;
  text: string;
  hint: string;
  link: string;
  button: string;
  buttonText: string;
  headerBg: string;
  accent: string;
  sectionBg: string;
  sectionHeader: string;
  subtitle: string;
  destructive: string;
  isDark: boolean;
  /** Separator / divider color derived from hint */
  separator: string;
  /** Card surface color — slightly elevated from bg */
  card: string;
}

const LIGHT: TMATheme = {
  bg: '#ffffff',
  secondaryBg: '#efeff4',
  text: '#000000',
  hint: '#8e8e93',
  link: '#2481cc',
  button: '#1B4332',
  buttonText: '#ffffff',
  headerBg: '#ffffff',
  accent: '#1B4332',
  sectionBg: '#ffffff',
  sectionHeader: '#6d6d72',
  subtitle: '#8e8e93',
  destructive: '#ff3b30',
  isDark: false,
  separator: '#c6c6c8',
  card: '#ffffff',
};

const DARK: TMATheme = {
  bg: '#212121',
  secondaryBg: '#0f0f0f',
  text: '#f5f5f5',
  hint: '#aaaaaa',
  link: '#62bcf9',
  button: '#1B4332',
  buttonText: '#ffffff',
  headerBg: '#212121',
  accent: '#4CAF50',
  sectionBg: '#1c1c1e',
  sectionHeader: '#8e8e93',
  subtitle: '#8e8e93',
  destructive: '#ff453a',
  isDark: true,
  separator: '#38383a',
  card: '#1c1c1e',
};

let _cached: TMATheme | null = null;

export function getTMATheme(): TMATheme {
  if (_cached) return _cached;

  if (typeof window === 'undefined' || !isTelegramMiniApp()) {
    return LIGHT;
  }

  const wa = window.Telegram?.WebApp;
  const tp = wa?.themeParams as Record<string, string> | undefined;
  const isDark = wa?.colorScheme === 'dark';
  const defaults = isDark ? DARK : LIGHT;

  if (!tp) {
    _cached = defaults;
    return defaults;
  }

  const bg = tp.bg_color || defaults.bg;
  const hint = tp.hint_color || defaults.hint;

  _cached = {
    bg,
    secondaryBg: tp.secondary_bg_color || defaults.secondaryBg,
    text: tp.text_color || defaults.text,
    hint,
    link: tp.link_color || defaults.link,
    button: tp.button_color || defaults.button,
    buttonText: tp.button_text_color || defaults.buttonText,
    headerBg: tp.header_bg_color || defaults.headerBg,
    accent: tp.accent_text_color || defaults.accent,
    sectionBg: tp.section_bg_color || defaults.sectionBg,
    sectionHeader: tp.section_header_text_color || defaults.sectionHeader,
    subtitle: tp.subtitle_text_color || defaults.subtitle,
    destructive: tp.destructive_text_color || defaults.destructive,
    isDark,
    separator: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    card: tp.section_bg_color || defaults.card,
  };

  return _cached;
}

/** Reset cached theme (call if Telegram theme changes at runtime) */
export function resetTMAThemeCache() {
  _cached = null;
}
