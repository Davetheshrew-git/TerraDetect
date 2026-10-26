import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

// Fallback to configured key if env is empty
const API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyCFIMwu9i09TEiqeImYkzNifxCrPAW-p2Q';

let loadPromise: Promise<any> | null = null;

export async function getGoogleMapsLoader(): Promise<any> {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return window.google;
  }

  if (loadPromise) {
    return loadPromise;
  }

  setOptions({
    key: API_KEY,
    v: 'weekly'
  });

  loadPromise = (async () => {
    await importLibrary('maps');
    await importLibrary('geometry');
    return window.google;
  })();

  return loadPromise;
}
