// Finding a city as someone types. Pure, so the picker, the server and the tests agree.
// Matches the start of the city name first, then any word in it, then older names
// (Bangalore finds Bengaluru), then the state.

export interface Place {
  name: string;
  state: string;
  aliases: readonly string[];
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function rank(place: Place, query: string): number | null {
  const name = normalise(place.name);
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(' ').some((word) => word.startsWith(query))) return 2;
  const aliases = place.aliases.map(normalise);
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (aliases.some((alias) => alias.split(' ').some((word) => word.startsWith(query)))) return 4;
  if (query.length >= 3 && normalise(place.state).startsWith(query)) return 5;
  return null;
}

export function searchPlaces<T extends Place>(places: readonly T[], query: string, limit = 8): T[] {
  const wanted = normalise(query.split(',')[0] ?? '');
  const state = normalise(query.split(',')[1] ?? '');
  if (!wanted) return [];
  return places
    .flatMap((place) => {
      if (state && !normalise(place.state).startsWith(state)) return [];
      const score = rank(place, wanted);
      return score === null ? [] : [{ place, score }];
    })
    .sort((a, b) => a.score - b.score || a.place.name.length - b.place.name.length || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((entry) => entry.place);
}

/** "Guwahati, Assam". */
export function placeLabel(place: Pick<Place, 'name' | 'state'>): string {
  return `${place.name}, ${place.state}`;
}

/** The listed place with this exact name and state, if there is one. */
export function findPlace<T extends Place>(places: readonly T[], name: string, state: string): T | undefined {
  return places.find((place) => place.name === name && place.state === state);
}
