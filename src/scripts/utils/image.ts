const cache = new Map<string, Promise<HTMLImageElement>>();

/** Load + decode an image once (memoised by URL). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
      img.onerror = () => {
        cache.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}
