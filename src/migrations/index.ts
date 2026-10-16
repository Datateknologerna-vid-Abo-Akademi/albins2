import * as migration_20261015_180928 from './20261015_180928';
import * as migration_20261016_142012_add_song_content_html from './20261016_142012_add_song_content_html';

export const migrations = [
  {
    up: migration_20261015_180928.up,
    down: migration_20261015_180928.down,
    name: '20261015_180928',
  },
  {
    up: migration_20261016_142012_add_song_content_html.up,
    down: migration_20261016_142012_add_song_content_html.down,
    name: '20261016_142012_add_song_content_html'
  },
];
