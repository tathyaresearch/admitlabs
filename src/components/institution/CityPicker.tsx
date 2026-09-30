'use client';

// City from the fixed all-India list. The state comes with the city (spec section 6).
// Sends two hidden fields, city and state; the server checks them against the list again.

import { useState } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { INDIA_CITIES, type City } from '@/config/cities';
import { findPlace, placeLabel, searchPlaces } from '@/domain/places';
import styles from './institution.module.css';

export function CityPicker({ id, error, defaultCity, defaultState }: { id: string; error?: string | null; defaultCity?: string; defaultState?: string }) {
  const initial = defaultCity && defaultState ? (findPlace(INDIA_CITIES, defaultCity, defaultState) ?? null) : null;
  const [selected, setSelected] = useState<City | null>(initial);
  const [query, setQuery] = useState(initial ? placeLabel(initial) : '');

  return (
    <>
      <Combobox
        id={id}
        label="City"
        hint="Start typing, then choose from the list. The state comes with it."
        placeholder="Guwahati"
        error={error}
        query={query}
        closed={selected !== null && query === placeLabel(selected)}
        onQueryChange={(next) => {
          setQuery(next);
          if (selected && next !== placeLabel(selected)) setSelected(null);
        }}
        search={(text) => searchPlaces(INDIA_CITIES, text, 8)}
        optionKey={(city) => `${city.name}|${city.state}`}
        optionLabel={placeLabel}
        renderOption={(city) => (
          <>
            <span>{city.name}</span>
            <span className={styles.optionMeta}>{city.state}</span>
          </>
        )}
        onSelect={(city) => {
          setSelected(city);
          setQuery(placeLabel(city));
        }}
        emptyText="No listed city matches. Try the nearest major city."
      />
      <input type="hidden" name="city" value={selected?.name ?? ''} />
      <input type="hidden" name="state" value={selected?.state ?? ''} />
    </>
  );
}
