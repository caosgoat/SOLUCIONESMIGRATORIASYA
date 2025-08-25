/*************************************************
 * 1) EQUIPO: Cargar miembros desde Sheets
 *************************************************/
async function loadTeam() {
  const container = document.getElementById('team-container');
  if (!container) return; // No estamos en "Nuestro equipo"

  // ⚠️ Reemplaza por tu endpoint real de SheetDB/Apps Script
  const sheetUrl = "https://sheetdb.io/api/v1/TU_API_KEY";

  try {
    const response = await fetch(sheetUrl);
    const data = await response.json();

    container.innerHTML = "";
    data.forEach(member => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.innerHTML = `
        <img src="${member.foto || 'assets/team-placeholder.jpg'}" alt="${member.nombre || 'Miembro'}">
        <h3>${member.nombre || 'Nombre por definir'}</h3>
        <h4>${member.titulo || member.rol || ''}</h4>
        <p>${member.descripcion || ''}</p>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error cargando equipo:", error);
    container.innerHTML = "<p>No se pudo cargar el equipo.</p>";
  }
}

/*************************************************
 * 2) EQUIPO: Filtro de búsqueda
 *************************************************/
function setupSearch() {
  const searchInput = document.getElementById("search");
  if (!searchInput) return; // No hay buscador en esta página

  searchInput.addEventListener("input", function () {
    const filter = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll(".team-card");
    cards.forEach(card => {
      const name = (card.querySelector("h3")?.textContent || "").toLowerCase();
      card.style.display = name.includes(filter) ? "block" : "none";
    });
  });
}

/*************************************************
 * 3) Altura del header -> variable CSS (--header-h)
 *    para secciones fullscreen en móvil
 *************************************************/
(function setHeaderHeightVar(){
  function applyHeaderHeight(){
    const header = document.querySelector('.header');
    if (!header) return;
    const h = header.offsetHeight || 0;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  window.addEventListener('load', applyHeaderHeight);
  window.addEventListener('resize', applyHeaderHeight);
  document.addEventListener('readystatechange', applyHeaderHeight);
})();

/*************************************************
 * 4) Servicios: slider 1x1 con auto, dots, flechas y swipe
 *************************************************/
(function servicesSlider(){
  const track = document.getElementById('servicesTrack');
  if (!track) return;

  const slides   = Array.from(track.children);
  const total    = slides.length;
  let index      = 0;

  const prevBtn  = document.getElementById('srvPrev');
  const nextBtn  = document.getElementById('srvNext');
  const dotsWrap = document.getElementById('srvDots');
  const viewport = document.querySelector('.cards-viewport');

  // Dots
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
    });
  }

  function update(){
    track.style.transform = `translateX(-${index * 100}%)`;
    if (dotsWrap){
      [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === index));
    }
  }
  function prev(){ index = (index - 1 + total) % total; update(); }
  function next(){ index = (index + 1) % total; update(); }
  function goTo(i){ index = i % total; update(); restartAuto(); }

  prevBtn?.addEventListener('click', () => { prev(); restartAuto(); });
  nextBtn?.addEventListener('click', () => { next(); restartAuto(); });

  // Auto-advance
  let auto = null;
  const INTERVAL = 5000;
  function startAuto(){ if(!auto) auto = setInterval(next, INTERVAL); }
  function stopAuto(){ if(auto){ clearInterval(auto); auto = null; } }
  function restartAuto(){ stopAuto(); startAuto(); }

  // Pausa al hover (desktop)
  viewport?.addEventListener('mouseenter', stopAuto);
  viewport?.addEventListener('mouseleave', startAuto);

  // Swipe móvil (bloquea scroll vertical si gesto es horizontal)
  let sx = 0, sy = 0, isSwiping = false;
  track.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    isSwiping = false; stopAuto();
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping = true; e.preventDefault(); // requiere passive:false
    }
  }, { passive: false });

  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const TH = 40;
    if (Math.abs(dx) > TH) { dx > 0 ? prev() : next(); }
    sx = sy = 0; isSwiping = false; startAuto();
  }, { passive: true });

  // Init
  update(); startAuto();
})();

/*************************************************
 * 5) Áreas: carrusel en columnas (1 móvil / 3 desktop)
 *    con flechas, dots, autoplay y swipe
 *************************************************/
(function areasCarousel(){
  const track = document.getElementById('areasTrack');
  if (!track) return;

  const dotsWrap = document.getElementById('areasDots');
  const prevBtn  = document.getElementById('areasPrev');
  const nextBtn  = document.getElementById('areasNext');
  const cards    = Array.from(track.children);

  let perView = 1;   // 1 móvil, 3 desktop
  let page    = 0;   // índice de página
  let pages   = 1;   // total páginas

  function computePerView(){
    perView = window.innerWidth >= 900 ? 3 : 1;
    pages   = Math.ceil(cards.length / perView);
    if (page >= pages) page = 0;
  }

  function buildDots(){
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < pages; i++){
      const b = document.createElement('button');
      if (i === page) b.classList.add('active');
      b.addEventListener('click', () => goToPage(i));
      dotsWrap.appendChild(b);
    }
  }

  function updateDots(){
    if (!dotsWrap) return;
    [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === page));
  }

  function applyTransform(){
    const first = cards[0];
    if (!first) return;

    const viewportW = track.parentElement.getBoundingClientRect().width;

    if (perView === 1) {
      /* MÓVIL: tarjeta = 100% del viewport; sin gap */
      const pageWidthPx = viewportW;
      const totalWidth  = cards.length * viewportW;
      const maxOffset   = Math.max(0, totalWidth - viewportW);
      const target      = Math.min(page * pageWidthPx, maxOffset);
      track.style.transform = `translateX(-${target}px)`;
      return;
    }

    /* DESKTOP (3 por vista): respetamos gap del CSS (14px) */
    const GAP_PX = 14;
    const cardW  = first.getBoundingClientRect().width;
    const gapsPerPage = perView - 1;
    const pageWidthPx = perView * cardW + gapsPerPage * GAP_PX;

    const totalWidth  = cards.length * cardW + (cards.length - 1) * GAP_PX;
    const maxOffset   = Math.max(0, totalWidth - viewportW);
    const target      = Math.min(page * pageWidthPx, maxOffset);

    track.style.transform = `translateX(-${target}px)`;
  }

  function goToPage(p){
    page = (p + pages) % pages;
    applyTransform();
    updateDots();
    restartAuto();
  }
  function nextPage(){ goToPage(page + 1); }
  function prevPage(){ goToPage(page - 1); }

  // Swipe táctil con bloqueo vertical solo si el gesto es horizontal
  let sx = 0, sy = 0, isSwiping = false;
  track.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    isSwiping = false; stopAuto();
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10){
      isSwiping = true; e.preventDefault();
    }
  }, { passive: false });

  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const TH = 40;
    if (Math.abs(dx) > TH) { dx > 0 ? prevPage() : nextPage(); }
    startAuto();
  }, { passive: true });

  // Flechas
  prevBtn?.addEventListener('click', prevPage);
  nextBtn?.addEventListener('click', nextPage);

  // Autoplay
  let auto = null;
  const INTERVAL = 5000;
  function startAuto(){ if (!auto) auto = setInterval(nextPage, INTERVAL); }
  function stopAuto(){ if (auto){ clearInterval(auto); auto = null; } }
  function restartAuto(){ stopAuto(); startAuto(); }

  // Layout
  function layout(){
    computePerView();
    buildDots();
    applyTransform();
    updateDots();
  }
  window.addEventListener('load', layout);
  window.addEventListener('resize', layout);

  layout();
  startAuto();
})();

/*************************************************
 * 6) Inicialización específica de "Nuestro equipo"
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("team-container")) {
    loadTeam();
    setupSearch();
  }
});
/* ==== SERVICIOS: slider robusto (fix init + clicks + auto) ==== */
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('servicesTrack');
  const prevBtn = document.getElementById('srvPrev');
  const nextBtn = document.getElementById('srvNext');
  const dotsWrap = document.getElementById('srvDots');
  const viewport = document.querySelector('.cards-viewport');

  // Si no existe la sección, salimos sin romper otras páginas
  if (!track || !viewport) return;

  const slides = Array.from(track.children);
  const total = slides.length;
  if (!total) return;

  let index = 0;
  let autoTimer = null;
  const INTERVAL = 5000;

  // Crear dots si no existen
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
    });
  }

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    if (dotsWrap) {
      [...dotsWrap.children].forEach((d, i) => d.classList.toggle('active', i === index));
    }
  }

  function goTo(i) {
    index = (i + total) % total;
    update();
    restartAuto();
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  // Flechas (si existen)
  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  // Auto-avance
  function startAuto() {
    if (!autoTimer) autoTimer = setInterval(next, INTERVAL);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function restartAuto() { stopAuto(); startAuto(); }

  // Pausa en hover (desktop)
  viewport.addEventListener('mouseenter', stopAuto);
  viewport.addEventListener('mouseleave', startAuto);

  // Swipe móvil
  let sx = 0, sy = 0, swiping = false;
  track.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    swiping = false; stopAuto();
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - sx;
    const dy = e.touches[0].clientY - sy;
    if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping = true; e.preventDefault(); // necesita passive:false
    }
  }, { passive: false });

  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) (dx < 0 ? next() : prev());
    startAuto();
  }, { passive: true });

  // Ajustes de layout si cambia el tamaño (por si el ancho afecta el transform)
  window.addEventListener('resize', () => requestAnimationFrame(update));

  // Init
  update();
  startAuto();

  // Exponer helpers de depuración (puedes quitarlos luego)
  window._srvNext = next;
  window._srvPrev = prev;
  window._srvGo   = goTo;
});

// ===== Cargar equipo desde Google Sheets (SheetDB) =====
(function () {
  // 1) Pega tu endpoint ACA:
  const SHEET_API = "https://sheetdb.io/api/v1/TU_API_KEY?sheet=Equipo";

  // 2) Elementos del DOM
  const container = document.getElementById("teamContainer");
  const searchInput = document.getElementById("searchInput");

  if (!container) return; // Solo corre en la página del equipo

  // 3) UI: estado cargando
  function setLoading(state) {
    if (state) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; color:#666;">
          Cargando equipo…
        </div>`;
    }
  }

  // 4) Render de tarjetas
  function renderCards(rows) {
    container.innerHTML = "";
    rows.forEach(m => {
      const nombre = (m.nombre || "").trim();
      const rol = (m.rol || "").trim();
      const descripcion = (m.descripcion || "").trim();
      const foto = (m.foto || "").trim();

      container.insertAdjacentHTML("beforeend", `
        <div class="team-card">
          <img src="${foto}" alt="${nombre}">
          <h3>${nombre}</h3>
          <h4>${rol}</h4>
          <p>${descripcion}</p>
        </div>
      `);
    });
  }

  // 5) Búsqueda (filtra por nombre)
  function setupSearch() {
    if (!searchInput) return;
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      const cards = container.querySelectorAll(".team-card");
      cards.forEach(card => {
        const name = card.querySelector("h3")?.textContent.toLowerCase() || "";
        card.style.display = name.includes(q) ? "" : "none";
      });
    });
  }

  // 6) Cargar datos
  async function loadTeam() {
    try {
      setLoading(true);
      // Evita caché agresivo en GitHub Pages
      const url = SHEET_API + (SHEET_API.includes("?") ? "&" : "?") + "_cb=" + Date.now();
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();

      // SheetDB devuelve un array de objetos con claves = cabeceras del sheet
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#666;">
          No hay miembros para mostrar.
        </div>`;
        return;
      }

      renderCards(data);
      setupSearch();
    } catch (err) {
      console.error("Error cargando equipo:", err);
      container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#B00020;">
        No se pudo cargar el equipo. Verifica el endpoint de SheetDB y los permisos del Sheet.
      </div>`;
    }
  }

  // Init
  loadTeam();
})();

