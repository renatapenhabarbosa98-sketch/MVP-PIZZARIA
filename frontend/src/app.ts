/// <reference path="./types.ts" />

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const APP: AppState = {
  auth: {
    token: localStorage.getItem('authToken') || null,
    usuario: null,
  },
  config: {
    nome: 'Pizzaria MVP', logo: '', cor: '#C8340A', numMesas: 10, tema: 'light', fonteTamanho: 14,
  },
  cardapio: [],
  mesas: [],
  pedidos: [],
  clientes: [],
  pagamentos: [],
  nextId: { pedido: 1, cliente: 1 },
  currentPage: 'dashboard',
  editingItem: null,
  editingCliente: null,
  pedidoTemp: { items: [], tipo: 'salao', mesaId: null, clienteId: null },
  fecharPedidoId: null,
  kdsTimers: {},
};

// Init mesas
function initMesas(): void {
  APP.mesas = [];
  for (let i = 1; i <= APP.config.numMesas; i++) {
    APP.mesas.push({ id: i, numero: i, capacidade: 4, status: 'livre', horaAbertura: null });
  }
}
initMesas();

// Persist
function saveStorage(): void {
  try {
    localStorage.setItem('pizzaria_app', JSON.stringify({
      config: APP.config, cardapio: APP.cardapio, mesas: APP.mesas,
      pedidos: APP.pedidos, clientes: APP.clientes, pagamentos: APP.pagamentos,
      nextId: APP.nextId,
    }));
  } catch (e) {}
}

function loadStorage(): void {
  try {
    const d = JSON.parse(localStorage.getItem('pizzaria_app') || 'null');
    if (!d) return;
    Object.assign(APP.config, d.config || {});
    APP.config.numMesas = APP.config.numMesas || APP.config.mesas || 10;
    APP.config.tema = APP.config.tema || (localStorage.getItem('theme') as Tema) || 'light';
    APP.config.fonteTamanho = Number(APP.config.fonteTamanho || 14);
    if (d.cardapio)                    APP.cardapio = d.cardapio;
    if (d.mesas && d.mesas.length > 0) APP.mesas    = d.mesas;
    if (d.pedidos)                     APP.pedidos  = d.pedidos;
    if (d.clientes)   APP.clientes   = d.clientes;
    if (d.pagamentos) APP.pagamentos = d.pagamentos;
    if (d.nextId)     APP.nextId     = d.nextId;
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

loadStorage();
let darkMode: boolean = APP.config.tema === 'dark';

function applyTheme(): void {
  APP.config.tema = darkMode ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  (document.getElementById('themeIconSun') as HTMLElement).style.display  = darkMode ? 'none'  : 'block';
  (document.getElementById('themeIconMoon') as HTMLElement).style.display = darkMode ? 'block' : 'none';
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  saveStorage();
}
applyTheme();
(document.getElementById('themeBtn') as HTMLElement).onclick = () => {
  darkMode = !darkMode; applyTheme(); salvarConfigServidor(false);
};

/* ══════════════════════════════════════════════════════
   ROUTING
══════════════════════════════════════════════════════ */
const pages: Record<string, () => string> = { dashboard, mesas, pedidos, kds, cardapio, clientes, caixa, config, usuarios };
const titles: Record<string, string> = {
  dashboard: 'Dashboard', mesas: 'Controle de Mesas', pedidos: 'Gestão de Pedidos',
  kds: 'KDS – Tela da Cozinha', cardapio: 'Cardápio', clientes: 'Clientes',
  caixa: 'Caixa do Dia', config: 'Configurações', usuarios: 'Usuários do Sistema',
};
const paginasPorPapel: Record<string, string[]> = {
  admin:   ['dashboard', 'mesas', 'pedidos', 'kds', 'cardapio', 'clientes', 'caixa', 'config', 'usuarios'],
  garcom:  ['dashboard', 'mesas', 'pedidos', 'kds', 'cardapio'],
  cozinha: ['dashboard', 'mesas', 'pedidos', 'kds', 'cardapio'],
};

function navigate(page: string): void {
  const papel = APP.auth.usuario?.papel;
  if (papel && papel !== 'admin') {
    if (!(paginasPorPapel[papel] || []).includes(page)) return;
  }
  APP.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.page === page);
  });
  (document.getElementById('pageTitle') as HTMLElement).textContent = titles[page] || page;
  render();
  if (page === 'mesas') recarregarMesas().then(() => render());
}

function render(): void {
  const fn = pages[APP.currentPage];
  (document.getElementById('content') as HTMLElement).innerHTML = fn
    ? fn()
    : '<div class="empty"><h3>Página não encontrada</h3></div>';
  afterRender();
}

function afterRender(): void {
  updateBadge();
  document.querySelectorAll('[data-nav]').forEach(el => {
    (el as HTMLElement).onclick = () => navigate((el as HTMLElement).dataset.nav!);
  });
  afterRenderUsuarios();
}

document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  (el as HTMLElement).onclick = () => navigate((el as HTMLElement).dataset.page!);
});

/* ══════════════════════════════════════════════════════
   SIDEBAR TOGGLE
══════════════════════════════════════════════════════ */
let sidebarCollapsed: boolean = false;
(document.getElementById('toggleSidebar') as HTMLElement).onclick = () => {
  sidebarCollapsed = !sidebarCollapsed;
  (document.getElementById('sidebar') as HTMLElement).classList.toggle('collapsed', sidebarCollapsed);
  (document.getElementById('collapseIcon') as HTMLElement).style.transform = sidebarCollapsed ? 'rotate(180deg)' : '';
};
if (window.innerWidth <= 700) {
  (document.getElementById('mobileSidebarToggle') as HTMLElement).style.display = 'flex';
}
(document.getElementById('mobileSidebarToggle') as HTMLElement).onclick = () => {
  (document.getElementById('sidebar') as HTMLElement).classList.toggle('mobile-open');
};
(document.getElementById('newPedidoBtn') as HTMLElement).onclick = openModalPedido;

/* ══════════════════════════════════════════════════════
   MODAIS HELPERS
══════════════════════════════════════════════════════ */
function openModal(id: string): void {
  (document.getElementById(id) as HTMLElement).classList.add('open');
}
function closeModal(id: string): void {
  (document.getElementById(id) as HTMLElement).classList.remove('open');
}
document.querySelectorAll('[data-close]').forEach(el => {
  (el as HTMLElement).onclick = () => closeModal((el as HTMLElement).dataset.close!);
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  (overlay as HTMLElement).onclick = (e: MouseEvent) => {
    if (e.target === overlay) closeModal((overlay as HTMLElement).id);
  };
});

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function toast(msg: string, type: ToastTipo = 'info'): void {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  (document.getElementById('toast-container') as HTMLElement).appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
function money(v: number): string {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}
function elapsed(t: number): string {
  const s = Math.floor((Date.now() - t) / 1000);
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
function statusLabel(s: StatusMesa): string {
  const map: Record<StatusMesa, string> = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada' };
  return map[s] || s;
}
function statusBadge(s: StatusMesa): string {
  const map: Record<StatusMesa, string> = { livre: 'badge-green', ocupada: 'badge-red', reservada: 'badge-amber' };
  return map[s] || 'badge-gray';
}
function pedStatusLabel(s: string): string {
  const map: Record<string, string> = {
    'Em preparo': 'Em preparo', 'Saiu para entrega': 'Saiu p/ entrega',
    'Servido': 'Servido', 'Finalizado': 'Finalizado',
  };
  return map[s] || s;
}
function pedStatusBadge(s: string): string {
  const map: Record<string, string> = {
    'Em preparo': 'badge-amber', 'Saiu para entrega': 'badge-blue',
    'Servido': 'badge-blue', 'Finalizado': 'badge-green',
  };
  return map[s] || 'badge-gray';
}
function updateBadge(): void {
  const ativos = APP.pedidos.filter(p => p.status !== 'Finalizado').length;
  (document.getElementById('badgePedidos') as HTMLElement).textContent = String(ativos);
}
function pedTotalCalc(items: ItemPedido[]): number {
  return items.reduce((s, i) => s + i.preco * i.qtd, 0);
}
function fmtDate(ts: number): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  } as Record<string, string>)[ch] ?? ch);
}

