/*
 * OpenFreeMap 'liberty' vector style — free forever, no API key, no
 * registration, no usage limits (https://openfreemap.org). We patch every
 * label layer to prefer the English name (name:en) over the local-script
 * name, falling back to whatever OpenStreetMap has, so the map reads in
 * English without needing a paid geocoding/labels API.
 */
export async function englishStyle(): Promise<any> {
  const res = await fetch('https://tiles.openfreemap.org/styles/liberty');
  const style = await res.json();
  for (const layer of style.layers ?? []) {
    if (layer.layout && layer.layout['text-field']) {
      layer.layout['text-field'] = ['coalesce', ['get', 'name:en'], ['get', 'name'], ['get', 'name:latin']];
    }
  }
  return style;
}
