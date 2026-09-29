import { currentPortfolio, districts, experiments, github, landmarks, projects, skills, timeline, type DistrictId, type Landmark, type Project, type ProjectShot } from '../data/content';
import { Save, type Quality } from '../core/Save';

type Modal = 'project' | 'map' | 'quick' | 'terminal' | 'contact' | 'archive' | null;
const link = (url: string, label: string, className = 'action') => `<a class="${className}" href="${url}" target="_blank" rel="noopener noreferrer">${label}<span aria-hidden="true">↗</span></a>`;
const escapeHTML = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const brandMark = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 15 20 6l15 9v17l-15-9-15 9V15Z" fill="currentColor"/><path d="m5 15 15 9 15-9M20 6v18" stroke="var(--paper)" stroke-width="2"/></svg>`;
const projectColors = ['#61b9ae', '#b9a1e6', '#f7bc51', '#f28069', '#80b7cb', '#99bc81', '#d991c5', '#b8acdf'];

export class UI {
  onEnter = () => {};
  onClose = () => {};
  onMap = () => {};
  onTravel = (_id: DistrictId) => {};
  onReset = () => {};
  onInteract = () => {};
  onQuality = (_quality: Quality | 'auto') => {};
  onAudio = (_on: boolean) => {};
  activeModal: Modal = null;
  private root: HTMLElement;
  private nearest?: Landmark;
  private booted = false;
  private fallback = false;
  private toastTimer = 0;
  private hintTimer = 0;
  private lastFocus?: HTMLElement;
  private activeShots: ProjectShot[] = [];
  private shotIndex = 0;