/* ══════════════════════════════════════════════════════
   BRANDING
══════════════════════════════════════════════════════ */
function applyBranding(): void {
  (document.getElementById('brandName') as HTMLElement).textContent = APP.config.nome;
  const logo = APP.config.logo;
  const wrap = document.getElementById('logoWrap') as HTMLElement;
  if (logo) {
    wrap.innerHTML = `<img src="${escapeHtml(logo)}" alt="logo" onerror="this.style.display='none'">`;
  } else {
    const inicial = (APP.config.nome || 'P')[0].toUpperCase();
    wrap.innerHTML = `<div class="default-logo" id="defaultLogo" style="background:${APP.config.cor}">${escapeHtml(inicial)}</div>`;
  }
  document.documentElement.style.setProperty('--accent', APP.config.cor);
  const r = parseInt(APP.config.cor.slice(1, 3), 16);
  const g = parseInt(APP.config.cor.slice(3, 5), 16);
  const b = parseInt(APP.config.cor.slice(5, 7), 16);
  document.documentElement.style.setProperty('--accent2', lightenHex(APP.config.cor, 20));
  document.documentElement.style.setProperty('--accentbg', `rgba(${r},${g},${b},0.08)`);
}
function applyFontSize(): void {
  const size = Math.min(20, Math.max(12, Number(APP.config.fonteTamanho) || 14));
  APP.config.fonteTamanho = size;
  document.documentElement.style.setProperty('--app-font-size', `${size}px`);
}
function lightenHex(hex: string, amt: number): string {
  let r = parseInt(hex.slice(1, 3), 16) + amt;
  let g = parseInt(hex.slice(3, 5), 16) + amt;
  let b = parseInt(hex.slice(5, 7), 16) + amt;
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
applyBranding();
applyFontSize();

function configPayload(): ConfigPayload {
  return {
    nome: APP.config.nome, logo: APP.config.logo || '', cor: APP.config.cor,
    mesas: APP.config.numMesas, tema: APP.config.tema || (darkMode ? 'dark' : 'light'),
    fonteTamanho: APP.config.fonteTamanho,
  };
}
function apiUrl(path: string): string {
  return path;
}
function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((opts.headers as Record<string, string>) || {}) };
  if (APP.auth.token) headers['X-Auth-Token'] = APP.auth.token;
  return fetch(apiUrl(path), { ...opts, headers }).then(resp => {
    if (resp.status === 401) {
      APP.auth.token = null;
      APP.auth.usuario = null;
      localStorage.removeItem('authToken');
      mostrarLogin();
    }
    return resp;
  });
}
function normalizeCardapioItem(item: ApiCardapioItem): ItemCardapio {
  return {
    id: Number(item.id), nome: item.nome,
    tipo: (item.tipo || 'pizza') as 'pizza' | 'bebida',
    tamanho: item.tamanho || item.tam || '',
    preco: Number(item.preco), ativo: item.ativo !== false,
  };
}
function aplicarConfigServidor(d: ApiConfigResponse | null): void {
  if (!d) return;
  APP.config.nome = d.nome || APP.config.nome;
  APP.config.logo = d.logo || '';
  APP.config.cor  = d.cor  || APP.config.cor;
  APP.config.numMesas     = Number(d.mesas || d.numMesas || APP.config.numMesas || 10);
  APP.config.tema         = (d.tema || APP.config.tema || 'light') as Tema;
  APP.config.fonteTamanho = Number(d.fonteTamanho || APP.config.fonteTamanho || 14);
  darkMode = APP.config.tema === 'dark';
  saveStorage(); applyTheme(); applyBranding(); applyFontSize();
}
async function carregarConfigServidor(): Promise<void> {
  try {
    const resp = await apiFetch('/api/config/');
    if (!resp.ok) return;
    aplicarConfigServidor(await resp.json() as ApiConfigResponse);
  } catch (e) {}
}
async function carregarDados(): Promise<void> {
  try {
    const [cardapioR, mesasR, pedidosR, clientesR, pagamentosR] = await Promise.all([
      apiFetch('/api/cardapio/'),
      apiFetch('/api/mesas/'),
      apiFetch('/api/pedidos/'),
      apiFetch('/api/clientes/'),
      apiFetch('/api/pagamentos/'),
    ]);
    if (cardapioR.ok) APP.cardapio = (await cardapioR.json() as ApiCardapioItem[]).map(normalizeCardapioItem);
    if (mesasR.ok) { const m = await mesasR.json(); if (m.length > 0) APP.mesas = m; }
    if (pedidosR.ok)  APP.pedidos    = await pedidosR.json();
    if (clientesR.ok) APP.clientes   = await clientesR.json();
    if (pagamentosR.ok) APP.pagamentos = await pagamentosR.json();
    saveStorage();
  } catch (e) {
    console.error('Erro ao carregar dados do servidor:', e);
  }
}
async function salvarConfigServidor(showToast: boolean = true): Promise<void> {
  try {
    const resp = await apiFetch('/api/config/', { method: 'PUT', body: JSON.stringify(configPayload()) });
    if (!resp.ok) throw new Error('Falha ao salvar');
    aplicarConfigServidor(await resp.json() as ApiConfigResponse);
    if (showToast) toast('Configuracoes salvas e mantidas para a proxima abertura!', 'success');
  } catch (e) {
    saveStorage();
    if (showToast) toast('Salvo neste navegador. Verifique a conexao com o servidor.', 'info');
  }
}

