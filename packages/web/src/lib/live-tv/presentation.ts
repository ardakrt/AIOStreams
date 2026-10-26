import type { BaseItemDto } from '../types';

/** Match channel names without making spacing, punctuation or Turkish accents a hurdle. */
export function channelSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Quality is read from the server's name, never guessed from a channel's genre. */
export function channelLabel(channel: Pick<BaseItemDto, 'Name'>) {
  const name = channel.Name ?? '';
  const quality = [
    ...name.matchAll(/\[(\d{3,4}p)\]|\b(4K|UHD|FHD|HD|SD)\b/gi),
  ].map((match) => match[1] || match[2].toUpperCase());
  const title = name
    .replace(/\[\d{3,4}p\]|\b(?:4K|UHD|FHD|HD|SD)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { title: title || name, quality: [...new Set(quality)] };
}

export function programOnNow(
  program: BaseItemDto | null | undefined,
  now: number
) {
  return (
    !!program &&
    Date.parse(program.StartDate ?? '') <= now &&
    Date.parse(program.EndDate ?? '') > now
  );
}

export function programRemaining(program: BaseItemDto, now: number) {
  const end = Date.parse(program.EndDate ?? '');
  return Number.isFinite(end)
    ? Math.max(0, Math.ceil((end - now) / 60_000))
    : 0;
}
