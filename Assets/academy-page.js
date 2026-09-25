(() => {
'use strict';

const resources = Array.isArray(window.ACADEMY_RESOURCES) ? window.ACADEMY_RESOURCES : [];
const categories = Array.isArray(window.ACADEMY_CATEGORIES) ? window.ACADEMY_CATEGORIES : [];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

const STORE = 'academia_onboarding_v87';
const LEGACY_STORE = 'academia_onboarding_v83';
const DEFAULT_STATE = Object.freeze({ access:false, session:false, share:false, requested:false });
const STARTER_IDS = ['43148','43178','52834','52830'];

const GROUPS = {
  start:['teoria-entrenamiento','calentamiento','meta','recuperacion'],
  move:['meta','calentamiento','poliarticulares','regionales','guiados','desafios','sin-tiempo','recuperacion'],
  learn:['biblioteca','teoria-entrenamiento','teoria-caso','metodologia','laboratorio'],
  community:['entrevistas','talleres','vivos','zoom']
};

const CATEGORY_THEMES = {
  biblioteca:['#ff6f31','#6fb3c0'], meta:['#ff6f31','#007c8c'], calentamiento:['#6fb3c0','#ff6f31'],
  poliarticulares:['#ff6f31','#005a65'], regionales:['#007c8c','#6fb3c0'], recuperacion:['#6fb3c0','#005a65'],
  'sin-tiempo':['#ff6f31','#003467'], desafios:['#ff6f31','#6fb3c0'], 'teoria-caso':['#007c8c','#ff6f31'],
  'teoria-entrenamiento':['#6fb3c0','#003467'], metodologia:['#ff6f31','#007c8c'], guiados:['#6fb3c0','#ff6f31'],
  laboratorio:['#007c8c','#6fb3c0'], entrevistas:['#ff6f31','#6fb3c0'], talleres:['#6fb3c0','#005a65'],
  vivos:['#ff6f31','#003467'], zoom:['#007c8c','#ff6f31']
};

let activeLibraryGroup = 'all';
let searchValue = '';
let activeKey = null;
let revealObserver = null;
let drawerCloseTimer = null;

function readState(){
  try {
    const current = localStorage.getItem(STORE);
    if (current) return { ...DEFAULT_STATE, ...JSON.parse(current) };
    const legacy = localStorage.getItem(LEGACY_STORE);
    if (legacy) {
      const migrated = { ...DEFAULT_STATE, ...JSON.parse(legacy) };
      localStorage.setItem(STORE, JSON.stringify(migrated));
      return migrated;
    }
  } catch (_) {}
  return { ...DEFAULT_STATE };
}

function writeState(patch){
  const next = { ...readState(), ...patch };
  try { localStorage.setItem(STORE, JSON.stringify(next)); } catch (_) {}
  return next;
}

function setText(selector, text){ const el = $(selector); if (el) el.textContent = text; }
function setWidth(selector, width){ const el = $(selector); if (el) el.style.width = width; }

function renderRouteState(state){
  const section = $('#ruta-sugerida');
  const lock = $('#routeLock');
  const content = $('#routeContent');
  const action = $('#routeLockAction');
  if (!section || !lock || !content) return;

  const unlocked = !!state.share;
  section.classList.toggle('is-locked', !unlocked);
  lock.hidden = unlocked;
  content.hidden = !unlocked;
  content.setAttribute('aria-hidden', String(!unlocked));

  if (unlocked) {
    renderStarterKit();
    return;
  }

  let lockView = {
    badge:'01', eyebrow:'TU SIGUIENTE PASO', title:'Primero entrá a Klouser.',
    copy:'Confirmá tu acceso. Después conseguí tu primera sesión y empezá desde tu propia experiencia.',
    action:'Ir al comienzo', target:'#primeros-pasos'
  };
  if (state.access && !state.session) {
    lockView = {
      badge:'02', eyebrow:'TU MISIÓN DE HOY', title:state.requested ? 'Ahora hacé tu primera sesión.' : 'Conseguí tu primera sesión.',
      copy:state.requested ? 'Ya la pediste. Cuando la recibas, entrená antes de perderte en la biblioteca.' : 'Si todavía no la tenés, pedísela a Ale. Ese es tu punto de partida real.',
      action:'Ir a mi sesión', target:'[data-step="session"]'
    };
  }
  if (state.session && !state.share) {
    lockView = {
      badge:'03', eyebrow:'UN PASO MÁS', title:'Compartí qué pasó.',
      copy:'Contar lo que sentiste, lo que costó o lo que descubriste también es parte de aprender a entrenar.',
      action:'Ir a compartir', target:'[data-step="share"]'
    };
  }

  setText('#routeLockBadge', lockView.badge);
  setText('#routeLockEyebrow', lockView.eyebrow);
  setText('#routeLockTitle', lockView.title);
  setText('#routeLockCopy', lockView.copy);
  if (action) {
    action.firstChild && (action.firstChild.textContent = `${lockView.action} `);
    action.dataset.target = lockView.target;
  }
}

function renderProgress(){
  const state = readState();
  const count = [state.access, state.session, state.share].filter(Boolean).length;
  const pct = Math.round((count / 3) * 100);

  setText('#progressText', `${count} de 3 pasos`);
  setText('#navProgressValue', `${count}/3`);
  setText('#progressPercent', `${pct}%`);
  setWidth('#progressBar', `${pct}%`);
  $('#progressRing')?.style.setProperty('--progress', `${pct * 3.6}deg`);

  $$('[data-progress-label]').forEach(el => el.classList.toggle('is-done', !!state[el.dataset.progressLabel]));
  $$('[data-step]').forEach(el => el.classList.toggle('is-done', !!state[el.dataset.step]));
  $$('[data-badge]').forEach(el => el.classList.toggle('is-unlocked', !!state[el.dataset.badge]));
  $('[data-master-badge]')?.classList.toggle('is-unlocked', count === 3);
  $('#academyCockpit')?.classList.toggle('is-complete', count === 3);

  setText('#requestStatus', state.requested ? 'Listo. Cuando la recibas, hacela y volvé acá.' : 'Cuando la tengas, hacela y volvé acá.');
  $$('[data-request-session]').forEach(el => el.classList.toggle('is-requested', state.requested));

  let mission = { eyebrow:'TU PRÓXIMO PASO', title:'Entrá a Klouser.', copy:'Primero confirmá que podés entrar con el correo con el que te registraste.', status:'ETAPA 01 · ACCESO' };
  if (state.access && !state.session) mission = { eyebrow:'TU MISIÓN DE HOY', title:state.requested ? 'Hacé tu primera sesión.' : 'Conseguí tu primera sesión.', copy:state.requested ? 'Ya la pediste. Hacela antes de recorrer la biblioteca.' : 'Si todavía no la tenés, pedísela a Ale. Ese es el punto de partida real.', status:'ETAPA 02 · PRIMERA SESIÓN' };
  if (state.session && !state.share) mission = { eyebrow:'YA EMPEZASTE', title:'Contá cómo te fue.', copy:'Una frase alcanza. Comunicar lo que pasó ayuda a construir criterio y a recibir mejores devoluciones.', status:'ETAPA 03 · COMPARTIR' };
  if (state.share) mission = { eyebrow:'RUTA INICIAL COMPLETA', title:'Criterio en marcha.', copy:'Ya entrenaste, observaste y compartiste. Ahora sí: elegí contenido con una pregunta real en mente.', status:'NIVEL 01 · APRENDER CON CONTEXTO' };
  setText('#missionEyebrow', mission.eyebrow);
  setText('#missionTitle', mission.title);
  setText('#missionCopy', mission.copy);
  setText('#missionStatus', mission.status);

  renderRouteState(state);
}

function markStep(key, origin){
  const before = readState();
  if (before[key]) { renderProgress(); return; }
  writeState({ [key]: true });
  renderProgress();
  celebrate(origin);
  const messages = {
    access:'Acceso marcado. Ya estás adentro.',
    session:'Primera sesión completada. Ahora contá qué pasó.',
    share:'Ruta inicial completa. Desbloqueaste tus primeros recursos.'
  };
  toast(messages[key] || 'Paso completado.');
}

function categoryGroupMatch(key, group){ return group === 'all' || (GROUPS[group] || []).includes(key); }
function categoryMatchesSearch(category, query){
  if (!query) return true;
  const categoryText = `${category.displayTitle} ${category.label} ${category.description} ${category.kicker}`.toLowerCase();
  if (categoryText.includes(query)) return true;
  return resources.some(item => item.category === category.key && `${item.title || ''} ${item.description || ''}`.toLowerCase().includes(query));
}

function renderCategories(){
  const grid = $('#categoryGrid');
  if (!grid) return;
  const query = searchValue.trim().toLowerCase();
  const filtered = categories.filter(category => categoryGroupMatch(category.key, activeLibraryGroup) && categoryMatchesSearch(category, query));
  setText('#portalCount', String(filtered.length));
  const empty = $('#libraryEmpty');
  if (empty) empty.hidden = filtered.length !== 0;

  grid.innerHTML = filtered.map((category, index) => {
    const [accent, accent2] = CATEGORY_THEMES[category.key] || ['#ff6f31','#6fb3c0'];
    const short = (category.displayTitle || category.label).split(/[·|—]/)[0].trim();
    return `<button class="category-card category-card--coded" type="button" data-category="${escapeHtml(category.key)}" id="categoria-${escapeHtml(category.key)}" aria-expanded="false" aria-controls="resourceDrawer" style="--i:${index};--cat-a:${accent};--cat-b:${accent2}">
      <div class="category-card__art" aria-hidden="true"><span class="category-card__grid"></span><i class="cat-rule cat-rule--one"></i><i class="cat-rule cat-rule--two"></i><i class="cat-marker">${String(index + 1).padStart(2,'0')}</i><strong>${String(category.count).padStart(2,'0')}</strong><em>${escapeHtml(category.kicker)}</em><b>${escapeHtml(short)}</b></div>
      <div class="category-card__content"><div class="category-card__top"><span>${escapeHtml(category.kicker)}</span><b>${String(category.count).padStart(2,'0')}</b></div><div><small>${category.count} recursos</small><h3>${escapeHtml(category.displayTitle)}</h3><p>${escapeHtml(category.description)}</p></div><span class="category-card__action">Abrir categoría <b>↗</b></span></div>
    </button>`;
  }).join('');

  observeDynamic(grid.querySelectorAll('.category-card'));
}

function isVerifiedTitle(resource){
  const raw = (resource.title || '').trim();
  return !!raw && !/^Contenido\s+\d+/i.test(raw) && !/^Título pendiente/i.test(raw);
}

function openCategory(key, shouldScroll = true){
  const category = categories.find(item => item.key === key);
  const drawer = $('#resourceDrawer');
  const list = $('#resourceList');
  if (!category || !drawer || !list) return;

  activeKey = key;
  if (drawerCloseTimer) { clearTimeout(drawerCloseTimer); drawerCloseTimer = null; }
  $$('[data-category]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.category === key)));
  setText('#drawerKicker', `${category.kicker} · ${category.count} recursos`);
  setText('#drawerTitle', category.displayTitle);
  setText('#drawerDescription', category.description);

  const items = resources.filter(resource => resource.category === key);
  list.innerHTML = items.map((resource, index) => {
    const verified = isVerifiedTitle(resource);
    const title = verified ? resource.title : 'Título pendiente de confirmar';
    const description = (resource.description || category.description || 'Abrí el recurso para ver el contenido completo en Klouser.').trim();
    const [accent, accent2] = CATEGORY_THEMES[key] || ['#ff6f31','#6fb3c0'];
    const statusClass = verified ? 'is-verified' : 'is-pending-title';
    const number = String(index + 1).padStart(2,'0');
    return `<a class="resource-card-pro ${statusClass}" data-category="${escapeHtml(key)}" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(title)} — abrir en Klouser" style="--cover-accent:${accent};--cover-accent-2:${accent2}">
      <div class="resource-card-pro__cover">
        <div class="resource-card-pro__grid" aria-hidden="true"></div>
        <i class="resource-card-pro__axis resource-card-pro__axis--x" aria-hidden="true"></i>
        <i class="resource-card-pro__axis resource-card-pro__axis--y" aria-hidden="true"></i>
        <span class="resource-card-pro__accent" aria-hidden="true"></span>
        <div class="resource-card-pro__top"><span>${escapeHtml(resource.type)}</span><small>#${escapeHtml(resource.id)}</small></div>
        <span class="resource-card-pro__index" aria-hidden="true">${number}</span>
        <div class="resource-card-pro__title"><small>${escapeHtml(category.displayTitle)}</small><h4>${escapeHtml(title)}</h4></div>
        <div class="resource-card-pro__reveal"><small>QUÉ VAS A ENCONTRAR</small><p>${escapeHtml(description)}</p></div>
        <span class="resource-card-pro__corner" aria-hidden="true"></span>
      </div>
      <div class="resource-card-pro__footer"><span>Ver artículo en Klouser</span><b>↗</b></div>
    </a>`;
  }).join('');

  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  if (shouldScroll) setTimeout(() => drawer.scrollIntoView({ behavior:'smooth', block:'start' }), 80);
}

function closeCategory(){
  const drawer = $('#resourceDrawer');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  $$('[data-category]').forEach(button => button.setAttribute('aria-expanded','false'));
  activeKey = null;
  drawerCloseTimer = setTimeout(() => { drawer.hidden = true; drawerCloseTimer = null; }, 180);
}

function renderStarterKit(){
  const grid = $('#starterKitGrid');
  if (!grid || grid.dataset.rendered === 'true') return;
  const items = STARTER_IDS.map(id => resources.find(resource => resource.id === id)).filter(Boolean);
  grid.innerHTML = items.map((resource, index) => {
    const isBook = resource.type.toLowerCase().includes('book');
    const label = isBook ? 'LEÉ' : 'MIRÁ';
    const purpose = isBook ? 'Sumá contexto antes de copiar ejercicios.' : 'Mirá el movimiento con una pregunta concreta.';
    return `<a class="starter-resource ${isBook ? 'starter-resource--book' : 'starter-resource--video'}" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
      <div class="starter-resource__head"><span>${String(index + 1).padStart(2,'0')}</span><small>${label} PRIMERO</small></div>
      <div class="starter-resource__title"><em>${escapeHtml(resource.type)}</em><h4>${escapeHtml(resource.title || 'Recurso inicial')}</h4></div>
      <p>${escapeHtml(resource.description || purpose)}</p><b>Abrir en Klouser ↗</b>
    </a>`;
  }).join('');
  grid.dataset.rendered = 'true';
}

function setupReveal(){
  const elements = $$('[data-reveal],.start-step,.route-card,.quick-grid button');
  if (!('IntersectionObserver' in window)) { elements.forEach(el => el.classList.add('is-visible')); return; }
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
  }), { threshold:.12, rootMargin:'0px 0px -5% 0px' });
  elements.forEach(el => revealObserver.observe(el));
}

