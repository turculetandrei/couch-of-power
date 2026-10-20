import type { Dict } from '@/lib/i18n/dict';
import type { TeamStyle } from '@/lib/room/types';

export function teamNames(styles: [TeamStyle, TeamStyle], t: Dict): [string, string] {
  return [styles[0].name || t.teamDefault[0], styles[1].name || t.teamDefault[1]];
}

export function teamColors(styles: [TeamStyle, TeamStyle]): [string, string] {
  return [styles[0].color, styles[1].color];
}
