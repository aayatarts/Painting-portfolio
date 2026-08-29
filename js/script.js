/* ==========================================================================
   Artist Portfolio — Site Script
   Vanilla JS only. All editable content lives OUTSIDE this file:

     data/paintings.csv   → the painting inventory (title, medium, status...)
     data/artist.json     → artist name, bio, achievements, contact details

   Edit those two files to update the site — you never need to touch this
   one. See README.md for a full guide.

   IMPORTANT: browsers block a plain double-clicked HTML file from reading
   local data files (a security restriction on the file:// protocol). To
   preview the site with your data changes, run "Start Preview.bat"
   (Windows) or see README.md for other options. This restriction does NOT
   apply once the site is hosted on GitHub Pages / Netlify / Vercel — it
   only affects local previewing.
   ========================================================================== */

const DATA_PATHS = {
  paintings: 'data/paintings.csv',
  artist: 'data/artist.json'
};

let PAINTINGS = [];

document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initFooterYear();
  initContactForm();

  const [paintings, artist] = await Promise.all([loadPaintings(), loadArtist()]);

  if (paintings) {
    PAINTINGS = paintings;
    const lightbox = createLightbox();
    initFeaturedGrid(lightbox);
    initGallery(lightbox);
  }

  if (artist) {
    applyArtistContent(artist);
  }
});

/* --------------------------------------------------------------------
   Data loading: data/paintings.csv
   -------------------------------------------------------------------- */
async function loadPaintings() {
  try {
    const response = await fetch(DATA_PATHS.paintings);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return parseCSV(text)
      .filter((row) => row.title)
      .map((row, index) => normalizePainting(row, index));
  } catch (err) {
    console.warn('Could not load data/paintings.csv. See README.md for local preview instructions.', err);
    showDataError('featured-grid');
    showDataError('gallery-grid');
    return null;
  }
}

function normalizePainting(row, index) {
  const category = (row.category || '').toLowerCase().trim();
  const status = (row.status || 'available').toLowerCase().trim();
  const featuredRaw = (row.featured || '').toLowerCase().trim();
  let image = (row.image || '').trim();
  if (image && !image.includes('/')) image = `images/paintings/${image}`;

  const resolveImagePath = (name) => (name.includes('/') ? name : `images/paintings/${name}`);
  const extraImages = (row.additionalimages || '')
    .split('|')
    .map((name) => name.trim())
    .filter(Boolean)
    .map(resolveImagePath);

  return {
    id: `${slugify(row.title)}-${index}`,
    title: row.title.trim(),
    category,
    medium: row.medium || '',
    dimensions: row.dimensions || '',
    year: row.year || '',
    status: ['available', 'inquire', 'sold'].includes(status) ? status : 'available',
    src: image,
    images: [image, ...extraImages].filter(Boolean),
    alt: row.alttext || row.alt || row.title,
    featured: ['true', 'yes', '1'].includes(featuredRaw)
  };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* Minimal CSV parser — supports quoted fields (needed if a field contains a comma) */
function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = (values[i] || '').trim();
    });
    return row;
  });
}

function showDataError(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `
    <p class="data-error">
      Paintings could not be loaded. If you're previewing this file directly on your computer,
      run <strong>Start Preview.bat</strong> (see README.md) — this only affects local previewing,
      not the live hosted site.
    </p>`;
}

/* --------------------------------------------------------------------
   Data loading: data/artist.json
   -------------------------------------------------------------------- */
async function loadArtist() {
  try {
    const response = await fetch(DATA_PATHS.artist);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('Could not load data/artist.json — showing default placeholder content. See README.md for local preview instructions.', err);
    return null;
  }
}