function observeDynamic(elements){
  Array.from(elements || []).forEach((el, index) => {
    el.style.setProperty('--delay', `${Math.min(index * 45, 360)}ms`);
    if (revealObserver) revealObserver.observe(el); else el.classList.add('is-visible');
  });
}

function celebrate(origin){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.className = 'academy-celebration';
  const rect = origin?.getBoundingClientRect?.();
  host.style.left = `${rect ? rect.left + rect.width / 2 : window.innerWidth / 2}px`;
  host.style.top = `${rect ? rect.top + rect.height / 2 : window.innerHeight / 2}px`;
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('i');
    const angle = (Math.PI * 2 * i) / 12;
    const distance = 65 + Math.random() * 70;
    particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--r', `${Math.random() * 140 - 70}deg`);
    particle.style.setProperty('--d', `${Math.random() * .12}s`);
    host.appendChild(particle);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1100);
}

function toast(message){
  let el = $('#academyToast');
  if (!el) { el = document.createElement('div'); el.id = 'academyToast'; el.className = 'academy-toast'; document.body.appendChild(el); }
  el.textContent = message;
  el.classList.add('is-showing');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-showing'), 2600);
}

function scrollToSelector(selector){
  const target = $(selector);
  if (target) target.scrollIntoView({ behavior:'smooth', block:'center' });
}