  constructor(private save: Save) {
    this.root = document.querySelector<HTMLElement>('#app')!;
    this.root.innerHTML = `
      <div id="world" aria-hidden="true"></div>
      <div class="grain" aria-hidden="true"></div>
      <div class="boot" id="boot">
        <div class="boot-top"><div class="boot-brand"><span class="brand-symbol">${brandMark}</span><span>MOHAMED ALI JEMMALI<br><small>INDEPENDENT WORLDS. USEFUL THINGS.</small></span></div><span class="boot-location">MAHDIA, TUNISIA<span>AN INTERACTIVE PORTFOLIO / 2026</span></span></div>
        <div class="boot-main"><p class="eyebrow"><span class="status-dot"></span> OPEN FOR EXPLORATION <span class="edition">EDITION 02</span></p><h1>BUILD<br><em>WORLD<span class="title-dot">.</span></em></h1><div class="boot-description"><span class="boot-arrow" aria-hidden="true">↳</span><div><p class="boot-sub">A little island.<br>A world of things I build.</p><p class="boot-disciplines">SOFTWARE · AI & VISION · GAMES</p></div></div><div class="boot-actions"><button class="primary" id="enter">LET’S EXPLORE <span aria-hidden="true">↗</span></button><button class="text-button" id="boot-quick">QUICK VIEW <span>Skip to the portfolio ↗</span></button></div><p class="boot-drive-note"><span aria-hidden="true">✳</span> YOUR ROVER IS READY. TAKE ANY TURN.</p></div>
        <aside class="boot-postcard" aria-label="World overview"><div class="postcard-top"><span>YOUR NEXT DETOUR</span><span aria-hidden="true">↗</span></div><strong>BUILT TO<br>BE EXPLORED.</strong><div class="postcard-stats"><span><b>07</b>DISTRICTS</span><span><b>${String(projects.length).padStart(2, '0')}</b>PROJECTS</span><span><b>∞</b>CURIOSITY</span></div><span class="postcard-line">GET IN. GET CURIOUS.</span></aside>
        <div class="boot-footer"><div class="district-strip" aria-label="Explore seven districts">${districts.map((d, i) => `<span><i style="--district-color:${['#ec7959', '#61b9ae', '#a7c884', '#f4bc50', '#e8a8bb', '#b4a0db', '#8ec8d4'][i]}"></i>${String(i + 1).padStart(2, '0')} ${d.name.replace(' DISTRICT', '')}</span>`).join('')}</div><div class="boot-colophon"><span>SCROLL LESS. EXPLORE MORE.</span><span>© 2026 MAJ</span></div></div>
      </div>
      <div class="hud" id="hud" hidden>
        <header class="hud-top"><div class="hud-brand"><span class="brand-symbol">${brandMark}</span><span>MOHAMED ALI JEMMALI<small><span class="status-dot"></span> BUILD WORLD / V2</small></span></div><div class="hud-actions"><button id="quick-btn" title="Accessible quick view">PORTFOLIO <span aria-hidden="true">↗</span></button><button id="map-btn" title="Open map (M)">MAP <kbd>M</kbd></button><button id="sound-btn" title="Toggle sound">SOUND OFF</button></div></header>
        <div class="district-callout" id="district-callout"><span id="district-kicker">01 / ARRIVAL</span><strong id="district-name">THE GATE</strong><span id="district-sub">DISCOVER THE WORLD</span></div>
        <div class="prompt" id="prompt" hidden><span class="prompt-key">E</span><div><small id="prompt-kicker">DISCOVER</small><strong id="prompt-title">THE GATE</strong></div><button id="prompt-open">EXPLORE ↗</button></div>
        <div class="scan" id="scan" hidden><span>◇ &nbsp; OBJECT DETECTED</span><strong>VEHICLE / 99.7%</strong><small>ARTISTIC SCAN · NO DATA CAPTURED</small></div>
        <div class="hud-bottom"><div class="rover-dashboard"><div class="speed"><small>ROVER / SPEED</small><div><strong id="speed">00</strong><span>KM/H</span></div></div><div class="world-stat"><small>WORLD DISCOVERED</small><strong id="percentage">0%</strong><span class="progress-track"><i id="progress-fill"></i></span></div><div class="tokens"><small>BUILD TOKENS</small><strong><span class="token-icon" aria-hidden="true">◇</span> <span id="tokens">0 / 5</span></strong></div></div><div class="controls-short"><span><kbd>W A S D</kbd> DRIVE</span><span><kbd>SHIFT</kbd> BOOST</span><span><kbd>SPACE</kbd> BRAKE</span><span><kbd>R</kbd> RESET</span></div></div>
        <div class="controls-hint" id="controls-hint"><span class="hint-icon" aria-hidden="true">↗</span><div><strong>THE ISLAND IS YOURS.</strong><span>WASD / ARROWS — DRIVE &nbsp; SPACE — BRAKE &nbsp; SHIFT — BOOST<br>R — RESET &nbsp; M — MAP &nbsp; E — EXPLORE A PROJECT</span></div></div>
        <div class="touch-controls" aria-label="Touch driving controls"><div class="touch-steer"><button data-drive="left" aria-label="Steer left">◀</button><button data-drive="right" aria-label="Steer right">▶</button></div><div class="touch-move"><button data-drive="boost" aria-label="Boost">↟<small>BOOST</small></button><button data-drive="forward" aria-label="Accelerate">▲<small>GO</small></button><button data-drive="brake" aria-label="Brake">▮▮<small>BRAKE</small></button><button data-drive="reverse" aria-label="Reverse">▼<small>REV</small></button></div><button class="touch-interact" id="touch-interact" aria-label="Interact">E</button></div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      <div class="modal-backdrop" id="modal-backdrop" hidden><section class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" id="close-modal" aria-label="Close">×</button><div id="modal-content"></div></section></div>
    `;
    this.id('enter').addEventListener('click', () => this.enter());
    this.id('boot-quick').addEventListener('click', () => this.openQuick());
    this.id('quick-btn').addEventListener('click', () => this.openQuick());
    this.id('map-btn').addEventListener('click', () => this.onMap());
    this.id('sound-btn').addEventListener('click', () => { this.save.data.audio = !this.save.data.audio; this.save.persist(); this.updateSound(); this.onAudio(this.save.data.audio); });
    this.id('prompt-open').addEventListener('click', () => this.onInteract());
    this.id('touch-interact').addEventListener('click', () => this.onInteract());
    this.id('close-modal').addEventListener('click', () => this.close());
    this.id('modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) this.close(); });
    this.id('modal').addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      if (e.key === 'Tab') this.trapFocus(e);
      if (this.activeModal === 'project' && this.activeShots.length > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); this.showShot(this.shotIndex + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });
    this.updateSound(); this.updateProgress();
  }