/* ══════════════════════════════════════════════════════
   PAGES
══════════════════════════════════════════════════════ */
function dashboard(): string {
  const hoje = new Date().setHours(0, 0, 0, 0);
  const pedHoje     = APP.pagamentos.filter(p => p.data >= hoje);
  const totalHoje   = pedHoje.reduce((s, p) => s + p.valor, 0);
  const pedAtivos   = APP.pedidos.filter(p => p.status !== 'Finalizado').length;
  const mesasOcupadas = APP.mesas.filter(m => m.status === 'ocupada').length;
  const cardAtivos  = APP.cardapio.filter(c => c.ativo).length;

  return `
  <div class="grid-4" style="margin-bottom:16px">
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--accentbg)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
      </div>
      <div class="stat-label">Faturamento Hoje</div>
      <div class="stat-value">${money(totalHoje)}</div>
      <div class="stat-sub">${pedHoje.length} pedidos fechados</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--amberbg)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <div class="stat-label">Pedidos Ativos</div>
      <div class="stat-value">${pedAtivos}</div>
      <div class="stat-sub">em preparo ou saída</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--redbg)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><path d="M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/></svg>
      </div>
      <div class="stat-label">Mesas Ocupadas</div>
      <div class="stat-value">${mesasOcupadas}/${APP.mesas.length}</div>
      <div class="stat-sub">de ${APP.mesas.length} mesas disponíveis</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--greenbg)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      </div>
      <div class="stat-label">Itens no Cardápio</div>
      <div class="stat-value">${cardAtivos}</div>
      <div class="stat-sub">itens ativos disponíveis</div>
    </div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Pedidos Ativos</div>
        <button class="btn btn-secondary btn-sm" data-nav="pedidos">Ver todos</button>
      </div>
      ${APP.pedidos.filter(p => p.status !== 'Finalizado').length === 0
        ? '<div class="empty" style="padding:24px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><h3>Nenhum pedido ativo</h3></div>'
        : APP.pedidos.filter(p => p.status !== 'Finalizado').slice(0, 5).map(p => `
          <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div class="font-bold" style="font-size:13px">Pedido #${p.id} — Mesa ${p.mesaNum || '—'}</div>
              <div class="text-muted text-sm">${p.items.length} itens · ${money(p.total)}</div>
            </div>
            <span class="badge ${pedStatusBadge(p.status)}">${pedStatusLabel(p.status)}</span>
          </div>`).join('')}
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Status das Mesas</div>
        <button class="btn btn-secondary btn-sm" data-nav="mesas">Gerenciar</button>
      </div>
      <div class="mesa-grid" style="grid-template-columns:repeat(auto-fill,minmax(80px,1fr))">
        ${APP.mesas.slice(0, 12).map(m => `
          <div class="mesa-card ${m.status}" onclick="navigate('mesas')">
            <div class="mesa-num">${m.numero}</div>
            <div style="font-size:10px;font-weight:600;color:${m.status === 'livre' ? 'var(--green)' : m.status === 'ocupada' ? 'var(--accent)' : 'var(--amber)'}">
              ${statusLabel(m.status)}
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ── MESAS ────────────────────────────────────────── */
function mesas(): string {
  return `
  <div class="card-header" style="margin-bottom:12px">
    <div></div>
    <div class="flex gap-2">
      <span class="badge badge-green">● Livre</span>
      <span class="badge badge-red">● Ocupada</span>
      <span class="badge badge-amber">● Reservada</span>
    </div>
  </div>
  <div class="mesa-grid">
    ${APP.mesas.map(m => `
      <div class="mesa-card ${m.status}" onclick="openMesaModal(${m.id})">
        <div class="mesa-num">${m.numero}</div>
        <div class="mesa-cap">🪑 ${m.capacidade} lugares</div>
        <div style="font-size:11px;font-weight:600;color:${m.status === 'livre' ? 'var(--green)' : m.status === 'ocupada' ? 'var(--accent)' : 'var(--amber)'}">
          ${statusLabel(m.status)}
        </div>
        ${m.status === 'ocupada' && m.horaAbertura ? `<div class="mesa-time">${elapsed(m.horaAbertura)}</div>` : ''}
      </div>`).join('')}
  </div>`;
}

function openMesaModal(id: number): void {
  const m = APP.mesas.find(x => x.id === id);
  if (!m) return;
  (document.getElementById('mesaModalNum') as HTMLElement).textContent = String(m.numero);
  const pedAtivos = APP.pedidos.filter(p => p.status !== 'Finalizado' && (p.mesaId === id || p.mesaNum === m.numero));
  let body = `
  <div class="flex items-center justify-between mb-3">
    <span class="badge ${statusBadge(m.status)}">${statusLabel(m.status)}</span>
    ${m.status === 'ocupada' && m.horaAbertura ? `<span class="text-muted text-sm">Aberta há ${elapsed(m.horaAbertura)}</span>` : ''}
  </div>`;
  if (m.status === 'livre') {
    body += `<div class="flex gap-2">
      <button class="btn btn-primary" style="flex:1" onclick="mudarStatusMesa(${id},'ocupada')">Ocupar Mesa</button>
      <button class="btn btn-secondary" style="flex:1" onclick="mudarStatusMesa(${id},'reservada')">Reservar</button>
    </div>`;
  } else if (m.status === 'reservada') {
    body += `<div class="flex gap-2">
      <button class="btn btn-primary" style="flex:1" onclick="mudarStatusMesa(${id},'ocupada')">Ocupar Agora</button>
      <button class="btn btn-secondary" style="flex:1" onclick="mudarStatusMesa(${id},'livre')">Liberar</button>
    </div>`;
  } else {
    if (pedAtivos.length > 0) {
      body += `<div style="margin-bottom:12px"><strong style="font-size:13px">Pedidos nesta mesa:</strong>`;
      pedAtivos.forEach(p => {
        body += `<div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px">Pedido #${p.id} — ${money(p.total)}</div>
            <div class="text-muted text-sm">${p.items.map(i => i.nome).join(', ')}</div>
          </div>
          <span class="badge ${pedStatusBadge(p.status)}">${pedStatusLabel(p.status)}</span>
        </div>`;
      });
      body += `</div>`;
    }
    body += `<div class="flex gap-2" style="margin-top:8px">
      <button class="btn btn-success" style="flex:1" onclick="abrirFecharConta(${id})">Fechar Conta</button>
      <button class="btn btn-secondary" style="flex:1" onclick="mudarStatusMesa(${id},'livre')">Liberar Forçado</button>
    </div>`;
  }
  (document.getElementById('mesaModalBody') as HTMLElement).innerHTML = body;
  openModal('modalMesa');
}

async function mudarStatusMesa(id: number, status: StatusMesa): Promise<void> {
  const m = APP.mesas.find(x => x.id === id);
  if (!m) return;
  const statusAnterior = m.status;
  const aberturaAnterior = m.horaAbertura;
  m.status = status;
  if (status === 'ocupada') m.horaAbertura = Date.now();
  else if (status === 'livre') m.horaAbertura = null;
  closeModal('modalMesa'); render();
  try {
    const resp = await apiFetch(`/api/mesas/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({ status, abertura: m.horaAbertura }),
    });
    if (!resp.ok) throw new Error();
    saveStorage();
    toast(`Mesa ${m.numero} → ${statusLabel(status)}`, 'success');
  } catch {
    m.status = statusAnterior;
    m.horaAbertura = aberturaAnterior;
    saveStorage(); render();
    toast(`Erro ao atualizar Mesa ${m.numero}`, 'error');
  }
}

async function recarregarMesas(): Promise<void> {
  try {
    const resp = await apiFetch('/api/mesas/');
    if (resp.ok) {
      const data = await resp.json();
      if (data.length > 0) {
        APP.mesas = data;
        saveStorage();
        return;
      }
    }
  } catch {}
  if (APP.mesas.length === 0) initMesas();
}

/* ── PEDIDOS ──────────────────────────────────────── */
function pedidos(): string {
  const filter = APP._pedFilter || 'todos';
  const filtered = APP.pedidos.filter(p => {
    if (filter === 'ativos')      return p.status !== 'Finalizado';
    if (filter === 'finalizados') return p.status === 'Finalizado';
    return true;
  });
  return `
  <div class="card">
    <div class="card-header">
      <div class="tabs" style="margin:0;border:none">
        <div class="tab ${filter === 'todos' ? 'active' : ''}" onclick="setFilter('todos')">Todos</div>
        <div class="tab ${filter === 'ativos' ? 'active' : ''}" onclick="setFilter('ativos')">Ativos</div>
        <div class="tab ${filter === 'finalizados' ? 'active' : ''}" onclick="setFilter('finalizados')">Finalizados</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModalPedido()">+ Novo</button>
    </div>
    ${filtered.length === 0
      ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/></svg><h3>Nenhum pedido encontrado</h3></div>'
      : `<div class="table-wrap"><table>
          <thead><tr>
            <th>#</th><th>Mesa</th>
            <th>Itens</th><th>Total</th><th>Status</th><th>Hora</th><th>Ações</th>
          </tr></thead>
          <tbody>
          ${filtered.map(p => `
            <tr>
              <td><strong>#${p.id}</strong></td>
              <td><strong>Mesa ${p.mesaNum || '—'}</strong></td>
              <td class="text-muted">${p.items.length} item(ns)</td>
              <td><strong>${money(p.total)}</strong></td>
              <td><span class="badge ${pedStatusBadge(p.status)}">${pedStatusLabel(p.status)}</span></td>
              <td class="text-muted text-sm">${fmtDate(p.criadoEm)}</td>
              <td>
                <div class="flex gap-2">
                  ${p.status !== 'Finalizado' ? `<button class="btn btn-sm btn-secondary" onclick="avancarStatus(${p.id})">Avançar</button>` : ''}
                  ${p.status !== 'Finalizado' ? `<button class="btn btn-sm btn-success" onclick="abrirFecharContaPedido(${p.id})">Fechar</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
  </div>`;
}
function setFilter(f: string): void { APP._pedFilter = f; render(); }

async function avancarStatus(id: number): Promise<void> {
  const p = APP.pedidos.find(x => x.id === id);
  if (!p) return;
  const seq = ['Em preparo', 'Saiu para entrega', 'Servido', 'Finalizado'];
  const idx = seq.indexOf(p.status);
  if (idx < seq.length - 1) {
    p.status = seq[idx + 1];
    saveStorage(); render();
    toast(`Pedido #${p.id} → ${p.status}`, 'success');
    try {
      await apiFetch(`/api/pedidos/${id}/`, { method: 'PUT', body: JSON.stringify({ status: p.status }) });
    } catch (e) {}
  }
}

/* ── KDS ──────────────────────────────────────────── */
function kds(): string {
  const ativos = APP.pedidos.filter(p => p.status !== 'Finalizado').sort((a, b) => a.criadoEm - b.criadoEm);
  return `
  <div style="margin-bottom:12px" class="flex items-center justify-between">
    <div class="flex gap-2">
      <span class="badge badge-green">● OK (< 10min)</span>
      <span class="badge badge-amber">● Atenção (10–20min)</span>
      <span class="badge badge-red">● Atrasado (> 20min)</span>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="render()">Atualizar</button>
  </div>
  ${ativos.length === 0
    ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg><h3>Nenhum pedido na cozinha</h3><p style="font-size:13px">Todos os pedidos foram finalizados.</p></div>'
    : `<div class="kds-grid">
      ${ativos.map(p => {
        const mins = Math.floor((Date.now() - p.criadoEm) / 60000);
        const timerClass = mins < 10 ? 'ok' : mins < 20 ? 'warn' : 'late';
        const priority = mins >= 20;
        return `
        <div class="kds-ticket${priority ? ' priority' : ''}">
          <div class="kds-ticket-header">
            <div>
              <div class="kds-ticket-id">#${p.id}</div>
              <div class="text-sm text-muted">Mesa ${p.mesaNum || '—'}</div>
            </div>
            <div class="kds-timer ${timerClass}">${elapsed(p.criadoEm)}</div>
          </div>
          <div class="kds-items">
            ${p.items.map((item, i) => `
              <div class="kds-item" id="kdsitem-${p.id}-${i}">
                <div class="kds-item-qty">${item.qtd}×</div>
                <div>
                  <div>${item.nome}</div>
                  ${item.obs ? `<div class="kds-item-obs">⚠ ${item.obs}</div>` : ''}
                </div>
                <button class="btn btn-icon btn-ghost btn-sm" style="margin-left:auto;font-size:14px" onclick="toggleKdsItem(${p.id},${i})" title="Marcar pronto">✓</button>
              </div>`).join('')}
          </div>
          <div class="kds-footer">
            <span class="badge ${pedStatusBadge(p.status)}">${pedStatusLabel(p.status)}</span>
            <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="avancarStatusKds(${p.id})">
              ${p.status === 'Em preparo' ? 'Pronto!' : 'Avançar'}
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`}`;
}
function toggleKdsItem(pedId: number, idx: number): void {
  const el = document.getElementById(`kdsitem-${pedId}-${idx}`);
  if (el) el.classList.toggle('done');
}
function avancarStatusKds(id: number): void { avancarStatus(id); }

/* ── CARDÁPIO ─────────────────────────────────────── */
function cardapio(): string {
  const isAdmin = APP.auth.usuario?.papel === 'admin';
  const pizzas  = APP.cardapio.filter(i => i.tipo === 'pizza');
  const bebidas = APP.cardapio.filter(i => i.tipo === 'bebida');
  return `
  <div class="card">
    <div class="card-header">
      <div class="card-title">Cardápio</div>
      ${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="openModalItem()">+ Novo Item</button>` : ''}
    </div>
    <div class="tabs">
      <div class="tab active" onclick="switchCardTab(event,'pizza')">Pizzas</div>
      <div class="tab" onclick="switchCardTab(event,'bebida')">Bebidas</div>
    </div>
    <div id="tabPizza"><div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>Tamanho</th><th>Preço</th><th>Status</th>${isAdmin ? '<th>Ações</th>' : ''}</tr></thead>
      <tbody>${pizzas.map(i => `
        <tr>
          <td><strong>${i.nome}</strong></td>
          <td>${i.tamanho || '-'}</td>
          <td>${money(i.preco)}</td>
          <td><span class="badge ${i.ativo ? 'badge-green' : 'badge-gray'}">${i.ativo ? 'Ativo' : 'Inativo'}</span></td>
          ${isAdmin ? `<td><div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="editItem(${i.id})">Editar</button>
            <button class="btn btn-sm btn-${i.ativo ? 'danger' : 'success'}" onclick="toggleItem(${i.id})">${i.ativo ? 'Desativar' : 'Ativar'}</button>
          </div></td>` : ''}
        </tr>`).join('')}</tbody>
    </table></div></div>
    <div id="tabBebida" style="display:none"><div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>Preço</th><th>Status</th>${isAdmin ? '<th>Ações</th>' : ''}</tr></thead>
      <tbody>${bebidas.map(i => `
        <tr>
          <td><strong>${i.nome}</strong></td>
          <td>${money(i.preco)}</td>
          <td><span class="badge ${i.ativo ? 'badge-green' : 'badge-gray'}">${i.ativo ? 'Ativo' : 'Inativo'}</span></td>
          ${isAdmin ? `<td><div class="flex gap-2">
            <button class="btn btn-sm btn-secondary" onclick="editItem(${i.id})">Editar</button>
            <button class="btn btn-sm btn-${i.ativo ? 'danger' : 'success'}" onclick="toggleItem(${i.id})">${i.ativo ? 'Desativar' : 'Ativar'}</button>
          </div></td>` : ''}
        </tr>`).join('')}</tbody>
    </table></div></div>
  </div>`;
}
function switchCardTab(e: Event, tipo: string): void {
  document.querySelectorAll('#content .tab').forEach(t => t.classList.remove('active'));
  (e.target as HTMLElement).classList.add('active');
  (document.getElementById('tabPizza') as HTMLElement).style.display  = tipo === 'pizza'  ? 'block' : 'none';
  (document.getElementById('tabBebida') as HTMLElement).style.display = tipo === 'bebida' ? 'block' : 'none';
}
const PRECOS_TAMANHO: Record<string, number> = { P: 48.90, M: 58.90, G: 66.90, GG: 66.90 };
function autoPrecoTamanho(): void {
  const tipo = (document.getElementById('itemTipo') as HTMLSelectElement).value;
  const tam  = (document.getElementById('itemTamanho') as HTMLSelectElement).value;
  if (tipo !== 'pizza' || !tam) return;
  const preco = PRECOS_TAMANHO[tam];
  if (preco !== undefined) {
    (document.getElementById('itemPreco') as HTMLInputElement).value = String(preco.toFixed(2));
  }
}
function openModalItem(): void {
  APP.editingItem = null;
  (document.getElementById('modalItemTitle') as HTMLElement).textContent = 'Novo Item';
  ['itemNome', 'itemPreco'].forEach(id => ((document.getElementById(id) as HTMLInputElement).value = ''));
  (document.getElementById('itemTipo') as HTMLSelectElement).value    = 'pizza';
  (document.getElementById('itemTamanho') as HTMLSelectElement).value = 'G';
  autoPrecoTamanho();
  openModal('modalItem');
}
function editItem(id: number): void {
  const item = APP.cardapio.find(x => x.id === id);
  if (!item) return;
  APP.editingItem = id;
  (document.getElementById('modalItemTitle') as HTMLElement).textContent = 'Editar Item';
  (document.getElementById('itemNome') as HTMLInputElement).value    = item.nome;
  (document.getElementById('itemTipo') as HTMLSelectElement).value   = item.tipo;
  (document.getElementById('itemTamanho') as HTMLSelectElement).value = item.tamanho || '';
  (document.getElementById('itemPreco') as HTMLInputElement).value   = String(item.preco);
  openModal('modalItem');
}
async function salvarItem(): Promise<void> {
  const nome    = (document.getElementById('itemNome') as HTMLInputElement).value.trim();
  const tipo    = (document.getElementById('itemTipo') as HTMLSelectElement).value;
  const tamanho = (document.getElementById('itemTamanho') as HTMLSelectElement).value;
  const preco   = parseFloat((document.getElementById('itemPreco') as HTMLInputElement).value);
  if (!nome || isNaN(preco)) { toast('Preencha nome e preço', 'error'); return; }
  const payload = { nome, tipo, tam: tamanho, preco, ativo: true } as any;
  try {
    if (APP.editingItem) {
      const atual = APP.cardapio.find(x => x.id === APP.editingItem);
      payload.ativo = atual ? atual.ativo : true;
      const resp = await apiFetch(`/api/cardapio/${APP.editingItem}/`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error('Falha ao editar item');
      const item = APP.cardapio.find(x => x.id === APP.editingItem);
      if (item) Object.assign(item, normalizeCardapioItem(await resp.json()), { tamanho });
    } else {
      const resp = await apiFetch('/api/cardapio/', { method: 'POST', body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error('Falha ao criar item');
      APP.cardapio.push({ ...normalizeCardapioItem(await resp.json()), tamanho });
    }
    saveStorage(); closeModal('modalItem'); render(); toast('Item salvo com sucesso', 'success');
  } catch (e) {
    toast('Nao foi possivel salvar o item no servidor. Verifique o PostgreSQL/Django.', 'error');
  }
}
async function toggleItem(id: number): Promise<void> {
  const item = APP.cardapio.find(x => x.id === id);
  if (!item) return;
  const ativoAnterior = item.ativo;
  item.ativo = !item.ativo; saveStorage(); render();
  try {
    const resp = await apiFetch(`/api/cardapio/${id}/`, {
      method: 'PUT',
      body: JSON.stringify({ nome: item.nome, tipo: item.tipo, tam: item.tamanho, preco: item.preco, ativo: item.ativo }),
    });
    if (!resp.ok) throw new Error('Falha ao atualizar item');
  } catch (e) {
    item.ativo = ativoAnterior; saveStorage(); render();
    toast('Nao foi possivel atualizar o item no servidor.', 'error');
  }
}

/* ── CLIENTES ─────────────────────────────────────── */
function fmtDataEvento(val: string): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return val; }
}
function clientes(): string {
  return `
  <div class="card">
    <div class="card-header">
      <div class="card-title">Clientes</div>
      <button class="btn btn-primary btn-sm" onclick="openModalCliente()">+ Novo Cliente</button>
    </div>
    ${APP.clientes.length === 0
      ? '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><h3>Nenhum cliente cadastrado</h3></div>'
      : `<div class="table-wrap"><table>
          <thead><tr>
            <th>#</th><th>Nome</th><th>Telefone</th>
            <th>Mesa Reserva</th><th>Evento</th><th>Pedidos</th><th>Ações</th>
          </tr></thead>
          <tbody>${APP.clientes.map(c => `
            <tr>
              <td>${c.id}</td>
              <td><strong>${escapeHtml(c.nome)}</strong></td>
              <td>${escapeHtml(c.telefone)}</td>
              <td>${c.mesaReserva ? `<span class="badge badge-blue">Mesa ${c.mesaReserva}</span>` : '<span class="text-muted">-</span>'}</td>
              <td class="text-sm">${c.dataEvento ? `<span class="badge badge-amber">${fmtDataEvento(c.dataEvento)}</span>` : '<span class="text-muted">-</span>'}</td>
              <td>${APP.pedidos.filter(p => p.clienteId === c.id).length}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-secondary" onclick="editCliente(${c.id})">Editar</button>
                  ${c.mesaReserva ? `<button class="btn btn-sm btn-success" onclick="liberarMesaCliente(${c.id})">Liberar Mesa</button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="excluirCliente(${c.id},'${escapeHtml(c.nome)}')">Excluir</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
  </div>`;
}
function openModalCliente(): void {
  APP.editingCliente = null;
  (document.getElementById('modalClienteTitle') as HTMLElement).textContent = 'Novo Cliente';
  ['cliNome', 'cliTel', 'cliEnd', 'cliDataEvento'].forEach(id => ((document.getElementById(id) as HTMLInputElement).value = ''));
  (document.getElementById('cliMesaReserva') as HTMLInputElement).value = '';
  openModal('modalCliente');
}
function editCliente(id: number): void {
  const c = APP.clientes.find(x => x.id === id);
  if (!c) return;
  APP.editingCliente = id;
  (document.getElementById('modalClienteTitle') as HTMLElement).textContent = 'Editar Cliente';
  (document.getElementById('cliNome') as HTMLInputElement).value = c.nome;
  (document.getElementById('cliTel') as HTMLInputElement).value = c.telefone;
  (document.getElementById('cliEnd') as HTMLTextAreaElement).value = c.endereco || '';
  (document.getElementById('cliMesaReserva') as HTMLInputElement).value = c.mesaReserva ? String(c.mesaReserva) : '';
  (document.getElementById('cliDataEvento') as HTMLInputElement).value = c.dataEvento || '';
  openModal('modalCliente');
}
async function sincronizarMesaReserva(mesaNumNovo: number | null, mesaNumAntigo: number | null): Promise<void> {
  // Libera mesa anterior se existia e mudou
  if (mesaNumAntigo && mesaNumAntigo !== mesaNumNovo) {
    const mesaAnt = APP.mesas.find(m => m.numero === mesaNumAntigo);
    if (mesaAnt && mesaAnt.status === 'reservada') {
      mesaAnt.status = 'livre';
      mesaAnt.horaAbertura = null;
      try { await apiFetch(`/api/mesas/${mesaAnt.id}/`, { method: 'PUT', body: JSON.stringify({ status: 'livre', abertura: null }) }); } catch {}
    }
  }
  // Reserva nova mesa
  if (mesaNumNovo) {
    const mesaNova = APP.mesas.find(m => m.numero === mesaNumNovo);
    if (mesaNova) {
      mesaNova.status = 'reservada';
      try { await apiFetch(`/api/mesas/${mesaNova.id}/`, { method: 'PUT', body: JSON.stringify({ status: 'reservada', abertura: null }) }); } catch {}
    }
  }
}
async function salvarCliente(): Promise<void> {
  const nome        = (document.getElementById('cliNome') as HTMLInputElement).value.trim();
  const telefone    = (document.getElementById('cliTel') as HTMLInputElement).value.trim();
  const endereco    = (document.getElementById('cliEnd') as HTMLTextAreaElement).value.trim();
  const mesaReserva = (document.getElementById('cliMesaReserva') as HTMLInputElement).value;
  const dataEvento  = (document.getElementById('cliDataEvento') as HTMLInputElement).value;
  if (!nome || !telefone) { toast('Preencha nome e telefone', 'error'); return; }
  const novoNum = mesaReserva ? Number(mesaReserva) : null;
  const payload = { nome, telefone, endereco, mesaReserva: novoNum, dataEvento: dataEvento || null };
  try {
    if (APP.editingCliente) {
      const antigo = APP.clientes.find(x => x.id === APP.editingCliente);
      const antigoNum = antigo?.mesaReserva ?? null;
      const resp = await apiFetch(`/api/clientes/${APP.editingCliente}/`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error();
      if (antigo) Object.assign(antigo, payload);
      await sincronizarMesaReserva(novoNum, antigoNum);
    } else {
      const resp = await apiFetch('/api/clientes/', { method: 'POST', body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error();
      APP.clientes.push(await resp.json() as Cliente);
      await sincronizarMesaReserva(novoNum, null);
    }
    saveStorage(); closeModal('modalCliente'); render(); toast('Cliente salvo!', 'success');
  } catch { toast('Erro ao salvar cliente.', 'error'); }
}
async function excluirCliente(id: number, nome: string): Promise<void> {
  if (!confirm(`Excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const c = APP.clientes.find(x => x.id === id);
    const mesaNum = c?.mesaReserva ?? null;
    const resp = await apiFetch(`/api/clientes/${id}/`, { method: 'DELETE' });
    if (!resp.ok) throw new Error();
    APP.clientes = APP.clientes.filter(x => x.id !== id);
    await sincronizarMesaReserva(null, mesaNum);
    saveStorage(); render(); toast('Cliente excluído.', 'success');
  } catch { toast('Erro ao excluir cliente.', 'error'); }
}
async function liberarMesaCliente(id: number): Promise<void> {
  const c = APP.clientes.find(x => x.id === id);
  if (!c || !c.mesaReserva) return;
  const mesaNum = c.mesaReserva;
  if (!confirm(`Liberar a Mesa ${mesaNum} reservada para "${c.nome}"?`)) return;
  try {
    const payload = { nome: c.nome, telefone: c.telefone, endereco: c.endereco, mesaReserva: null, dataEvento: null };
    const resp = await apiFetch(`/api/clientes/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error();
    Object.assign(c, payload);
    await sincronizarMesaReserva(null, mesaNum);
    saveStorage(); render(); toast(`Mesa ${mesaNum} liberada!`, 'success');
  } catch { toast('Erro ao liberar mesa.', 'error'); }
}

/* ── CAIXA ────────────────────────────────────────── */
function exportarCaixaXLS(): void {
  const hoje   = new Date().setHours(0, 0, 0, 0);
  const pgHoje = APP.pagamentos.filter(p => p.data >= hoje);
  if (pgHoje.length === 0) { toast('Nenhum pagamento para exportar hoje', 'error'); return; }

  const totalVal = pgHoje.reduce((s, p) => s + p.valor, 0);
  const dataStr  = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

  const linhas = pgHoje.map(pg => {
    const dt   = new Date(pg.data);
    const data = dt.toLocaleDateString('pt-BR');
    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const val  = pg.valor.toFixed(2).replace('.', ',');
    return `<tr>
      <td>#${pg.pedidoId}</td>
      <td>${pg.desc || '-'}</td>
      <td>${pg.forma}</td>
      <td>${data}</td>
      <td>${hora}</td>
      <td>${val}</td>
    </tr>`;
  }).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
  <x:ExcelWorksheet><x:Name>Caixa</x:Name>
  <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
  </head><body>
  <table border="1" style="font-family:Arial;font-size:12px">
    <thead>
      <tr style="background:#C8340A;color:#fff;font-weight:bold">
        <th>Pedido</th><th>Mesa / Cliente</th><th>Forma de Pagamento</th>
        <th>Data</th><th>Hora</th><th>Valor (R$)</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
    <tfoot>
      <tr style="font-weight:bold;background:#f0f0f0">
        <td colspan="5">TOTAL DO DIA</td>
        <td>${totalVal.toFixed(2).replace('.', ',')}</td>
      </tr>
    </tfoot>
  </table>
  </body></html>`;

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `caixa-${dataStr}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Arquivo exportado com sucesso!', 'success');
}

function caixa(): string {
  const hoje   = new Date().setHours(0, 0, 0, 0);
  const pgHoje = APP.pagamentos.filter(p => p.data >= hoje);
  const total  = pgHoje.reduce((s, p) => s + p.valor, 0);
  const por: Record<string, number> = {};
  pgHoje.forEach(p => { por[p.forma] = (por[p.forma] || 0) + p.valor; });
  return `
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card">
      <div class="stat-label">Total do Dia</div>
      <div class="stat-value" style="color:var(--green)">${money(total)}</div>
      <div class="stat-sub">${pgHoje.length} pagamentos</div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:10px">Por Forma de Pagamento</div>
      ${Object.keys(por).length === 0
        ? '<div class="text-muted text-sm">Nenhum pagamento hoje</div>'
        : Object.entries(por).map(([k, v]) => `
          <div class="flex items-center justify-between" style="padding:4px 0">
            <span class="text-sm">${k}</span>
            <strong>${money(v)}</strong>
          </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div class="card-title">Pagamentos de Hoje</div>
      ${pgHoje.length > 0 ? `
      <button class="btn btn-secondary btn-sm" onclick="exportarCaixaXLS()" style="display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar Excel
      </button>` : ''}
    </div>
    ${pgHoje.length === 0
      ? '<div class="empty" style="padding:24px"><h3>Nenhum pagamento registrado hoje</h3></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Pedido</th><th>Mesa/Cliente</th><th>Forma</th><th>Valor</th><th>Hora</th></tr></thead>
          <tbody>${pgHoje.map(pg => `
            <tr>
              <td>#${pg.pedidoId}</td>
              <td>${pg.desc || '-'}</td>
              <td><span class="badge badge-blue">${pg.forma}</span></td>
              <td><strong>${money(pg.valor)}</strong></td>
              <td class="text-muted text-sm">${fmtDate(pg.data)}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
  </div>`;
}

/* ── CONFIG ───────────────────────────────────────── */
function config(): string {
  const logoUrlValue = APP.config.logo && !APP.config.logo.startsWith('data:') ? APP.config.logo : '';
  const inicial = (APP.config.nome || 'P')[0].toUpperCase();
  const previewLogo = APP.config.logo
    ? `<img src="${escapeHtml(APP.config.logo)}" alt="Logo">`
    : escapeHtml(inicial);
  return `
  <div class="grid-2">
    <div class="card">
      <div class="card-header"><div class="card-title">Personalizacao</div></div>
      <div class="brand-preview">
        <div class="brand-preview-logo" id="cfgPreviewLogo" style="background:${APP.config.cor}">${previewLogo}</div>
        <div>
          <div class="font-syne font-bold" id="cfgPreviewNome" style="font-size:18px">${escapeHtml(APP.config.nome)}</div>
          <div class="text-muted text-sm">Pre-visualizacao da marca</div>
        </div>
      </div>
      <div class="form-group"><label>Nome da Empresa</label>
        <input class="form-control" id="cfgNomeInline" value="${escapeHtml(APP.config.nome)}" oninput="previewConfig()"></div>
      <div class="form-group"><label>Enviar logo do computador</label>
        <input class="form-control" id="cfgLogoFileInline" type="file" accept="image/*" onchange="handleLogoUpload(this.files[0])"></div>
      <div class="form-group"><label>Logo por URL</label>
        <input class="form-control" id="cfgLogoInline" value="${escapeHtml(logoUrlValue)}" placeholder="https://...logo.png" oninput="previewConfig()"></div>
      <button class="btn btn-secondary btn-sm" type="button" onclick="limparLogoConfig()" style="margin-bottom:12px">Remover logo</button>
      <div class="form-group"><label>Cor Principal</label>
        <input class="form-control" id="cfgCorInline" type="color" value="${APP.config.cor}" oninput="previewConfig()"></div>
      <div class="form-group"><label>Numero de Mesas</label>
        <input class="form-control" id="cfgMesasInline" type="number" value="${APP.config.numMesas}" min="1" max="50"></div>
      <button class="btn btn-primary w-full" onclick="salvarConfigInline()">Salvar Configuracoes</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Tema e Aparencia</div></div>
      <div class="flex items-center justify-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500">Modo Escuro</div>
          <div class="text-muted text-sm">Alterna entre tema claro e escuro</div>
        </div>
        <label class="toggle">
          <input type="checkbox" ${darkMode ? 'checked' : ''} onchange="darkMode=this.checked;applyTheme();salvarConfigServidor(false)">
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
      </div>
      <div class="form-group" style="margin-top:16px">
        <label>Tamanho da letra</label>
        <input class="form-control" id="cfgFonteInline" type="range" min="12" max="20" value="${APP.config.fonteTamanho}" oninput="previewConfig()">
        <div class="text-muted text-sm"><span id="cfgFonteValor">${APP.config.fonteTamanho}</span>px</div>
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:8px;font-size:13px">Minha Conta</div>
        <button class="btn btn-secondary btn-sm w-full" onclick="abrirTrocarSenha(false)">Trocar minha senha</button>
      </div>
      <div style="margin-top:16px">
        <div class="card-title" style="margin-bottom:8px;font-size:13px">Sobre o Sistema</div>
        <div class="text-muted text-sm" style="line-height:1.8">
          <strong>Sistema de Gerenciamento de Pizzaria</strong><br>
          Versao 1.0 - MVP<br>
          Desenvolvido por: Erika Vitoria, Kelry Silva, Renata Penha, Victorya Lima, Pedro Rusvel<br>
          COPYRIGHT© 2026. Todos os direitos reservados.
        </div>
      </div>
    </div>
  </div>`;
}
function previewConfig(): void {
  const nomeEl  = document.getElementById('cfgNomeInline') as HTMLInputElement;
  const logoEl  = document.getElementById('cfgLogoInline') as HTMLInputElement;
  const corEl   = document.getElementById('cfgCorInline')  as HTMLInputElement;
  const fonteEl = document.getElementById('cfgFonteInline') as HTMLInputElement;
  if (!nomeEl || !corEl) return;
  APP.config.nome = nomeEl.value.trim() || 'Pizzaria';
  const logoUrl = logoEl ? logoEl.value.trim() : '';
  if (logoUrl) APP.config.logo = logoUrl;
  APP.config.cor = corEl.value;
  if (fonteEl) {
    APP.config.fonteTamanho = parseInt(fonteEl.value) || 14;
    (document.getElementById('cfgFonteValor') as HTMLElement).textContent = String(APP.config.fonteTamanho);
  }
  applyBranding(); applyFontSize(); updateConfigPreview();
}
function updateConfigPreview(): void {
  const previewNome = document.getElementById('cfgPreviewNome');
  const previewLogo = document.getElementById('cfgPreviewLogo');
  if (previewNome) previewNome.textContent = APP.config.nome;
  if (previewLogo) {
    (previewLogo as HTMLElement).style.background = APP.config.cor;
    previewLogo.innerHTML = APP.config.logo
      ? `<img src="${escapeHtml(APP.config.logo)}" alt="Logo">`
      : escapeHtml((APP.config.nome || 'P')[0].toUpperCase());
  }
}
function handleLogoUpload(file: File): void {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Selecione um arquivo de imagem.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    APP.config.logo = reader.result as string;
    const logoUrl = document.getElementById('cfgLogoInline') as HTMLInputElement;
    if (logoUrl) logoUrl.value = '';
    previewConfig();
  };
  reader.readAsDataURL(file);
}
function limparLogoConfig(): void {
  APP.config.logo = '';
  const logoUrl  = document.getElementById('cfgLogoInline')  as HTMLInputElement;
  const logoFile = document.getElementById('cfgLogoFileInline') as HTMLInputElement;
  if (logoUrl)  logoUrl.value  = '';
  if (logoFile) logoFile.value = '';
  previewConfig();
}
async function salvarConfigInline(): Promise<void> {
  previewConfig();
  const nm = parseInt((document.getElementById('cfgMesasInline') as HTMLInputElement).value) || 10;
  if (nm !== APP.config.numMesas) {
    APP.config.numMesas = nm; initMesas();
    apiFetch('/api/mesas/', { method: 'POST', body: JSON.stringify({ total: nm }) })
      .then(r => r.ok ? r.json() : null)
      .then(mesas => { if (mesas) { APP.mesas = mesas; render(); } })
      .catch(() => {});
  }
  saveStorage(); applyBranding(); applyFontSize();
  await salvarConfigServidor(true);
  render();
}
async function salvarConfig(): Promise<void> {
  APP.config.nome = (document.getElementById('cfgNome') as HTMLInputElement).value.trim() || 'Pizzaria';
  APP.config.logo = (document.getElementById('cfgLogo') as HTMLInputElement).value.trim();
  APP.config.cor  = (document.getElementById('cfgCor')  as HTMLInputElement).value;
  const nm = parseInt((document.getElementById('cfgMesas') as HTMLInputElement).value) || 10;
  if (nm !== APP.config.numMesas) { APP.config.numMesas = nm; initMesas(); }
  saveStorage(); applyBranding(); applyFontSize();
  await salvarConfigServidor(true);
  closeModal('modalConfig');
  render();
}

/* ══════════════════════════════════════════════════════
   PEDIDO MODAL
══════════════════════════════════════════════════════ */
function openModalPedido(): void {
  APP.pedidoTemp = { items: [], tipo: 'salao', mesaId: null, clienteId: null };
  const sel = document.getElementById('pedMesa') as HTMLSelectElement;
  const livres = APP.mesas.filter(m => m.status !== 'ocupada');
  sel.innerHTML = livres.map(m => `<option value="${m.id}">Mesa ${m.numero} (${statusLabel(m.status)})</option>`).join('');
  renderPedidoItems(); populatePedidoItem();
  openModal('modalPedido');
}
function populatePedidoItem(): void {
  const sel   = document.getElementById('pedItem') as HTMLSelectElement;
  const ativos = APP.cardapio.filter(i => i.ativo);
  sel.innerHTML = ativos.map(i =>
    `<option value="${i.id}">${i.nome} ${i.tamanho ? `(${i.tamanho})` : ''} — ${money(i.preco)}</option>`
  ).join('');
}
function addItemPedido(): void {
  const itemId = parseInt((document.getElementById('pedItem') as HTMLSelectElement).value);
  const qtd    = parseInt((document.getElementById('pedQtd') as HTMLInputElement).value) || 1;
  const obs    = (document.getElementById('pedObs') as HTMLInputElement).value.trim();
  const item   = APP.cardapio.find(x => x.id === itemId);
  if (!item) return;
  const existing = APP.pedidoTemp.items.find(i => i.id === itemId && i.obs === obs);
  if (existing) { existing.qtd += qtd; }
  else { APP.pedidoTemp.items.push({ id: item.id, nome: item.nome, preco: item.preco, qtd, obs }); }
  (document.getElementById('pedObs') as HTMLInputElement).value = '';
  renderPedidoItems();
}
function renderPedidoItems(): void {
  const items = APP.pedidoTemp.items;
  const total = pedTotalCalc(items);
  (document.getElementById('pedTotal') as HTMLElement).textContent = money(total);
  if (items.length === 0) {
    (document.getElementById('pedItensList') as HTMLElement).innerHTML =
      '<div class="text-muted text-sm" style="padding:8px 0">Nenhum item adicionado</div>';
    return;
  }
  (document.getElementById('pedItensList') as HTMLElement).innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Obs</th><th></th></tr></thead>
    <tbody>${items.map((item, i) => `
      <tr>
        <td>${item.nome}</td>
        <td>${item.qtd}</td>
        <td>${money(item.preco * item.qtd)}</td>
        <td class="text-muted text-sm">${item.obs || '-'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="removeItemPedido(${i})">✕</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}
function removeItemPedido(i: number): void {
  APP.pedidoTemp.items.splice(i, 1);
  renderPedidoItems();
}
async function salvarPedido(): Promise<void> {
  const items = APP.pedidoTemp.items;
  if (items.length === 0) { toast('Adicione pelo menos um item', 'error'); return; }
  const mSel = document.getElementById('pedMesa') as HTMLSelectElement;
  const mesaId = mSel ? parseInt(mSel.value) : null;
  const m = APP.mesas.find(x => x.id === mesaId);
  if (!m) { toast('Selecione uma mesa', 'error'); return; }
  const mesaNum = m.numero;
  const criadoEm = Date.now();
  const total    = pedTotalCalc(items);
  try {
    const resp = await apiFetch('/api/pedidos/', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'salao', mesaId, mesaNum, clienteId: null, clienteNome: '',
        total, status: 'Em preparo', criadoEm,
        items: items.map(i => ({ id: i.id, qtd: i.qtd, preco: i.preco, obs: i.obs })),
      }),
    });
    if (!resp.ok) throw new Error('Falha ao criar pedido');
    const pedido: Pedido = await resp.json();
    APP.pedidos.push(pedido);
    if (mesaId !== null) {
      m.status = 'ocupada'; m.horaAbertura = criadoEm;
      apiFetch(`/api/mesas/${mesaId}/`, { method: 'PUT', body: JSON.stringify({ status: 'ocupada', abertura: criadoEm }) });
    }
    saveStorage(); closeModal('modalPedido'); render();
    toast(`Pedido #${pedido.id} aberto!`, 'success');
  } catch (e) {
    toast('Erro ao criar pedido no servidor. Verifique o Django.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   FECHAR CONTA
══════════════════════════════════════════════════════ */
function abrirFecharConta(mesaId: number): void {
  closeModal('modalMesa');
  const mesa = APP.mesas.find(x => x.id === mesaId);
  const pedAtivos = APP.pedidos.filter(p =>
    p.status !== 'Finalizado' && (p.mesaId === mesaId || (mesa && p.mesaNum === mesa.numero))
  );
  if (pedAtivos.length === 0) { toast('Sem pedidos abertos nesta mesa', 'error'); return; }
  abrirFecharContaPedido(pedAtivos[0].id);
}
function abrirFecharContaPedido(pedidoId: number): void {
  const p = APP.pedidos.find(x => x.id === pedidoId);
  if (!p) return;
  APP.fecharPedidoId = pedidoId;
  (document.getElementById('fecharBody') as HTMLElement).innerHTML = `
  <div style="margin-bottom:12px">
    <div class="flex items-center justify-between mb-2">
      <strong>Pedido #${p.id}</strong>
      <span>Mesa ${p.mesaNum || '—'}</span>
    </div>
    ${p.items.map(i => `
      <div class="flex items-center justify-between text-sm" style="padding:3px 0">
        <span>${i.qtd}× ${i.nome}</span>
        <span>${money(i.preco * i.qtd)}</span>
      </div>`).join('')}
    <div class="flex items-center justify-between" style="margin-top:8px;padding-top:8px;border-top:2px solid var(--border)">
      <strong>Total</strong><strong style="color:var(--accent);font-size:18px">${money(p.total)}</strong>
    </div>
  </div>`;
  // Limpa seleção anterior para forçar nova escolha
  document.querySelectorAll('input[name="formaPag"]').forEach(el => (el as HTMLInputElement).checked = false);
  openModal('modalFechar');
}
async function confirmarFechamento(): Promise<void> {
  const id   = APP.fecharPedidoId!;
  const p    = APP.pedidos.find(x => x.id === id);
  if (!p) return;
  const formaEl = document.querySelector('input[name="formaPag"]:checked') as HTMLInputElement | null;
  if (!formaEl) { toast('Selecione o método de pagamento!', 'error'); return; }
  const forma = formaEl.value;
  const dataPag  = Date.now();
  const desc     = 'Mesa ' + (p.mesaNum || '—');
  try {
    const r1 = await apiFetch(`/api/pedidos/${id}/`, { method: 'PUT', body: JSON.stringify({ status: 'Finalizado' }) });
    if (!r1.ok) {
      const err = await r1.json().catch(() => ({})) as Record<string, string>;
      throw new Error(`Pedido: ${r1.status} ${err.erro || r1.statusText}`);
    }

    const r2 = await apiFetch('/api/pagamentos/', {
      method: 'POST',
      body: JSON.stringify({ pedidoId: id, forma, valor: p.total, data: dataPag, desc }),
    });
    if (!r2.ok) {
      const err = await r2.json().catch(() => ({})) as Record<string, string>;
      throw new Error(`Pagamento: ${r2.status} ${err.erro || r2.statusText}`);
    }

    p.status = 'Finalizado';
    APP.pagamentos.push({ pedidoId: id, forma, valor: p.total, data: dataPag, desc });

    const mesaDoP = p.mesaId
      ? APP.mesas.find(m => m.id === p.mesaId)
      : APP.mesas.find(m => m.numero === p.mesaNum);
    if (mesaDoP) {
      const pendentes = APP.pedidos.filter(pp =>
        pp.status !== 'Finalizado' && (pp.mesaId === mesaDoP.id || pp.mesaNum === mesaDoP.numero)
      );
      if (pendentes.length === 0) {
        mesaDoP.status = 'livre'; mesaDoP.horaAbertura = null;
        apiFetch(`/api/mesas/${mesaDoP.id}/`, { method: 'PUT', body: JSON.stringify({ status: 'livre', abertura: null }) });
      }
    }

    saveStorage(); closeModal('modalFechar'); render();
    toast(`Pagamento de ${money(p.total)} registrado!`, 'success');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    toast(`Erro: ${msg}`, 'error');
  }
}

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function toggleSenhaVisivel(inputId: string, btn: HTMLButtonElement): void {
  const inp = document.getElementById(inputId) as HTMLInputElement;
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}
function mostrarLogin(): void {
  (document.getElementById('loginOverlay') as HTMLElement).style.display = 'flex';
  (document.getElementById('app') as HTMLElement).style.display = 'none';
}
function mostrarApp(): void {
  (document.getElementById('loginOverlay') as HTMLElement).style.display = 'none';
  (document.getElementById('app') as HTMLElement).style.display = 'flex';
}
function aplicarUsuarioLogado(usuario: Usuario): void {
  APP.auth.usuario = usuario;
  const el = document.getElementById('sidebarUser');
  if (el) el.textContent = usuario.nome + ' · ' + ({ admin: 'Admin', garcom: 'Garçom', cozinha: 'Cozinha' }[usuario.papel] || usuario.papel);
  const permitidas = paginasPorPapel[usuario.papel] || ['dashboard'];
  document.querySelectorAll('.nav-item[data-page]').forEach(navEl => {
    const page = (navEl as HTMLElement).dataset.page!;
    (navEl as HTMLElement).style.display = permitidas.includes(page) ? 'flex' : 'none';
  });
  const secCadastros = document.getElementById('navSecCadastros');
  if (secCadastros) secCadastros.style.display = permitidas.includes('cardapio') || permitidas.includes('clientes') ? 'block' : 'none';
  const secFinanceiro = document.getElementById('navSecFinanceiro');
  if (secFinanceiro) secFinanceiro.style.display = permitidas.includes('caixa') ? 'block' : 'none';
  const secSistema = document.getElementById('navSecSistema');
  if (secSistema) secSistema.style.display = usuario.papel === 'admin' ? 'block' : 'none';
  const ll = document.getElementById('loginLogo');
  if (ll) { ll.textContent = (APP.config.nome || 'P')[0].toUpperCase(); (ll as HTMLElement).style.background = APP.config.cor; }
  const ln = document.getElementById('loginNome');
  if (ln) ln.textContent = APP.config.nome;
}
async function verificarAuth(): Promise<void> {
  if (!APP.auth.token) { mostrarLogin(); return; }
  try {
    const resp = await apiFetch('/api/auth/me/');
    if (resp.ok) {
      const usuario: Usuario = await resp.json();
      aplicarUsuarioLogado(usuario);
      if (usuario.deveTrocarSenha) { abrirTrocarSenha(true); mostrarApp(); return; }
      mostrarApp();
    } else {
      APP.auth.token = null;
      localStorage.removeItem('authToken');
      mostrarLogin();
    }
  } catch (e) { mostrarLogin(); }
}
async function fazerLogin(): Promise<void> {
  const username = (document.getElementById('loginUser') as HTMLInputElement).value.trim();
  const senha    = (document.getElementById('loginPass') as HTMLInputElement).value;
  const erroEl   = document.getElementById('loginErro') as HTMLElement;
  const btn      = document.getElementById('loginBtn')  as HTMLButtonElement;
  erroEl.style.display = 'none';
  if (!username || !senha) { erroEl.textContent = 'Preencha usuário e senha'; erroEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const resp = await fetch(apiUrl('/api/auth/login/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, senha }),
    });
    const data: ApiLoginResponse = await resp.json();
    if (!resp.ok) { erroEl.textContent = data.erro || 'Erro ao entrar'; erroEl.style.display = 'block'; return; }
    APP.auth.token = data.token;
    localStorage.setItem('authToken', data.token);
    aplicarUsuarioLogado(data.usuario);
    (document.getElementById('loginPass') as HTMLInputElement).value = '';
    if (data.usuario.deveTrocarSenha) { mostrarApp(); abrirTrocarSenha(true); return; }
    mostrarApp();
    navigate('dashboard');
    await carregarDados();
    render();
  } catch (e) {
    erroEl.textContent = 'Sem conexão com o servidor. Verifique se o Django está rodando em http://127.0.0.1:8000'; erroEl.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}
async function fazerLogout(): Promise<void> {
  try { await apiFetch('/api/auth/logout/', { method: 'POST' }); } catch (e) {}
  APP.auth.token = null;
  APP.auth.usuario = null;
  localStorage.removeItem('authToken');
  mostrarLogin();
}
function abrirTrocarSenha(primeiroAcesso: boolean = false): void {
  ['tsSenhaAtual', 'tsNovaSenha', 'tsConfirmar'].forEach(id =>
    ((document.getElementById(id) as HTMLInputElement).value = '')
  );
  const aviso    = document.getElementById('trocaSenhaAviso') as HTMLElement;
  const titulo   = document.getElementById('trocaSenhaTitulo') as HTMLElement;
  const cancelar = document.getElementById('tsCancelarBtn') as HTMLElement;
  aviso.style.display    = primeiroAcesso ? 'block' : 'none';
  titulo.textContent     = primeiroAcesso ? 'Primeiro Acesso' : 'Trocar Senha';
  cancelar.style.display = primeiroAcesso ? 'none' : '';
  openModal('modalTrocarSenha');
}
async function trocarSenha(): Promise<void> {
  const senhaAtual = (document.getElementById('tsSenhaAtual') as HTMLInputElement).value;
  const novaSenha  = (document.getElementById('tsNovaSenha')  as HTMLInputElement).value;
  const confirmar  = (document.getElementById('tsConfirmar')  as HTMLInputElement).value;
  if (!senhaAtual || !novaSenha || !confirmar) { toast('Preencha todos os campos', 'error'); return; }
  if (novaSenha !== confirmar) { toast('As senhas não conferem', 'error'); return; }
  if (novaSenha.length < 6) { toast('A nova senha deve ter no mínimo 6 caracteres', 'error'); return; }
  try {
    const resp = await apiFetch('/api/auth/trocar-senha/', {
      method: 'POST', body: JSON.stringify({ senhaAtual, novaSenha }),
    });
    const data: ApiTrocarSenhaResponse = await resp.json();
    if (!resp.ok) { toast(data.erro || 'Erro ao trocar senha', 'error'); return; }
    APP.auth.token = data.token;
    localStorage.setItem('authToken', data.token);
    aplicarUsuarioLogado(data.usuario);
    closeModal('modalTrocarSenha');
    toast('Senha alterada com sucesso!', 'success');
    await carregarDados();
    navigate('dashboard');
  } catch (e) { toast('Erro ao conectar com o servidor', 'error'); }
}

/* ── PÁGINA USUÁRIOS (admin) ─────────────────────────── */
let _editandoUsuarioId: number | null = null;

function usuarios(): string {
  return `
  <div class="card">
    <div class="card-header">
      <div class="card-title">Usuários do Sistema</div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()">+ Novo Usuário</button>
    </div>
    <div id="usuariosTabela"><div class="empty"><h3>Carregando...</h3></div></div>
  </div>`;
}
async function afterRenderUsuarios(): Promise<void> {
  if (APP.currentPage !== 'usuarios') return;
  try {
    const resp = await apiFetch('/api/usuarios/');
    if (!resp.ok) {
      (document.getElementById('usuariosTabela') as HTMLElement).innerHTML =
        '<div class="empty"><h3>Sem permissão</h3></div>';
      return;
    }
    const lista: Usuario[] = await resp.json();
    const mim = APP.auth.usuario?.id;
    const papelLabel: Record<PapelUsuario, string> = { admin: 'Admin', garcom: 'Garçom', cozinha: 'Cozinha' };
    (document.getElementById('usuariosTabela') as HTMLElement).innerHTML = lista.length === 0
      ? '<div class="empty"><h3>Nenhum usuário cadastrado</h3></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Nome</th><th>Usuário</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${lista.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.nome)}</strong></td>
              <td class="text-muted">${escapeHtml(u.username)}</td>
              <td><span class="badge ${u.papel === 'admin' ? 'badge-red' : u.papel === 'cozinha' ? 'badge-amber' : 'badge-blue'}">${papelLabel[u.papel] || u.papel}</span></td>
              <td>${u.deveTrocarSenha ? '<span class="badge badge-amber">Aguardando 1º acesso</span>' : '<span class="badge badge-green">Ativo</span>'}</td>
              <td><div class="flex gap-2">
                <button class="btn btn-sm btn-secondary" onclick="abrirModalUsuario(${u.id})">Editar</button>
                ${u.id !== mim ? `<button class="btn btn-sm btn-danger" onclick="excluirUsuario(${u.id},'${escapeHtml(u.nome)}')">Excluir</button>` : ''}
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
  } catch (e) {
    (document.getElementById('usuariosTabela') as HTMLElement).innerHTML =
      '<div class="empty"><h3>Erro ao carregar</h3></div>';
  }
}
function abrirModalUsuario(id: number | null = null): void {
  _editandoUsuarioId = id;
  (document.getElementById('modalUsuarioTitle') as HTMLElement).textContent = id ? 'Editar Usuário' : 'Novo Usuário';
  (document.getElementById('uSenhaGrupo') as HTMLElement).style.display = '';
  ['uNome', 'uUsername', 'uSenha'].forEach(i => ((document.getElementById(i) as HTMLInputElement).value = ''));
  (document.getElementById('uPapel') as HTMLSelectElement).value = 'garcom';
  (document.getElementById('uUsername') as HTMLInputElement).disabled = !!id;
  const labelEl = (document.getElementById('uSenhaGrupo') as HTMLElement).querySelector('label') as HTMLElement;
  if (id) {
    labelEl.textContent = 'Nova senha (deixe em branco para não alterar)';
  } else {
    labelEl.innerHTML = 'Senha temporária <span class="text-muted">(mín. 6 caracteres)</span>';
  }
  openModal('modalUsuario');
}
async function salvarUsuario(): Promise<void> {
  const nome     = (document.getElementById('uNome')     as HTMLInputElement).value.trim();
  const username = (document.getElementById('uUsername') as HTMLInputElement).value.trim();
  const senha    = (document.getElementById('uSenha')    as HTMLInputElement).value;
  const papel    = (document.getElementById('uPapel')    as HTMLSelectElement).value;
  try {
    let resp: Response;
    if (_editandoUsuarioId) {
      const body: Record<string, unknown> = { nome, papel };
      if (senha) body.novaSenha = senha;
      resp = await apiFetch(`/api/usuarios/${_editandoUsuarioId}/`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      if (!username || !senha) { toast('Usuário e senha são obrigatórios', 'error'); return; }
      resp = await apiFetch('/api/usuarios/', { method: 'POST', body: JSON.stringify({ nome, username, senha, papel }) });
    }
    const data: ApiErro = await resp.json();
    if (!resp.ok) { toast(data.erro || 'Erro ao salvar', 'error'); return; }
    closeModal('modalUsuario');
    toast(_editandoUsuarioId ? 'Usuário atualizado!' : 'Usuário criado! Ele deve trocar a senha no primeiro acesso.', 'success');
    afterRenderUsuarios();
  } catch (e) { toast('Erro ao conectar com o servidor', 'error'); }
}
async function excluirUsuario(id: number, nome: string): Promise<void> {
  if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
  try {
    const resp = await apiFetch(`/api/usuarios/${id}/`, { method: 'DELETE' });
    if (!resp.ok) { const d: ApiErro = await resp.json(); toast(d.erro || 'Erro ao excluir', 'error'); return; }
    toast('Usuário excluído', 'success');
    afterRenderUsuarios();
  } catch (e) { toast('Erro ao conectar com o servidor', 'error'); }
}

/* ══════════════════════════════════════════════════════
   KDS AUTO-REFRESH
══════════════════════════════════════════════════════ */
setInterval((): void => {
  if (APP.currentPage === 'kds') render();
  updateBadge();
}, 30000);

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
(async (): Promise<void> => {
  await carregarConfigServidor();
  const ll = document.getElementById('loginLogo');
  if (ll) { ll.textContent = (APP.config.nome || 'P')[0].toUpperCase(); (ll as HTMLElement).style.background = APP.config.cor; }
  const ln = document.getElementById('loginNome');
  if (ln) ln.textContent = APP.config.nome;
  await verificarAuth();
  if (APP.auth.usuario && !APP.auth.usuario.deveTrocarSenha) {
    navigate('dashboard');
    await carregarDados();
    render();
  }
})();
