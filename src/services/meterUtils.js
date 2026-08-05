export const normalizeMeterName = (name) => {
  if (!name) return name;
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (cleaned === 'Meter-1' || cleaned === 'Sensor Meter' || cleaned === 'Sensor  Meter') return 'Zomato - Sensor Meter';
  if (cleaned === 'Meter-2' || cleaned === 'Normal Light Meter') return 'Zomato - Normal Light Meter';
  if (cleaned === 'Meter-3') return 'Hyperpure - Meter-3';
  if (cleaned === 'Meter-4') return 'Hyperpure - Meter-4';
  return cleaned;
};

export const normalizeMeterSortKey = (name) => {
  if (!name) return name;
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (cleaned === 'Sensor Meter' || cleaned === 'Sensor  Meter' || cleaned === 'Zomato - Sensor Meter' || cleaned === 'Meter-1') return 'Meter-01';
  if (cleaned === 'Normal Light Meter' || cleaned === 'Zomato - Normal Light Meter' || cleaned === 'Meter-2') return 'Meter-02';
  if (cleaned === 'Meter-3' || cleaned === 'Hyperpure - Meter-3') return 'Meter-03';
  if (cleaned === 'Meter-4' || cleaned === 'Hyperpure - Meter-4') return 'Meter-04';
  return cleaned;
};