  private id(id: string) { return document.getElementById(id)!; }
  private trapFocus(e: KeyboardEvent) {
    const items = [...this.id('modal').querySelectorAll<HTMLElement>('button, a, input, select, [tabindex]:not([tabindex="-1"])')].filter(el => !el.hasAttribute('disabled'));
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  enter() { if (this.fallback) { this.openQuick(); return; } if (this.booted) return; this.booted = true; this.id('boot').classList.add('leaving'); this.id('hud').hidden = false; window.setTimeout(() => { this.id('boot').hidden = true; }, 650); this.hintTimer = window.setTimeout(() => this.id('controls-hint').classList.add('gone'), 7000); this.onEnter(); }
  showFallback() { this.fallback = true; this.id('enter').textContent = 'VIEW PORTFOLIO'; this.toast('3D is unavailable here. Quick View contains the complete portfolio.'); }
  setDistrict(id: string) {
    const d = districts.find(item => item.id === id)!;
    this.id('district-kicker').textContent = d.short; this.id('district-name').textContent = d.name;
    this.id('district-sub').textContent = id === 'tower' ? 'THANKS FOR EXPLORING' : 'NEW AREA DISCOVERED';
    const el = this.id('district-callout'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    this.updateProgress();
  }
  setNearby(landmark?: Landmark) {
    this.nearest = landmark;
    const prompt = this.id('prompt'); prompt.hidden = !landmark || !!this.activeModal;
    if (landmark) { this.id('prompt-kicker').textContent = landmark.kicker; this.id('prompt-title').textContent = landmark.title; }
  }
  setScan(on: boolean) { this.id('scan').hidden = !on; }
  update(speed: number) { this.id('speed').textContent = String(Math.round(Math.abs(speed) * 6.8)).padStart(2, '0'); }
  updateProgress() { this.id('percentage').textContent = `${Math.min(100, this.save.percentage)}%`; (this.id('progress-fill') as HTMLElement).style.width = `${Math.min(100, this.save.percentage)}%`; this.id('tokens').textContent = `${this.save.data.tokens.length} / 5`; }
  private updateSound() { this.id('sound-btn').textContent = `SOUND ${this.save.data.audio ? 'ON' : 'OFF'}`; this.id('sound-btn').setAttribute('aria-pressed', String(this.save.data.audio)); }
  toast(message: string) { const el = this.id('toast'); el.textContent = message; el.classList.add('show'); window.clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 3500); }
  openNearby() {
    const l = this.nearest; if (!l) return false;
    this.save.discover(l.id); this.updateProgress();
    if (l.project) this.openProject(l.project);
    else if (l.id === 'terminal') this.openTerminal();
    else if (l.id === 'contact') this.openContact();
    else if (l.id === 'timeline') this.openArchive();
    else this.openQuick();
    return true;
  }
  private open(type: Modal, html: string) {
    if (!this.activeModal) this.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.id('boot').inert = true; this.id('hud').inert = true;
    this.activeModal = type; this.id('modal').dataset.mode = type ?? ''; this.id('modal-content').innerHTML = html; this.id('modal').scrollTop = 0; this.id('modal-backdrop').hidden = false; this.id('prompt').hidden = true; document.body.classList.add('modal-open'); this.id('close-modal').focus({ preventScroll: true }); requestAnimationFrame(() => { this.id('modal').scrollTop = 0; });
  }
  close() { if (!this.activeModal) return; this.activeModal = null; this.id('modal-backdrop').hidden = true; this.id('boot').inert = false; this.id('hud').inert = false; document.body.classList.remove('modal-open'); this.setNearby(this.nearest); this.lastFocus?.focus(); this.onClose(); }
  private gallery(p: Project) {
    const shots = p.screenshots;
    if (!shots?.length) return `<div class="project-visual project-diagram" aria-label="Computer vision pipeline diagram"><span>01 / CAPTURE</span><i>→</i><span>02 / DETECT</span><i>→</i><span>03 / READ</span></div><p class="visual-note">Pipeline diagram · project screenshots are not available yet.</p>`;
    const first = shots[0];
    return `<section class="project-gallery" aria-label="${escapeHTML(p.name)} screenshots"><figure class="shot-stage"><img id="shot-image" src="${escapeHTML(first.src)}" alt="${escapeHTML(first.alt)}" decoding="async"><figcaption id="shot-caption">${escapeHTML(first.caption)}</figcaption></figure><div class="shot-controls"><span id="shot-count">01 / ${String(shots.length).padStart(2, '0')}</span><a id="shot-full" href="${escapeHTML(first.src)}" target="_blank" rel="noopener noreferrer">VIEW FULL SIZE ↗</a>${shots.length > 1 ? '<div><button type="button" id="shot-prev" aria-label="Previous screenshot">←</button><button type="button" id="shot-next" aria-label="Next screenshot">→</button></div>' : ''}</div>${shots.length > 1 ? `<div class="shot-thumbs" aria-label="Choose screenshot">${shots.map((shot, i) => `<button type="button" class="shot-thumb ${i === 0 ? 'selected' : ''}" data-shot="${i}" aria-label="Show screenshot ${i + 1}: ${escapeHTML(shot.caption)}" aria-pressed="${i === 0}"><img src="${escapeHTML(shot.src)}" alt="" loading="eager"></button>`).join('')}</div>` : ''}</section>`;
  }
  private showShot(index: number) {
    if (!this.activeShots.length) return;
    this.shotIndex = (index + this.activeShots.length) % this.activeShots.length;
    const shot = this.activeShots[this.shotIndex];
    const image = this.id('shot-image') as HTMLImageElement;
    image.src = shot.src; image.alt = shot.alt;
    (this.id('shot-full') as HTMLAnchorElement).href = shot.src;
    this.id('shot-caption').textContent = shot.caption;
    this.id('shot-count').textContent = `${String(this.shotIndex + 1).padStart(2, '0')} / ${String(this.activeShots.length).padStart(2, '0')}`;
    this.id('modal').querySelectorAll<HTMLButtonElement>('[data-shot]').forEach((button, i) => { button.classList.toggle('selected', i === this.shotIndex); button.setAttribute('aria-pressed', String(i === this.shotIndex)); });
  }
  openProject(id: string) {
    const p = projects.find(item => item.id === id); if (!p) return;
    this.save.discover(id); this.updateProgress();
    this.activeShots = p.screenshots ?? []; this.shotIndex = 0;
    this.open('project', `<button class="back-index" id="project-index">← ALL PROJECTS</button><p class="modal-kicker">SELECTED WORK / ${escapeHTML(p.category.toUpperCase())}</p><h2 id="modal-title">${escapeHTML(p.name)}</h2><p class="modal-lead">${escapeHTML(p.description)}</p><div class="modal-actions project-primary-actions">${p.live ? link(p.live, 'OPEN LIVE PROJECT') : ''}${p.source ? link(p.source, 'VIEW SOURCE', 'action outline') : ''}</div>${this.gallery(p)}${p.details ? `<ul class="detail-list">${p.details.map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ul>` : ''}<div class="project-stack"><p class="section-label">BUILT WITH</p><div class="stack">${p.stack.map(s => `<span>${escapeHTML(s)}</span>`).join('')}</div></div><p class="modal-foot"><span>MOHAMED ALI JEMMALI / BUILD WORLD</span><span>KEEP EXPLORING ↗</span></p>`);
    this.id('modal').style.setProperty('--project-accent', projectColors[projects.indexOf(p) % projectColors.length]);
    this.id('project-index').addEventListener('click', () => this.openQuick());
    this.id('shot-prev')?.addEventListener('click', () => this.showShot(this.shotIndex - 1));
    this.id('shot-next')?.addEventListener('click', () => this.showShot(this.shotIndex + 1));
    this.id('modal').querySelectorAll<HTMLButtonElement>('[data-shot]').forEach(button => button.addEventListener('click', () => this.showShot(Number(button.dataset.shot))));
  }
  openMap(x = 0, z = 18, angle = Math.PI) {
    angle = Math.PI - angle;
    const marker = (px: number, pz: number) => `left:${50 + px * .68}%;top:${50 + pz * .68}%`;
    this.open('map', `<p class="modal-kicker">NAVIGATION / WORLD ATLAS</p><h2 id="modal-title">A LITTLE ISLAND.<br>A LOT TO FIND<span class="title-dot">.</span></h2><p class="modal-lead">Take the scenic route, or jump straight to a district.</p><div class="map-layout"><div class="map-art" aria-label="Map of seven districts"><div class="map-road"></div>${districts.map((d, i) => `<div class="map-node ${this.save.data.visited.includes(d.id) ? 'visited' : ''}" style="${marker(d.x, d.z)}"><span>${String(i + 1).padStart(2, '0')}</span></div>`).join('')}<div class="map-you" id="map-you" style="${marker(x, z)};transform:translate(-50%,-50%) rotate(${angle}rad)">▲</div></div><div class="map-list"><p class="map-head">CHOOSE YOUR NEXT STOP <b>▲</b></p>${districts.map((d, i) => `<button type="button" class="map-destination" data-travel="${d.id}" aria-label="Visit ${escapeHTML(d.name)}"><span>${String(i + 1).padStart(2, '0')} / ${d.name}<i>${this.save.data.visited.includes(d.id) ? '● VISITED' : '○ UNEXPLORED'}</i></span><b>VISIT ↗</b></button>`).join('')}<p class="map-count">WORLD DISCOVERED <strong>${Math.min(100, this.save.percentage)}%</strong></p><p class="map-count">BUILD TOKENS <strong>${this.save.data.tokens.length} / 5</strong></p></div></div><p class="modal-foot"><span>THE ROADS FORM A LOOP. TAKE ANY TURN.</span><span>YOUR ROVER IS MARKED ▲</span></p>`);
    this.id('modal').querySelectorAll<HTMLButtonElement>('[data-travel]').forEach(button => {
      button.addEventListener('click', () => this.onTravel(button.dataset.travel as DistrictId));
    });
  }
  openArchive() { this.open('archive', `<p class="modal-kicker">05 / THE JOURNEY</p><h2 id="modal-title">DRIVE THROUGH TIME</h2><div class="timeline">${timeline.map(t => `<div><span>${escapeHTML(t.year)}</span><div><h3>${escapeHTML(t.title)}</h3><p>${escapeHTML(t.text)}</p></div></div>`).join('')}</div>`); }
  openContact() { this.open('contact', `<p class="modal-kicker">07 / SIGNAL TOWER</p><h2 id="modal-title">SIGNAL RECEIVED.</h2><p class="modal-lead">Mohamed Ali Jemmali is open to opportunities in software engineering, full-stack development, AI and computer vision, and game development.</p><div class="modal-actions">${link(github, 'VIEW GITHUB')}${link(currentPortfolio, 'CURRENT PORTFOLIO', 'action outline')}</div><p class="modal-foot">THANKS FOR EXPLORING. THE ROAD STAYS OPEN.</p>`); }
  openTerminal() {
    this.open('terminal', `<p class="modal-kicker">06 / EXPERIMENT STATION</p><h2 id="modal-title">THE LAB TERMINAL</h2><div class="terminal-output" id="terminal-output" aria-live="polite"><p>BUILD WORLD OS / TERMINAL 06</p><p>Type <b>help</b> to see available commands.</p></div><form id="terminal-form" class="terminal-form"><label for="terminal-input">&gt;</label><input id="terminal-input" autocomplete="off" spellcheck="false" aria-label="Terminal command" /><button type="submit">RUN ↵</button></form>`);
    const form = this.id('terminal-form') as HTMLFormElement, input = this.id('terminal-input') as HTMLInputElement, output = this.id('terminal-output');
    form.addEventListener('submit', e => { e.preventDefault(); const command = input.value.trim().toLowerCase(); input.value = ''; if (!command) return; const row = document.createElement('p'); row.textContent = `> ${command}`; output.append(row); if (command === 'clear') { output.innerHTML = ''; return; } const answer = document.createElement('p'); answer.textContent = this.command(command); output.append(answer); output.scrollTop = output.scrollHeight; });
    input.focus();
  }
  private command(command: string) {
    if (command === 'help') return 'help · whoami · projects · skills · github · contact · sudo hire-me · clear';
    if (command === 'whoami') return 'Mohamed Ali Jemmali. Engineering student, full-stack builder, vision tinkerer, game developer. Currently in Mahdia, Tunisia.';
    if (command === 'projects') return `Featured: ${projects.map(p => p.name).join(', ')}. Lab: ${experiments.join(', ')}.`;
    if (command === 'skills') return skills.join(' · ');
    if (command === 'github') return github;
    if (command === 'contact') return `Visit the Signal Tower, or find Mohamed at ${github}`;
    if (command === 'sudo hire-me') return 'Permission granted. Excellent decision. Find the Signal Tower to establish contact.';
    if (command === 'rm -rf /') return 'Nice try. The world has backups, and the rover has feelings.';
    if (command === 'ship it') return 'Already shipped. Keep driving.';
    return `Command not found: ${command}. Try help.`;
  }
  openQuick() {
    this.open('quick', `
      <div class="quick-intro"><p class="modal-kicker">THE PORTFOLIO / AT YOUR OWN PACE</p><h2 id="modal-title">MOHAMED<br>ALI JEMMALI<span class="title-dot">.</span></h2><div class="quick-intro-bottom"><p class="modal-lead">Software engineering student in Mahdia, Tunisia. I build useful software, AI systems, tools, and games.</p><span class="quick-stamp" aria-hidden="true">MAJ<br><small>BUILD / EXPLORE</small></span></div></div>
      <nav class="quick-nav" aria-label="Portfolio sections"><a href="#quick-projects">01 / WORK</a><a href="#quick-experience">02 / EXPERIENCE</a><a href="#quick-education">03 / EDUCATION</a><a href="#quick-skills">04 / TOOLBOX</a><a href="#quick-contact">05 / CONTACT</a></nav>
      <section id="quick-projects" class="quick-section"><div class="section-heading"><h3>SELECTED WORK</h3><span>${String(projects.length).padStart(2, '0')} PROJECTS / MANY DIFFERENT WORLDS</span></div><div class="quick-project-grid">${projects.map((p, i) => `<article class="quick-project-card" style="--card-accent:${projectColors[i % projectColors.length]}"><button class="quick-cover" data-open-project="${p.id}" aria-label="Explore ${escapeHTML(p.name)}">${p.screenshots?.[0] ? `<img class="quick-preview" src="${escapeHTML(p.screenshots[0].src)}" alt="${escapeHTML(p.screenshots[0].alt)}" loading="lazy" decoding="async">` : `<span class="quick-placeholder" aria-hidden="true"><span class="vision-target"><i></i><b>93.3<small>%</small></b></span><span>CAPTURE → DETECT → READ</span></span>`}<span class="quick-card-number">${String(i + 1).padStart(2, '0')}</span><span class="quick-cover-arrow" aria-hidden="true">↗</span></button><div class="quick-card-copy"><small>${escapeHTML(p.category.toUpperCase())}</small><h4>${escapeHTML(p.name)}</h4><p>${escapeHTML(p.description)}</p><p class="quick-stack">${p.stack.map(escapeHTML).join(' · ')}</p></div><div class="quick-links"><button type="button" class="text-link gallery-link" data-open-project="${p.id}">VIEW PROJECT <span aria-hidden="true">↗</span></button>${p.live ? link(p.live, 'LIVE', 'text-link') : ''}${p.source ? link(p.source, 'SOURCE', 'text-link') : ''}</div></article>`).join('')}</div></section>
      <section id="quick-experience" class="quick-section"><div class="section-heading"><h3>EXPERIENCE</h3><span>BUILDING IN THE REAL WORLD</span></div>${timeline.filter(t => ['QUETATECH', 'ACOBA', 'IN2 TECHNOLOGIES'].includes(t.title)).map(t => `<article class="quick-history"><small>${escapeHTML(t.year)}</small><div><h4>${escapeHTML(t.title)}</h4><p>${escapeHTML(t.text)}</p></div><span aria-hidden="true">↗</span></article>`).join('')}</section>
      <section id="quick-education" class="quick-section"><div class="section-heading"><h3>EDUCATION</h3><span>ALWAYS LEARNING</span></div>${timeline.filter(t => ['ISET MAHDIA', 'TEK-UP UNIVERSITY'].includes(t.title)).map(t => `<article class="quick-history"><small>${escapeHTML(t.year)}</small><div><h4>${escapeHTML(t.title)}</h4><p>${escapeHTML(t.text)}</p></div><span aria-hidden="true">↗</span></article>`).join('')}</section>
      <section id="quick-skills" class="quick-section"><div class="section-heading"><h3>THE TOOLBOX</h3><span>SKILLS & EXPERIMENTS</span></div><div class="stack skill-stack">${skills.map(skill => `<span>${escapeHTML(skill)}</span>`).join('')}</div><p class="section-label">ALSO ON THE WORKBENCH</p><p class="experiment-list">${experiments.map(escapeHTML).join(' / ')}</p></section>
      <section id="quick-contact" class="quick-section quick-contact"><p class="modal-kicker">GOT SOMETHING IN MIND?</p><h3>LET’S BUILD<br>SOMETHING<span class="title-dot">.</span></h3><p>Open to opportunities in software engineering, full-stack, AI / computer vision, and game development.</p><div class="modal-actions">${link(github, 'FIND ME ON GITHUB')}${link(currentPortfolio, 'CURRENT PORTFOLIO', 'action outline')}</div></section>
      <div class="settings"><h3>WORLD SETTINGS</h3><label>GRAPHICS QUALITY <select id="quality-select" aria-label="Graphics quality"><option value="auto">AUTO</option><option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option></select></label><button id="reset-progress" class="danger">RESET EXPLORATION PROGRESS</button></div><p class="modal-foot"><span>© 2026 MOHAMED ALI JEMMALI</span><span>BUILD WORLD / V2</span></p>`);
    this.id('quick-projects').querySelectorAll<HTMLButtonElement>('[data-open-project]').forEach(button => {
      button.addEventListener('click', () => this.openProject(button.dataset.openProject!));
    });
    const select = this.id('quality-select') as HTMLSelectElement; select.value = this.save.data.quality;
    select.addEventListener('change', () => { this.save.data.quality = select.value as Quality | 'auto'; this.save.persist(); this.onQuality(this.save.data.quality); });
    this.id('reset-progress').addEventListener('click', () => { this.save.reset(); this.updateProgress(); this.toast('Exploration progress reset.'); this.onReset(); });
  }
}
