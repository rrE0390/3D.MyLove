const palettes = ['#526e84', '#947982', '#788a87', '#a28c73', '#7c829e', '#8b7085', '#658796', '#958273'];
export async function loadPhotos() {
  const response = await fetch('./photo-manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Не удалось получить фотографии: ${response.status}`);
  const data = await response.json();
  return data.photos.filter(photo => typeof photo.src === 'string').map((photo, i) => ({ ...photo, palette: palettes[i % palettes.length] }));
}