function applyArtistContent(artist) {
  document.querySelectorAll('.nav-logo').forEach((el) => setContent(el, artist.name));

  setById('hero-name', artist.name);
  setById('hero-tagline', artist.tagline);
  setAttrById('hero-bg', 'src', artist.heroImage);
  if (artist.name) setAttrById('hero-bg', 'alt', `Featured painting by ${artist.name}`);
  setById('home-intro', artist.intro);

  const firstName = artist.name ? artist.name.split(' ')[0] : '';
  if (firstName) setById('about-greeting', `Hello, I'm ${firstName}.`);
  setAttrById('about-photo', 'src', artist.artistPhoto);
  if (artist.name) setAttrById('about-photo', 'alt', `Portrait of the artist, ${artist.name}, in her studio`);
  renderBio(artist.bio);
  renderAchievements(artist.achievements);

  setById('contact-email-value', artist.email);
  if (artist.instagram) setById('contact-instagram-value', `@${artist.instagram}`);
  setAttrById('contact-form', 'action', artist.formspreeEndpoint);

  applyContactLinks(artist);
  setById('footer-artist-name', artist.name);
}

function renderBio(bio) {
  const container = document.getElementById('about-bio');
  if (!container || !Array.isArray(bio) || !bio.length) return;
  container.innerHTML = bio.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('');
}

function renderAchievements(list) {
  const container = document.getElementById('about-achievements');
  if (!container || !Array.isArray(list) || !list.length) return;
  container.innerHTML = list
    .map((item) => `<li><strong>${escapeHTML(item.title || '')}</strong>${escapeHTML(item.detail || '')}</li>`)
    .join('');
}

function applyContactLinks(artist) {
  document.querySelectorAll('[data-contact]').forEach((el) => {
    const type = el.getAttribute('data-contact');
    if (type === 'email' && artist.email) el.setAttribute('href', `mailto:${artist.email}`);
    if (type === 'whatsapp' && artist.whatsapp) el.setAttribute('href', `https://wa.me/${artist.whatsapp}`);
    if (type === 'instagram' && artist.instagram) el.setAttribute('href', `https://instagram.com/${artist.instagram}`);
  });
}

function setById(id, value) {
  setContent(document.getElementById(id), value);
}

function setContent(el, value) {
  if (el && value !== undefined && value !== null && value !== '') el.textContent = value;
}

function setAttrById(id, attr, value) {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* --------------------------------------------------------------------
   Navigation
   -------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });
}

function initFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* --------------------------------------------------------------------
   Home: Featured Works
   -------------------------------------------------------------------- */
function initFeaturedGrid(lightbox) {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  const featured = PAINTINGS.filter((p) => p.featured);
  grid.innerHTML = featured.map((p) => renderCard(p)).join('');

  if (!lightbox) return;
  grid.querySelectorAll('.art-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const index = featured.findIndex((p) => p.id === id);
      lightbox.open(featured, index);
    });
  });
}

/* --------------------------------------------------------------------
   Gallery
   -------------------------------------------------------------------- */
function initGallery(lightbox) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  let activeFilter = 'all';
  let currentList = PAINTINGS.slice();

  const filterButtons = document.querySelectorAll('.filter-btn');

  function renderGrid() {
    currentList = activeFilter === 'all'
      ? PAINTINGS.slice()
      : PAINTINGS.filter((p) => p.category === activeFilter);
    grid.innerHTML = currentList.map((p) => renderCard(p)).join('');
    attachCardClicks();
  }

  function attachCardClicks() {
    if (!lightbox) return;
    grid.querySelectorAll('.art-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const index = currentList.findIndex((p) => p.id === id);
        lightbox.open(currentList, index);
      });
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderGrid();
    });
  });

  renderGrid();
}

/* --------------------------------------------------------------------
   Lightbox — shared by the Home "Featured Works" grid and the full Gallery.
   Each grid opens it with its own list of paintings, so Next/Prev cycles
   through whichever list (featured, or the current gallery filter) the
   visitor opened it from.
   -------------------------------------------------------------------- */
function createLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return null;

  const lightboxImg = lightbox.querySelector('.lightbox-image-wrap img');
  const thumbsContainer = lightbox.querySelector('.lightbox-thumbs');
  const captionTitle = lightbox.querySelector('.lightbox-caption h3');
  const captionMeta = lightbox.querySelector('.lightbox-caption .art-meta');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  let currentList = [];
  let currentIndex = 0;
  let currentImageIndex = 0;

  function open(list, index) {
    currentList = list;
    currentIndex = index;
    currentImageIndex = 0;
    updateLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    const painting = currentList[currentIndex];
    if (!painting) return;
    renderThumbs(painting);
    showImage(painting, currentImageIndex);
    captionTitle.textContent = painting.title;
    captionMeta.textContent =
      `${painting.medium} · ${painting.dimensions} · ${painting.year} · ${capitalize(painting.status)}`;
  }

  function showImage(painting, imageIndex) {
    currentImageIndex = imageIndex;
    const images = painting.images && painting.images.length ? painting.images : [painting.src];
    lightboxImg.src = images[imageIndex] || images[0];
    lightboxImg.alt = painting.alt;
    thumbsContainer.querySelectorAll('.lightbox-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === imageIndex);
    });
  }

  function renderThumbs(painting) {
    const images = painting.images && painting.images.length ? painting.images : [painting.src];
    if (images.length <= 1) {
      thumbsContainer.innerHTML = '';
      return;
    }
    thumbsContainer.innerHTML = images
      .map((src, i) => `
        <button class="lightbox-thumb" type="button" data-index="${i}" aria-label="View photo ${i + 1} of ${images.length}">
          <img src="${src}" alt="" loading="lazy">
        </button>
      `)
      .join('');
    thumbsContainer.querySelectorAll('.lightbox-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        showImage(painting, Number(thumb.getAttribute('data-index')));
      });
    });
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % currentList.length;
    currentImageIndex = 0;
    updateLightbox();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    currentImageIndex = 0;
    updateLightbox();
  }

  closeBtn.addEventListener('click', closeLightbox);
  nextBtn.addEventListener('click', showNext);
  prevBtn.addEventListener('click', showPrev);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });

  /* Swipe support for mobile */
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  lightbox.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) > 50) {
      delta > 0 ? showPrev() : showNext();
    }
  });

  return { open };
}

function renderCard(p) {
  return `
    <div class="art-card" data-id="${p.id}" data-category="${p.category}">
      <span class="status-badge">${capitalize(p.status)}</span>
      <div class="art-media">
        <img src="${p.src}" alt="${p.alt}" loading="lazy" width="600" height="750">
      </div>
      <div class="art-info">
        <h3>${p.title}</h3>
        <p class="art-meta">${capitalize(p.category)} · ${p.year}</p>
      </div>
    </div>
  `;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* --------------------------------------------------------------------
   Contact Form
   -------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const nameField = form.querySelector('#name');
  const emailField = form.querySelector('#email');
  const messageField = form.querySelector('#message');
  const statusEl = form.querySelector('.form-status');

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    valid = validateField(nameField, nameField.value.trim().length > 0, 'Please enter your name.') && valid;
    valid = validateField(emailField, emailPattern.test(emailField.value.trim()), 'Please enter a valid email address.') && valid;
    valid = validateField(messageField, messageField.value.trim().length > 0, 'Please enter a message.') && valid;

    if (!valid) return;

    statusEl.textContent = 'Sending...';
    statusEl.className = 'form-status';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        statusEl.textContent = "Thank you! Your message has been sent — I'll reply soon.";
        statusEl.classList.add('success');
        form.reset();
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      statusEl.textContent = 'Something went wrong. Please email me directly instead.';
      statusEl.classList.add('error');
    }
  });

  function validateField(field, isValid, message) {
    const errorEl = field.parentElement.querySelector('.form-error');
    if (!isValid) {
      if (errorEl) errorEl.textContent = message;
      field.style.borderColor = '#b5473d';
      return false;
    }
    if (errorEl) errorEl.textContent = '';
    field.style.borderColor = '';
    return true;
  }
}