document.addEventListener('DOMContentLoaded', () => {
  setupReveal();
  renderCategories();
  renderProgress();

  $('#accessDoneButton')?.addEventListener('click', event => markStep('access', event.currentTarget));
  $$('[data-request-session]').forEach(link => link.addEventListener('click', () => { writeState({ requested:true }); renderProgress(); }));
  $('#sessionDoneButton')?.addEventListener('click', event => { markStep('session', event.currentTarget); setTimeout(() => scrollToSelector('[data-step="share"]'), 180); });
  $('#communityProgressButton')?.addEventListener('click', () => toast('Cuando lo compartas, volvé y marcá “Ya lo compartí”.'));
  $('#shareDoneButton')?.addEventListener('click', event => { markStep('share', event.currentTarget); setTimeout(() => $('#ruta-sugerida')?.scrollIntoView({ behavior:'smooth', block:'start' }), 240); });
  $('#routeLockAction')?.addEventListener('click', event => scrollToSelector(event.currentTarget.dataset.target || '#primeros-pasos'));

  $('#portalSearch')?.addEventListener('input', event => { searchValue = event.target.value; renderCategories(); closeCategory(); });
  $('#libraryTabs')?.addEventListener('click', event => {
    const button = event.target.closest('[data-library-group]');
    if (!button) return;
    activeLibraryGroup = button.dataset.libraryGroup;
    $$('[data-library-group]').forEach(item => item.classList.toggle('is-active', item === button));
    renderCategories();
    closeCategory();
  });
  $('#categoryGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    openCategory(button.dataset.category, true);
  });
  $('#drawerClose')?.addEventListener('click', closeCategory);

  $$('[data-open-category]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const key = link.dataset.openCategory;
    activeLibraryGroup = 'all';
    searchValue = '';
    const search = $('#portalSearch'); if (search) search.value = '';
    $$('[data-library-group]').forEach(item => item.classList.toggle('is-active', item.dataset.libraryGroup === 'all'));
    renderCategories();
    $('#biblioteca-completa')?.scrollIntoView({ behavior:'smooth', block:'start' });
    setTimeout(() => openCategory(key, true), 520);
  }));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeKey) closeCategory();
  });
});
})();
