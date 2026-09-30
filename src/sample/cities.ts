// Starter city list: Assam, for the sample data. A full India list is a Phase 2 question.

export const SAMPLE_CITIES: ReadonlyArray<{ name: string; state: string }> = [
  'Guwahati',
  'Dibrugarh',
  'Jorhat',
  'Silchar',
  'Tezpur',
  'Nagaon',
  'Tinsukia',
  'Bongaigaon',
  'Dhubri',
  'Diphu',
  'North Lakhimpur',
  'Karimganj',
  'Sivasagar',
  'Goalpara',
  'Barpeta',
  'Golaghat',
  'Hailakandi',
  'Mangaldoi',
  'Nalbari',
  'Kokrajhar',
].map((name) => ({ name, state: 'Assam' }));
