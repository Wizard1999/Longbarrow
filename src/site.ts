import './site.css';

type Phase = {
  name: string;
  status: string;
  completion: number;
  benchmark: string;
};

type ProgressData = {
  overall: number;
  updated: string;
  currentWork: string[];
  phases: Phase[];
  milestones: string[];
  roadmapHtml: string;
};

const art = {
  'war-table': new URL('../docs/assets/concept-art/war-table-camera-concept.webp', import.meta.url).href,
  contested: new URL('../docs/assets/concept-art/contested-ground.webp', import.meta.url).href,
  cohort: new URL('../docs/assets/concept-art/cohort-legionnaire.webp', import.meta.url).href,
  marksman: new URL('../docs/assets/concept-art/cohort-marksman.webp', import.meta.url).href,
  standard: new URL('../docs/assets/concept-art/cohort-standard-main-base.webp', import.meta.url).href,
  worker: new URL('../docs/assets/concept-art/cohort-worker-recovering-legacy.webp', import.meta.url).href,
  conclave: new URL('../docs/assets/concept-art/conclave-ritual.webp', import.meta.url).href,
  mycora: new URL('../docs/assets/concept-art/mycora-spread-battlefield.webp', import.meta.url).href,
  'mycora-structures': new URL('../docs/assets/concept-art/mycora-spread-structures.webp', import.meta.url).href,
  titanfolk: new URL('../docs/assets/concept-art/titanfolk-creature.webp', import.meta.url).href,
} as const;

/**
 * Stamp every piece of art as concept art, at the one place art is injected.
 *
 * None of these images are in-game footage — they are AI-generated exploration
 * of the design language. A visitor scrolling a hero image has no way to know
 * that unless the page says so, and letting them assume otherwise would
 * misrepresent how far along the game actually is.
 *
 * Done here rather than in the markup deliberately: a caption written by hand
 * is one someone forgets when adding the next image. Labelling at the injection
 * point means unlabelled art is not possible.
 */
for (const image of document.querySelectorAll<HTMLImageElement>('[data-art]')) {
  const key = image.dataset.art as keyof typeof art;
  if (!(key in art)) continue;
  image.src = art[key];

  // Purely decorative backdrops are aria-hidden and carry no alt text; badging
  // them would add visual noise without informing anyone.
  if (image.getAttribute('aria-hidden') === 'true') continue;

  image.title = 'Concept art — not in-game footage';
  if (image.alt && !/concept art/i.test(image.alt)) {
    image.alt = `Concept art: ${image.alt}`;
  }

  const host = image.closest('figure') ?? image.parentElement;
  if (!host || host.querySelector('.concept-badge')) continue;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const badge = document.createElement('span');
  badge.className = 'concept-badge';
  badge.textContent = 'Concept art';
  host.appendChild(badge);
}

const fallback: ProgressData = {
  overall: 23,
  updated: '2026-07-27',
  currentWork: [
    'Selection reliability at extreme camera angles',
    'Expanded developer sandbox diagnostics',
    'Attack and invalid-command feedback',
  ],
  phases: [],
  milestones: [],
  roadmapHtml: '<p>The full roadmap could not be loaded. Open <code>docs/ROADMAP.md</code> in the repository.</p>',
};

function renderProgress(data: ProgressData): void {
  const overall = Math.max(0, Math.min(100, data.overall));
  // All of them: the figure appears in the hero stats and again in the progress
  // panel, and querySelector would silently update only the first.
  const numbers = document.querySelectorAll<HTMLElement>('[data-progress-number]');
  const fill = document.querySelector<HTMLElement>('[data-progress-fill]');
  const track = document.querySelector<HTMLElement>('[data-progress-track]');
  const date = document.querySelector<HTMLTimeElement>('[data-progress-date]');
  for (const el of numbers) el.textContent = String(overall);
  if (fill) fill.style.width = `${overall}%`;
  if (track) track.setAttribute('aria-valuenow', String(overall));
  if (date) {
    date.textContent = data.updated;
    date.dateTime = data.updated;
  }

  const work = document.querySelector<HTMLOListElement>('[data-current-work]');
  if (work && data.currentWork.length) {
    work.replaceChildren(...data.currentWork.map((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
  }

  const phaseList = document.querySelector<HTMLElement>('[data-phase-list]');
  if (phaseList && data.phases.length) {
    phaseList.replaceChildren(...data.phases.map((phase, index) => {
      const item = document.createElement('article');
      item.className = 'phase-row';
      item.innerHTML = `
        <div class="phase-number">${String(index).padStart(2, '0')}</div>
        <div class="phase-name"><h3>${escapeHtml(phase.name)}</h3><p>${escapeHtml(phase.benchmark)}</p></div>
        <div class="phase-status">${escapeHtml(phase.status)}</div>
        <div class="phase-percent">${phase.completion}%</div>
        <div class="phase-meter" aria-hidden="true"><span style="width:${phase.completion}%"></span></div>`;
      return item;
    }));
  }

  const milestoneList = document.querySelector<HTMLElement>('[data-milestone-list]');
  if (milestoneList && data.milestones.length) {
    milestoneList.replaceChildren(...data.milestones.slice(0, 8).map((milestone, index) => {
      const item = document.createElement('article');
      item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(milestone)}</p>`;
      return item;
    }));
  }


  const roadmap = document.querySelector<HTMLElement>('[data-full-roadmap]');
  if (roadmap) roadmap.innerHTML = data.roadmapHtml;
}

function escapeHtml(value: string): string {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

fetch('./data/progress.json')
  .then((response) => {
    if (!response.ok) throw new Error(`Progress request failed: ${response.status}`);
    return response.json() as Promise<ProgressData>;
  })
  .then(renderProgress)
  .catch(() => renderProgress(fallback));

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const header = document.querySelector<HTMLElement>('[data-header]');
window.addEventListener('scroll', () => header?.classList.toggle('is-scrolled', window.scrollY > 24), { passive: true });


// Concept-art lightbox ------------------------------------------------------
// Gallery images are references worth studying, not decorative thumbnails.
// Keep the viewer dependency-free and keyboard accessible.
const galleryImages = [...document.querySelectorAll<HTMLImageElement>('.gallery-grid img')];
if (galleryImages.length) {
  const dialog = document.createElement('dialog');
  dialog.className = 'art-lightbox';
  dialog.setAttribute('aria-label', 'Concept art viewer');
  dialog.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close concept art viewer">×</button>
    <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">‹</button>
    <figure><img alt="" /><figcaption></figcaption></figure>
    <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">›</button>`;
  document.body.appendChild(dialog);

  const fullImage = dialog.querySelector<HTMLImageElement>('figure img')!;
  const caption = dialog.querySelector<HTMLElement>('figcaption')!;
  let active = 0;

  const show = (index: number): void => {
    active = (index + galleryImages.length) % galleryImages.length;
    const source = galleryImages[active]!;
    fullImage.src = source.currentSrc || source.src;
    fullImage.alt = source.alt;
    caption.textContent = source.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
  };
  const open = (index: number): void => {
    show(index);
    dialog.showModal();
  };

  galleryImages.forEach((image, index) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `${image.alt}. Open full-size image.`);
    image.addEventListener('click', () => open(index));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(index);
      }
    });
  });

  dialog.querySelector('.lightbox-close')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox-prev')?.addEventListener('click', () => show(active - 1));
  dialog.querySelector('.lightbox-next')?.addEventListener('click', () => show(active + 1));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(active - 1);
    if (event.key === 'ArrowRight') show(active + 1);
  });
}
