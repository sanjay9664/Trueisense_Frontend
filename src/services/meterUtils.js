export const normalizeMeterName = (name) => {
  if (!name) return name;
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (cleaned === 'Meter-1') return 'Sensor Meter';
  if (cleaned === 'Meter-2') return 'Normal Light Meter';
  return cleaned;
};

export const normalizeMeterSortKey = (name) => {
  if (!name) return name;
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (cleaned === 'Sensor Meter' || cleaned === 'Sensor  Meter') return 'Meter-01';
  if (cleaned === 'Normal Light Meter') return 'Meter-02';
  return cleaned;
};
