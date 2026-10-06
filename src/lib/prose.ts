// Prose markup shared by the page renderer (components/Prose.tsx) and the validator.
// **bold** · *italic* · `code` · {kind:text} · [[term]] / [[shown|glossary-id]] · ((shown|part,part))
export const PROSE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\{(gpu|cpu|mem|math|err):(.+?)\}|\[\[(.+?)\]\]|\(\((.+?)\|(.+?)\)\)/g;

/** Plain text of a prose string (for word counts and aria labels). */
export const plain = (s: string) => s.replace(PROSE_RE, (_, b, i, c, _k, kt, t, p) => b ?? i ?? c ?? kt ?? (t ? (t.includes('|') ? t.split('|')[0] : t) : p ?? ''));
