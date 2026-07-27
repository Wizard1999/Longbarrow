export function mountMapSeedControl(currentSeed: number): void {
  const host = document.getElementById('map-seed-control');
  if (!host) return;
  const input = host.querySelector<HTMLInputElement>('input');
  const apply = host.querySelector<HTMLButtonElement>('[data-action="apply"]');
  const random = host.querySelector<HTMLButtonElement>('[data-action="random"]');
  if (!input || !apply || !random) return;
  input.value = String(currentSeed);

  const navigate = (seed: number): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('mapSeed', String(seed));
    window.location.assign(url);
  };
  apply.addEventListener('click', () => {
    const seed = Number(input.value);
    if (Number.isSafeInteger(seed)) navigate(seed);
    else input.setCustomValidity('Enter a whole-number map seed.');
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') apply.click();
  });
  random.addEventListener('click', () => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    navigate(values[0] ?? Date.now());
  });
}
