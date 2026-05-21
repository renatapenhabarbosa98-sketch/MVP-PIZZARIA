/// <reference path="./types.ts" />
/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const APP = {
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
function initMesas() {
    APP.mesas = [];
    for (let i = 1; i <= APP.config.numMesas; i++) {
        APP.mesas.push({ id: i, numero: i, capacidade: 4, status: 'livre', horaAbertura: null });
    }
}
initMesas();
// Persist
function saveStorage() {
    try {
        localStorage.setItem('pizzaria_app', JSON.stringify({
            config: APP.config, cardapio: APP.cardapio, mesas: APP.mesas,
            pedidos: APP.pedidos, clientes: APP.clientes, pagamentos: APP.pagamentos,
            nextId: APP.nextId,
        }));
    }
    catch (e) { }
}
function loadStorage() {
    try {
        const d = JSON.parse(localStorage.getItem('pizzaria_app') || 'null');
        if (!d)
            return;
        Object.assign(APP.config, d.config || {});
        APP.config.numMesas = APP.config.numMesas || APP.config.mesas || 10;
        APP.config.tema = APP.config.tema || localStorage.getItem('theme') || 'light';
        APP.config.fonteTamanho = Number(APP.config.fonteTamanho || 14);
        if (d.cardapio)
            APP.cardapio = d.cardapio;
        if (d.mesas && d.mesas.length > 0)
            APP.mesas = d.mesas;
        if (d.pedidos)
            APP.pedidos = d.pedidos;
        if (d.clientes)
            APP.clientes = d.clientes;
        if (d.pagamentos)
            APP.pagamentos = d.pagamentos;
        if (d.nextId)
            APP.nextId = d.nextId;
    }
    catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
}
loadStorage();
let darkMode = APP.config.tema === 'dark';
function applyTheme() {
    APP.config.tema = darkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.getElementById('themeIconSun').style.display = darkMode ? 'none' : 'block';
    document.getElementById('themeIconMoon').style.display = darkMode ? 'block' : 'none';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    saveStorage();
}
applyTheme();
document.getElementById('themeBtn').onclick = () => {
    darkMode = !darkMode;
    applyTheme();
    salvarConfigServidor(false);
};
/* ══════════════════════════════════════════════════════
   ROUTING
══════════════════════════════════════════════════════ */
const pages = { dashboard, mesas, pedidos, kds, cardapio, clientes, caixa, config, usuarios };
const titles = {
    dashboard: 'Dashboard', mesas: 'Controle de Mesas', pedidos: 'Gestão de Pedidos',
    kds: 'KDS – Tela da Cozinha', cardapio: 'Cardápio', clientes: 'Clientes',
    caixa: 'Caixa do Dia', config: 'Configurações', usuarios: 'Usuários do Sistema',
};
const paginasPorPapel = {
    admin: ['dashboard', 'mesas', 'pedidos', 'kds', 'cardapio', 'clientes', 'caixa', 'config', 'usuarios'],
    garcom: ['dashboard', 'mesas', 'pedidos', 'kds', 'cardapio', 'caixa'],
    cozinha: ['dashboard', 'mesas', 'kds', 'pedidos'],
};
function navigate(page) {
    const papel = APP.auth.usuario?.papel;
    if (papel && papel !== 'admin') {
        const permitidas = paginasPorPapel[papel] || ['dashboard'];
        if (!permitidas.includes(page))
            return;
    }
    APP.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = titles[page] || page;
    render();
    if (page === 'mesas')
        recarregarMesas().then(() => render());
}
function render() {
    const fn = pages[APP.currentPage];
    document.getElementById('content').innerHTML = fn
        ? fn()
        : '<div class="empty"><h3>Página não encontrada</h3></div>';
    afterRender();
}
function afterRender() {
    updateBadge();
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.onclick = () => navigate(el.dataset.nav);
    });
    afterRenderUsuarios();
}
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.onclick = () => navigate(el.dataset.page);
});
/* ══════════════════════════════════════════════════════
   SIDEBAR TOGGLE
══════════════════════════════════════════════════════ */
let sidebarCollapsed = false;
document.getElementById('toggleSidebar').onclick = () => {
    sidebarCollapsed = !sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
    document.getElementById('collapseIcon').style.transform = sidebarCollapsed ? 'rotate(180deg)' : '';
};
if (window.innerWidth <= 700) {
    document.getElementById('mobileSidebarToggle').style.display = 'flex';
}
document.getElementById('mobileSidebarToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
};
document.getElementById('newPedidoBtn').onclick = openModalPedido;
/* ══════════════════════════════════════════════════════
   MODAIS HELPERS
══════════════════════════════════════════════════════ */
function openModal(id) {
    document.getElementById(id).classList.add('open');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('[data-close]').forEach(el => {
    el.onclick = () => closeModal(el.dataset.close);
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.onclick = (e) => {
        if (e.target === overlay)
            closeModal(overlay.id);
    };
});
/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3200);
}
/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
function money(v) {
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}
function elapsed(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
function statusLabel(s) {
    const map = { livre: 'Livre', ocupada: 'Ocupada', reservada: 'Reservada' };
    return map[s] || s;
}
function statusBadge(s) {
    const map = { livre: 'badge-green', ocupada: 'badge-red', reservada: 'badge-amber' };
    return map[s] || 'badge-gray';
}
function pedStatusLabel(s) {
    const map = {
        'Em preparo': 'Em preparo', 'Saiu para entrega': 'Saiu p/ entrega',
        'Servido': 'Servido', 'Finalizado': 'Finalizado',
    };
    return map[s] || s;
}
function pedStatusBadge(s) {
    const map = {
        'Em preparo': 'badge-amber', 'Saiu para entrega': 'badge-blue',
        'Servido': 'badge-blue', 'Finalizado': 'badge-green',
    };
    return map[s] || 'badge-gray';
}
function updateBadge() {
    const ativos = APP.pedidos.filter(p => p.status !== 'Finalizado').length;
    document.getElementById('badgePedidos').textContent = String(ativos);
}
function pedTotalCalc(items) {
    return items.reduce((s, i) => s + i.preco * i.qtd, 0);
}
function fmtDate(ts) {
    if (!ts)
        return '-';
    return new Date(ts).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[ch] ?? ch));
}
/* ══════════════════════════════════════════════════════
   BRANDING
══════════════════════════════════════════════════════ */
function applyBranding() {
    document.getElementById('brandName').textContent = APP.config.nome;
    const logo = APP.config.logo;
    const wrap = document.getElementById('logoWrap');
    if (logo) {
        wrap.innerHTML = `<img src="${escapeHtml(logo)}" alt="logo" onerror="this.style.display='none'">`;
    }
    else {
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
function applyFontSize() {
    const size = Math.min(20, Math.max(12, Number(APP.config.fonteTamanho) || 14));
    APP.config.fonteTamanho = size;
    document.documentElement.style.setProperty('--app-font-size', `${size}px`);
}
function lightenHex(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16) + amt;
    let g = parseInt(hex.slice(3, 5), 16) + amt;
    let b = parseInt(hex.slice(5, 7), 16) + amt;
    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
applyBranding();
applyFontSize();
function configPayload() {
    return {
        nome: APP.config.nome, logo: APP.config.logo || '', cor: APP.config.cor,
        mesas: APP.config.numMesas, tema: APP.config.tema || (darkMode ? 'dark' : 'light'),
        fonteTamanho: APP.config.fonteTamanho,
    };
}
function apiUrl(path) {
    return path;
}
function apiFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (APP.auth.token)
        headers['X-Auth-Token'] = APP.auth.token;
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
function normalizeCardapioItem(item) {
    return {
        id: Number(item.id), nome: item.nome,
        tipo: (item.tipo || 'pizza'),
        tamanho: item.tamanho || item.tam || '',
        preco: Number(item.preco), ativo: item.ativo !== false,
    };
}
function aplicarConfigServidor(d) {
    if (!d)
        return;
    APP.config.nome = d.nome || APP.config.nome;
    APP.config.logo = d.logo || '';
    APP.config.cor = d.cor || APP.config.cor;
    APP.config.numMesas = Number(d.mesas || d.numMesas || APP.config.numMesas || 10);
    APP.config.tema = (d.tema || APP.config.tema || 'light');
    APP.config.fonteTamanho = Number(d.fonteTamanho || APP.config.fonteTamanho || 14);
    darkMode = APP.config.tema === 'dark';
    saveStorage();
    applyTheme();
    applyBranding();
    applyFontSize();
}
async function carregarConfigServidor() {
    try {
        const resp = await apiFetch('/api/config/');
        if (!resp.ok)
            return;
        aplicarConfigServidor(await resp.json());
    }
    catch (e) { }
}
async function carregarDados() {
    try {
        const [cardapioR, mesasR, pedidosR, clientesR, pagamentosR] = await Promise.all([
            apiFetch('/api/cardapio/'),
            apiFetch('/api/mesas/'),
            apiFetch('/api/pedidos/'),
            apiFetch('/api/clientes/'),
            apiFetch('/api/pagamentos/'),
        ]);
        if (cardapioR.ok)
            APP.cardapio = (await cardapioR.json()).map(normalizeCardapioItem);
        if (mesasR.ok) {
            const m = await mesasR.json();
            if (m.length > 0)
                APP.mesas = m;
        }
        if (pedidosR.ok)
            APP.pedidos = await pedidosR.json();
        if (clientesR.ok)
            APP.clientes = await clientesR.json();
        if (pagamentosR.ok)
            APP.pagamentos = await pagamentosR.json();
        saveStorage();
    }
    catch (e) {
        console.error('Erro ao carregar dados do servidor:', e);
    }
}
async function salvarConfigServidor(showToast = true) {
    try {
        const resp = await apiFetch('/api/config/', { method: 'PUT', body: JSON.stringify(configPayload()) });
        if (!resp.ok)
            throw new Error('Falha ao salvar');
        aplicarConfigServidor(await resp.json());
        if (showToast)
            toast('Configuracoes salvas e mantidas para a proxima abertura!', 'success');
    }
    catch (e) {
        saveStorage();
        if (showToast)
            toast('Salvo neste navegador. Verifique a conexao com o servidor.', 'info');
    }
}
/* ══════════════════════════════════════════════════════
   PAGES
══════════════════════════════════════════════════════ */
function dashboard() {
    const hoje = new Date().setHours(0, 0, 0, 0);
    const pedHoje = APP.pagamentos.filter(p => p.data >= hoje);
    const totalHoje = pedHoje.reduce((s, p) => s + p.valor, 0);
    const pedAtivos = APP.pedidos.filter(p => p.status !== 'Finalizado').length;
    const mesasOcupadas = APP.mesas.filter(m => m.status === 'ocupada').length;
    const cardAtivos = APP.cardapio.filter(c => c.ativo).length;
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
              <div class="font-bold" style="font-size:13px">Pedido #${p.id} — ${p.tipo === 'salao' ? 'Mesa ' + p.mesaNum : 'Delivery'}</div>
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
function mesas() {
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
function openMesaModal(id) {
    const m = APP.mesas.find(x => x.id === id);
    if (!m)
        return;
    document.getElementById('mesaModalNum').textContent = String(m.numero);
    const pedAtivos = APP.pedidos.filter(p => p.mesaId === id && p.status !== 'Finalizado');
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
    }
    else if (m.status === 'reservada') {
        body += `<div class="flex gap-2">
      <button class="btn btn-primary" style="flex:1" onclick="mudarStatusMesa(${id},'ocupada')">Ocupar Agora</button>
      <button class="btn btn-secondary" style="flex:1" onclick="mudarStatusMesa(${id},'livre')">Liberar</button>
    </div>`;
    }
    else {
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
            body += `</div>
      <div class="flex gap-2" style="margin-top:8px">
        <button class="btn btn-success" style="flex:1" onclick="abrirFecharConta(${id})">Fechar Conta</button>
        <button class="btn btn-secondary" style="flex:1" onclick="mudarStatusMesa(${id},'livre')">Liberar Forçado</button>
      </div>`;
        }
        else {
            body += `<div style="margin-bottom:12px;padding:12px;background:var(--amberbg);border-radius:8px">
        <div class="font-bold text-sm" style="color:var(--amber)">Mesa sem pedido ativo</div>
        <div class="text-muted text-sm" style="margin-top:4px">Esta mesa está marcada como ocupada mas não possui pedidos. Clique em Liberar Mesa para corrigi-la.</div>
      </div>
      <button class="btn btn-secondary w-full" onclick="mudarStatusMesa(${id},'livre')">Liberar Mesa</button>`;
        }
    }
    document.getElementById('mesaModalBody').innerHTML = body;
    openModal('modalMesa');
}
async function mudarStatusMesa(id, status) {
    const m = APP.mesas.find(x => x.id === id);
    if (!m)
        return;
    const statusAnterior = m.status;
    const aberturaAnterior = m.horaAbertura;
    m.status = status;
    if (status === 'ocupada')
        m.horaAbertura = Date.now();
    else if (status === 'livre')
        m.horaAbertura = null;
    closeModal('modalMesa');
    render();
    try {
        const resp = await apiFetch(`/api/mesas/${id}/`, {
            method: 'PUT',
            body: JSON.stringify({ status, abertura: m.horaAbertura }),
        });
        if (!resp.ok)
            throw new Error();
        saveStorage();
        toast(`Mesa ${m.numero} → ${statusLabel(status)}`, 'success');
    }
    catch {
        m.status = statusAnterior;
        m.horaAbertura = aberturaAnterior;
        saveStorage();
        render();
        toast(`Erro ao atualizar Mesa ${m.numero}`, 'error');
    }
}
async function recarregarMesas() {
    try {
        const resp = await apiFetch('/api/mesas/');
        if (resp.ok) {
            const data = await resp.json();
            if (data.length > 0) {
                APP.mesas = data;
                saveStorage();
            }
            else if (APP.mesas.length === 0) {
                initMesas();
            }
        }
    }
    catch { }
}
/* ── PEDIDOS ──────────────────────────────────────── */
function pedidos() {
    const filter = APP._pedFilter || 'todos';
    const filtered = APP.pedidos.filter(p => {
        if (filter === 'ativos')
            return p.status !== 'Finalizado';
        if (filter === 'finalizados')
            return p.status === 'Finalizado';
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
            <th>#</th><th>Tipo</th><th>Mesa / Cliente</th>
            <th>Itens</th><th>Total</th><th>Status</th><th>Hora</th><th>Ações</th>
          </tr></thead>
          <tbody>
          ${filtered.map(p => `
            <tr>
              <td><strong>#${p.id}</strong></td>
              <td><span class="badge ${p.tipo === 'salao' ? 'badge-blue' : 'badge-amber'}">${p.tipo === 'salao' ? 'Salão' : 'Delivery'}</span></td>
              <td>${p.tipo === 'salao' ? 'Mesa ' + p.mesaNum : (p.clienteNome || '—')}</td>
              <td class="text-muted">${p.items.length} item(ns)</td>
              <td><strong>${money(p.total)}</strong></td>
              <td><span class="badge ${pedStatusBadge(p.status)}">${pedStatusLabel(p.status)}</span></td>
              <td class="text-muted text-sm">${fmtDate(p.criadoEm)}</td>
              <td>
                <div class="flex gap-2">
                  ${p.status !== 'Finalizado' ? `<button class="btn btn-sm btn-secondary" onclick="avancarStatus(${p.id})">Avançar</button>` : ''}
                  ${p.status !== 'Finalizado' ? `<button class="btn btn-sm btn-success" onclick="abrirFecharContaPedido(${p.id})">Fechar</button>` : ''}
                  ${p.status === 'Finalizado' ? `<button class="btn btn-sm btn-secondary" onclick="verDetalhesPedido(${p.id})">Ver itens</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
  </div>`;
}
function setFilter(f) { APP._pedFilter = f; render(); }
function verDetalhesPedido(id) {
    const p = APP.pedidos.find(x => x.id === id);
    if (!p)
        return;
    const header = p.tipo === 'salao' ? `Mesa ${p.mesaNum}` : (p.clienteNome || 'Delivery');
    const pagamento = APP.pagamentos.find(pg => pg.pedidoId === id);
    const temObs = p.items.some(i => i.obs);
    document.getElementById('detalhesPedidoTitulo').textContent = `Pedido #${p.id} — Detalhes`;
    document.getElementById('detalhesPedidoBody').innerHTML = `
  <div class="flex items-center justify-between mb-3">
    <div>
      <div class="font-bold">${header}</div>
      <div class="text-muted text-sm">${fmtDate(p.criadoEm)}</div>
    </div>
    <span class="badge badge-green">Finalizado</span>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th>${temObs ? '<th>Obs</th>' : ''}</tr></thead>
    <tbody>${p.items.map(i => `
      <tr>
        <td><strong>${escapeHtml(i.nome)}</strong></td>
        <td>${i.qtd}</td>
        <td>${money(i.preco)}</td>
        <td>${money(i.preco * i.qtd)}</td>
        ${temObs ? `<td class="text-muted text-sm">${escapeHtml(i.obs || '-')}</td>` : ''}
      </tr>`).join('')}
    </tbody>
  </table></div>
  <div class="flex items-center justify-between" style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border)">
    <strong>Total</strong>
    <strong style="color:var(--green);font-size:18px">${money(p.total)}</strong>
  </div>
  ${pagamento ? `<div class="flex items-center justify-between" style="margin-top:8px">
    <span class="text-muted text-sm">Forma de pagamento</span>
    <span class="badge badge-blue">${escapeHtml(pagamento.forma)}</span>
  </div>` : ''}`;
    openModal('modalDetalhesPedido');
}
async function avancarStatus(id) {
    const p = APP.pedidos.find(x => x.id === id);
    if (!p)
        return;
    const seq = ['Em preparo', 'Saiu para entrega', 'Servido', 'Finalizado'];
    const idx = seq.indexOf(p.status);
    if (idx < seq.length - 1) {
        p.status = seq[idx + 1];
        saveStorage();
        render();
        toast(`Pedido #${p.id} → ${p.status}`, 'success');
        try {
            await apiFetch(`/api/pedidos/${id}/`, { method: 'PUT', body: JSON.stringify({ status: p.status }) });
        }
        catch (e) { }
    }
}
/* ── KDS ──────────────────────────────────────────── */
function kds() {
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
            const mesaNum = p.mesaNum || (APP.mesas.find(m => m.id === p.mesaId)?.numero) || null;
            const localLabel = p.tipo === 'salao'
                ? (mesaNum ? `Mesa ${mesaNum}` : 'Salão')
                : 'Delivery';
            const localBadge = p.tipo === 'salao' ? 'badge-blue' : 'badge-amber';
            return `
        <div class="kds-ticket${priority ? ' priority' : ''}">
          <div class="kds-ticket-header">
            <div>
              <div class="kds-ticket-id">#${p.id}</div>
              <span class="badge ${localBadge}" style="margin-top:4px;font-size:13px;font-weight:700">${localLabel}</span>
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
function toggleKdsItem(pedId, idx) {
    const el = document.getElementById(`kdsitem-${pedId}-${idx}`);
    if (el)
        el.classList.toggle('done');
}
function avancarStatusKds(id) { avancarStatus(id); }
/* ── CARDÁPIO ─────────────────────────────────────── */
function cardapio() {
    const isAdmin = APP.auth.usuario?.papel === 'admin';
    const pizzas = APP.cardapio.filter(i => i.tipo === 'pizza');
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
function switchCardTab(e, tipo) {
    document.querySelectorAll('#content .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('tabPizza').style.display = tipo === 'pizza' ? 'block' : 'none';
    document.getElementById('tabBebida').style.display = tipo === 'bebida' ? 'block' : 'none';
}
function openModalItem() {
    APP.editingItem = null;
    document.getElementById('modalItemTitle').textContent = 'Novo Item';
    ['itemNome', 'itemPreco'].forEach(id => (document.getElementById(id).value = ''));
    document.getElementById('itemTipo').value = 'pizza';
    document.getElementById('itemTamanho').value = 'G';
    openModal('modalItem');
}
function editItem(id) {
    const item = APP.cardapio.find(x => x.id === id);
    if (!item)
        return;
    APP.editingItem = id;
    document.getElementById('modalItemTitle').textContent = 'Editar Item';
    document.getElementById('itemNome').value = item.nome;
    document.getElementById('itemTipo').value = item.tipo;
    document.getElementById('itemTamanho').value = item.tamanho || '';
    document.getElementById('itemPreco').value = String(item.preco);
    openModal('modalItem');
}
async function salvarItem() {
    const nome = document.getElementById('itemNome').value.trim();
    const tipo = document.getElementById('itemTipo').value;
    const tamanho = document.getElementById('itemTamanho').value;
    const preco = parseFloat(document.getElementById('itemPreco').value);
    if (!nome || isNaN(preco)) {
        toast('Preencha nome e preço', 'error');
        return;
    }
    const payload = { nome, tipo, tam: tamanho, preco, ativo: true };
    try {
        if (APP.editingItem) {
            const atual = APP.cardapio.find(x => x.id === APP.editingItem);
            payload.ativo = atual ? atual.ativo : true;
            const resp = await apiFetch(`/api/cardapio/${APP.editingItem}/`, { method: 'PUT', body: JSON.stringify(payload) });
            if (!resp.ok)
                throw new Error('Falha ao editar item');
            const item = APP.cardapio.find(x => x.id === APP.editingItem);
            if (item)
                Object.assign(item, normalizeCardapioItem(await resp.json()), { tamanho });
        }
        else {
            const resp = await apiFetch('/api/cardapio/', { method: 'POST', body: JSON.stringify(payload) });
            if (!resp.ok)
                throw new Error('Falha ao criar item');
            APP.cardapio.push({ ...normalizeCardapioItem(await resp.json()), tamanho });
        }
        saveStorage();
        closeModal('modalItem');
        render();
        toast('Item salvo com sucesso', 'success');
    }
    catch (e) {
        toast('Nao foi possivel salvar o item no servidor. Verifique o PostgreSQL/Django.', 'error');
    }
}
async function toggleItem(id) {
    const item = APP.cardapio.find(x => x.id === id);
    if (!item)
        return;
    const ativoAnterior = item.ativo;
    item.ativo = !item.ativo;
    saveStorage();
    render();
    try {
        const resp = await apiFetch(`/api/cardapio/${id}/`, {
            method: 'PUT',
            body: JSON.stringify({ nome: item.nome, tipo: item.tipo, tam: item.tamanho, preco: item.preco, ativo: item.ativo }),
        });
        if (!resp.ok)
            throw new Error('Falha ao atualizar item');
    }
    catch (e) {
        item.ativo = ativoAnterior;
        saveStorage();
        render();
        toast('Nao foi possivel atualizar o item no servidor.', 'error');
    }
}
/* ── CLIENTES ─────────────────────────────────────── */
function fmtDataEvento(val) {
    if (!val)
        return '-';
    try {
        const d = new Date(val);
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    catch {
        return val;
    }
}
function clientes() {
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
function openModalCliente() {
    APP.editingCliente = null;
    document.getElementById('modalClienteTitle').textContent = 'Novo Cliente';
    ['cliNome', 'cliTel', 'cliEnd', 'cliDataEvento'].forEach(id => (document.getElementById(id).value = ''));
    document.getElementById('cliMesaReserva').value = '';
    openModal('modalCliente');
}
function editCliente(id) {
    const c = APP.clientes.find(x => x.id === id);
    if (!c)
        return;
    APP.editingCliente = id;
    document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
    document.getElementById('cliNome').value = c.nome;
    document.getElementById('cliTel').value = c.telefone;
    document.getElementById('cliEnd').value = c.endereco || '';
    document.getElementById('cliMesaReserva').value = c.mesaReserva ? String(c.mesaReserva) : '';
    document.getElementById('cliDataEvento').value = c.dataEvento || '';
    openModal('modalCliente');
}
async function sincronizarMesaReserva(mesaNumNovo, mesaNumAntigo) {
    // Libera mesa anterior se existia e mudou
    if (mesaNumAntigo && mesaNumAntigo !== mesaNumNovo) {
        const mesaAnt = APP.mesas.find(m => m.numero === mesaNumAntigo);
        if (mesaAnt && mesaAnt.status === 'reservada') {
            mesaAnt.status = 'livre';
            mesaAnt.horaAbertura = null;
            try {
                await apiFetch(`/api/mesas/${mesaAnt.id}/`, { method: 'PUT', body: JSON.stringify({ status: 'livre', abertura: null }) });
            }
            catch { }
        }
    }
    // Reserva nova mesa
    if (mesaNumNovo) {
        const mesaNova = APP.mesas.find(m => m.numero === mesaNumNovo);
        if (mesaNova) {
            mesaNova.status = 'reservada';
            try {
                await apiFetch(`/api/mesas/${mesaNova.id}/`, { method: 'PUT', body: JSON.stringify({ status: 'reservada', abertura: null }) });
            }
            catch { }
        }
    }
}
async function salvarCliente() {
    const nome = document.getElementById('cliNome').value.trim();
    const telefone = document.getElementById('cliTel').value.trim();
    const endereco = document.getElementById('cliEnd').value.trim();
    const mesaReserva = document.getElementById('cliMesaReserva').value;
    const dataEvento = document.getElementById('cliDataEvento').value;
    if (!nome || !telefone) {
        toast('Preencha nome e telefone', 'error');
        return;
    }
    const novoNum = mesaReserva ? Number(mesaReserva) : null;
    const payload = { nome, telefone, endereco, mesaReserva: novoNum, dataEvento: dataEvento || null };
    try {
        if (APP.editingCliente) {
            const antigo = APP.clientes.find(x => x.id === APP.editingCliente);
            const antigoNum = antigo?.mesaReserva ?? null;
            const resp = await apiFetch(`/api/clientes/${APP.editingCliente}/`, { method: 'PUT', body: JSON.stringify(payload) });
            if (!resp.ok)
                throw new Error();
            if (antigo)
                Object.assign(antigo, payload);
            await sincronizarMesaReserva(novoNum, antigoNum);
        }
        else {
            const resp = await apiFetch('/api/clientes/', { method: 'POST', body: JSON.stringify(payload) });
            if (!resp.ok)
                throw new Error();
            APP.clientes.push(await resp.json());
            await sincronizarMesaReserva(novoNum, null);
        }
        saveStorage();
        closeModal('modalCliente');
        render();
        toast('Cliente salvo!', 'success');
    }
    catch {
        toast('Erro ao salvar cliente.', 'error');
    }
}
async function excluirCliente(id, nome) {
    if (!confirm(`Excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`))
        return;
    try {
        const c = APP.clientes.find(x => x.id === id);
        const mesaNum = c?.mesaReserva ?? null;
        const resp = await apiFetch(`/api/clientes/${id}/`, { method: 'DELETE' });
        if (!resp.ok)
            throw new Error();
        APP.clientes = APP.clientes.filter(x => x.id !== id);
        await sincronizarMesaReserva(null, mesaNum);
        saveStorage();
        render();
        toast('Cliente excluído.', 'success');
    }
    catch {
        toast('Erro ao excluir cliente.', 'error');
    }
}
async function liberarMesaCliente(id) {
    const c = APP.clientes.find(x => x.id === id);
    if (!c || !c.mesaReserva)
        return;
    const mesaNum = c.mesaReserva;
    if (!confirm(`Liberar a Mesa ${mesaNum} reservada para "${c.nome}"?`))
        return;
    try {
        const payload = { nome: c.nome, telefone: c.telefone, endereco: c.endereco, mesaReserva: null, dataEvento: null };
        const resp = await apiFetch(`/api/clientes/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
        if (!resp.ok)
            throw new Error();
        Object.assign(c, payload);
        await sincronizarMesaReserva(null, mesaNum);
        saveStorage();
        render();
        toast(`Mesa ${mesaNum} liberada!`, 'success');
    }
    catch {
        toast('Erro ao liberar mesa.', 'error');
    }
}
/* ── CAIXA ────────────────────────────────────────── */
function exportarCaixaXLS() {
    const hoje = new Date().setHours(0, 0, 0, 0);
    const pgHoje = APP.pagamentos.filter(p => p.data >= hoje);
    if (pgHoje.length === 0) {
        toast('Nenhum pagamento para exportar hoje', 'error');
        return;
    }
    const totalVal = pgHoje.reduce((s, p) => s + p.valor, 0);
    const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const linhas = pgHoje.map(pg => {
        const dt = new Date(pg.data);
        const data = dt.toLocaleDateString('pt-BR');
        const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const val = pg.valor.toFixed(2).replace('.', ',');
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixa-${dataStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Arquivo exportado com sucesso!', 'success');
}
function caixa() {
    const hoje = new Date().setHours(0, 0, 0, 0);
    const pgHoje = APP.pagamentos.filter(p => p.data >= hoje);
    const total = pgHoje.reduce((s, p) => s + p.valor, 0);
    const por = {};
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
function config() {
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
function previewConfig() {
    const nomeEl = document.getElementById('cfgNomeInline');
    const logoEl = document.getElementById('cfgLogoInline');
    const corEl = document.getElementById('cfgCorInline');
    const fonteEl = document.getElementById('cfgFonteInline');
    if (!nomeEl || !corEl)
        return;
    APP.config.nome = nomeEl.value.trim() || 'Pizzaria';
    const logoUrl = logoEl ? logoEl.value.trim() : '';
    if (logoUrl)
        APP.config.logo = logoUrl;
    APP.config.cor = corEl.value;
    if (fonteEl) {
        APP.config.fonteTamanho = parseInt(fonteEl.value) || 14;
        document.getElementById('cfgFonteValor').textContent = String(APP.config.fonteTamanho);
    }
    applyBranding();
    applyFontSize();
    updateConfigPreview();
}
function updateConfigPreview() {
    const previewNome = document.getElementById('cfgPreviewNome');
    const previewLogo = document.getElementById('cfgPreviewLogo');
    if (previewNome)
        previewNome.textContent = APP.config.nome;
    if (previewLogo) {
        previewLogo.style.background = APP.config.cor;
        previewLogo.innerHTML = APP.config.logo
            ? `<img src="${escapeHtml(APP.config.logo)}" alt="Logo">`
            : escapeHtml((APP.config.nome || 'P')[0].toUpperCase());
    }
}
function handleLogoUpload(file) {
    if (!file)
        return;
    if (!file.type.startsWith('image/')) {
        toast('Selecione um arquivo de imagem.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        APP.config.logo = reader.result;
        const logoUrl = document.getElementById('cfgLogoInline');
        if (logoUrl)
            logoUrl.value = '';
        previewConfig();
    };
    reader.readAsDataURL(file);
}
function limparLogoConfig() {
    APP.config.logo = '';
    const logoUrl = document.getElementById('cfgLogoInline');
    const logoFile = document.getElementById('cfgLogoFileInline');
    if (logoUrl)
        logoUrl.value = '';
    if (logoFile)
        logoFile.value = '';
    previewConfig();
}
async function salvarConfigInline() {
    previewConfig();
    const nm = parseInt(document.getElementById('cfgMesasInline').value) || 10;
    if (nm !== APP.config.numMesas) {
        APP.config.numMesas = nm;
        initMesas();
        apiFetch('/api/mesas/', { method: 'POST', body: JSON.stringify({ total: nm }) })
            .then(r => r.ok ? r.json() : null)
            .then(mesas => { if (mesas) {
            APP.mesas = mesas;
            render();
        } })
            .catch(() => { });
    }
    saveStorage();
    applyBranding();
    applyFontSize();
    await salvarConfigServidor(true);
    render();
}
async function salvarConfig() {
    APP.config.nome = document.getElementById('cfgNome').value.trim() || 'Pizzaria';
    APP.config.logo = document.getElementById('cfgLogo').value.trim();
    APP.config.cor = document.getElementById('cfgCor').value;
    const nm = parseInt(document.getElementById('cfgMesas').value) || 10;
    if (nm !== APP.config.numMesas) {
        APP.config.numMesas = nm;
        initMesas();
    }
    saveStorage();
    applyBranding();
    applyFontSize();
    await salvarConfigServidor(true);
    closeModal('modalConfig');
    render();
}
/* ══════════════════════════════════════════════════════
   PEDIDO MODAL
══════════════════════════════════════════════════════ */
function openModalPedido() {
    APP.pedidoTemp = { items: [], tipo: 'salao', mesaId: null, clienteId: null };
    document.getElementById('pedTipo').value = 'salao';
    renderPedidoExtra();
    renderPedidoItems();
    populatePedidoItem();
    openModal('modalPedido');
}
function renderPedidoExtra() {
    const tipo = document.getElementById('pedTipo').value;
    const el = document.getElementById('extraPedido');
    if (tipo === 'salao') {
        const livres = APP.mesas.filter(m => m.status !== 'ocupada');
        el.innerHTML = `<label>Mesa</label>
    <select class="form-control" id="pedMesa">
      ${livres.map(m => `<option value="${m.id}">Mesa ${m.numero} (${statusLabel(m.status)})</option>`).join('')}
    </select>`;
    }
    else {
        el.innerHTML = `<label>Cliente</label>
    <select class="form-control" id="pedCliente">
      <option value="">-- Sem cliente --</option>
      ${APP.clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
    </select>`;
    }
}
function populatePedidoItem() {
    const sel = document.getElementById('pedItem');
    const ativos = APP.cardapio.filter(i => i.ativo);
    sel.innerHTML = ativos.map(i => `<option value="${i.id}">${i.nome} ${i.tamanho ? `(${i.tamanho})` : ''} — ${money(i.preco)}</option>`).join('');
}
function addItemPedido() {
    const itemId = parseInt(document.getElementById('pedItem').value);
    const qtd = parseInt(document.getElementById('pedQtd').value) || 1;
    const obs = document.getElementById('pedObs').value.trim();
    const item = APP.cardapio.find(x => x.id === itemId);
    if (!item)
        return;
    const existing = APP.pedidoTemp.items.find(i => i.id === itemId && i.obs === obs);
    if (existing) {
        existing.qtd += qtd;
    }
    else {
        APP.pedidoTemp.items.push({ id: item.id, nome: item.nome, preco: item.preco, qtd, obs });
    }
    document.getElementById('pedObs').value = '';
    renderPedidoItems();
}
function renderPedidoItems() {
    const items = APP.pedidoTemp.items;
    const total = pedTotalCalc(items);
    document.getElementById('pedTotal').textContent = money(total);
    if (items.length === 0) {
        document.getElementById('pedItensList').innerHTML =
            '<div class="text-muted text-sm" style="padding:8px 0">Nenhum item adicionado</div>';
        return;
    }
    document.getElementById('pedItensList').innerHTML = `
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
function removeItemPedido(i) {
    APP.pedidoTemp.items.splice(i, 1);
    renderPedidoItems();
}
async function salvarPedido() {
    const tipo = document.getElementById('pedTipo').value;
    const items = APP.pedidoTemp.items;
    if (items.length === 0) {
        toast('Adicione pelo menos um item', 'error');
        return;
    }
    let mesaId = null, mesaNum = null;
    let clienteId = null, clienteNome = '';
    if (tipo === 'salao') {
        const mSel = document.getElementById('pedMesa');
        mesaId = mSel ? parseInt(mSel.value) : null;
        const m = APP.mesas.find(x => x.id === mesaId);
        if (!m) {
            toast('Selecione uma mesa', 'error');
            return;
        }
        mesaNum = m.numero;
    }
    else {
        const cSel = document.getElementById('pedCliente');
        clienteId = cSel && cSel.value ? parseInt(cSel.value) : null;
        const c = clienteId ? APP.clientes.find(x => x.id === clienteId) : null;
        clienteNome = c ? c.nome : 'Avulso';
    }
    const criadoEm = Date.now();
    const total = pedTotalCalc(items);
    try {
        const resp = await apiFetch('/api/pedidos/', {
            method: 'POST',
            body: JSON.stringify({
                tipo, mesaId, mesaNum, clienteId, clienteNome,
                total, status: 'Em preparo', criadoEm,
                items: items.map(i => ({ id: i.id, qtd: i.qtd, preco: i.preco, obs: i.obs })),
            }),
        });
        if (!resp.ok)
            throw new Error('Falha ao criar pedido');
        const pedido = await resp.json();
        APP.pedidos.push(pedido);
        if (tipo === 'salao' && mesaId !== null) {
            const m = APP.mesas.find(x => x.id === mesaId);
            if (m) {
                m.status = 'ocupada';
                m.horaAbertura = criadoEm;
                apiFetch(`/api/mesas/${mesaId}/`, { method: 'PUT', body: JSON.stringify({ status: 'ocupada', abertura: criadoEm }) });
            }
        }
        saveStorage();
        closeModal('modalPedido');
        render();
        toast(`Pedido #${pedido.id} aberto!`, 'success');
    }
    catch (e) {
        toast('Erro ao criar pedido no servidor. Verifique o Django.', 'error');
    }
}
/* ══════════════════════════════════════════════════════
   FECHAR CONTA
══════════════════════════════════════════════════════ */
function abrirFecharConta(mesaId) {
    closeModal('modalMesa');
    const pedAtivos = APP.pedidos.filter(p => p.mesaId === mesaId && p.status !== 'Finalizado');
    if (pedAtivos.length === 0) {
        toast('Sem pedidos abertos nesta mesa', 'error');
        return;
    }
    abrirFecharContaPedido(pedAtivos[0].id);
}
function abrirFecharContaPedido(pedidoId) {
    const p = APP.pedidos.find(x => x.id === pedidoId);
    if (!p)
        return;
    APP.fecharPedidoId = pedidoId;
    document.getElementById('fecharBody').innerHTML = `
  <div style="margin-bottom:12px">
    <div class="flex items-center justify-between mb-2">
      <strong>Pedido #${p.id}</strong>
      <span>${p.tipo === 'salao' ? 'Mesa ' + p.mesaNum : p.clienteNome || 'Delivery'}</span>
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
    document.querySelectorAll('input[name="formaPag"]').forEach(el => el.checked = false);
    openModal('modalFechar');
}
async function confirmarFechamento() {
    const id = APP.fecharPedidoId;
    const p = APP.pedidos.find(x => x.id === id);
    if (!p)
        return;
    const formaEl = document.querySelector('input[name="formaPag"]:checked');
    if (!formaEl) {
        toast('Selecione o método de pagamento!', 'error');
        return;
    }
    const forma = formaEl.value;
    const dataPag = Date.now();
    const desc = p.tipo === 'salao' ? 'Mesa ' + p.mesaNum : (p.clienteNome || 'Delivery');
    try {
        const r1 = await apiFetch(`/api/pedidos/${id}/`, { method: 'PUT', body: JSON.stringify({ status: 'Finalizado' }) });
        if (!r1.ok) {
            const err = await r1.json().catch(() => ({}));
            throw new Error(`Pedido: ${r1.status} ${err.erro || r1.statusText}`);
        }
        const r2 = await apiFetch('/api/pagamentos/', {
            method: 'POST',
            body: JSON.stringify({ pedidoId: id, forma, valor: p.total, data: dataPag, desc }),
        });
        if (!r2.ok) {
            const err = await r2.json().catch(() => ({}));
            throw new Error(`Pagamento: ${r2.status} ${err.erro || r2.statusText}`);
        }
        p.status = 'Finalizado';
        APP.pagamentos.push({ pedidoId: id, forma, valor: p.total, data: dataPag, desc });
        if (p.mesaId) {
            const pendentes = APP.pedidos.filter(pp => pp.mesaId === p.mesaId && pp.status !== 'Finalizado');
            if (pendentes.length === 0) {
                const m = APP.mesas.find(m => m.id === p.mesaId);
                if (m) {
                    m.status = 'livre';
                    m.horaAbertura = null;
                    apiFetch(`/api/mesas/${p.mesaId}/`, { method: 'PUT', body: JSON.stringify({ status: 'livre', abertura: null }) });
                }
            }
        }
        saveStorage();
        closeModal('modalFechar');
        render();
        toast(`Pagamento de ${money(p.total)} registrado!`, 'success');
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast(`Erro: ${msg}`, 'error');
    }
}
/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function toggleSenhaVisivel(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp)
        return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}
function mostrarLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}
function mostrarApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}
function aplicarUsuarioLogado(usuario) {
    APP.auth.usuario = usuario;
    const el = document.getElementById('sidebarUser');
    if (el)
        el.textContent = usuario.nome + ' · ' + ({ admin: 'Admin', garcom: 'Garçom', cozinha: 'Cozinha' }[usuario.papel] || usuario.papel);
    const permitidas = paginasPorPapel[usuario.papel] || ['dashboard'];
    document.querySelectorAll('.nav-item[data-page]').forEach(navEl => {
        const page = navEl.dataset.page;
        navEl.style.display = permitidas.includes(page) ? 'flex' : 'none';
    });
    const navSecCadastros = document.getElementById('navSecCadastros');
    if (navSecCadastros)
        navSecCadastros.style.display =
            (permitidas.includes('cardapio') || permitidas.includes('clientes')) ? 'block' : 'none';
    const navSecPrincipal = document.getElementById('navSecPrincipal');
    if (navSecPrincipal)
        navSecPrincipal.style.display = 'block';
    const navSecFinanceiro = document.getElementById('navSecFinanceiro');
    if (navSecFinanceiro)
        navSecFinanceiro.style.display = permitidas.includes('caixa') ? 'block' : 'none';
    const navSecSistema = document.getElementById('navSecSistema');
    if (navSecSistema)
        navSecSistema.style.display = usuario.papel === 'admin' ? 'block' : 'none';
    const ll = document.getElementById('loginLogo');
    if (ll) {
        ll.textContent = (APP.config.nome || 'P')[0].toUpperCase();
        ll.style.background = APP.config.cor;
    }
    const ln = document.getElementById('loginNome');
    if (ln)
        ln.textContent = APP.config.nome;
}
async function verificarAuth() {
    if (!APP.auth.token) {
        mostrarLogin();
        return;
    }
    try {
        const resp = await apiFetch('/api/auth/me/');
        if (resp.ok) {
            const usuario = await resp.json();
            aplicarUsuarioLogado(usuario);
            if (usuario.deveTrocarSenha) {
                abrirTrocarSenha(true);
                mostrarApp();
                return;
            }
            mostrarApp();
        }
        else {
            APP.auth.token = null;
            localStorage.removeItem('authToken');
            mostrarLogin();
        }
    }
    catch (e) {
        mostrarLogin();
    }
}
async function fazerLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginPass').value;
    const erroEl = document.getElementById('loginErro');
    const btn = document.getElementById('loginBtn');
    erroEl.style.display = 'none';
    if (!username || !senha) {
        erroEl.textContent = 'Preencha usuário e senha';
        erroEl.style.display = 'block';
        return;
    }
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    try {
        const resp = await fetch(apiUrl('/api/auth/login/'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, senha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
            erroEl.textContent = data.erro || 'Erro ao entrar';
            erroEl.style.display = 'block';
            return;
        }
        APP.auth.token = data.token;
        localStorage.setItem('authToken', data.token);
        aplicarUsuarioLogado(data.usuario);
        document.getElementById('loginPass').value = '';
        if (data.usuario.deveTrocarSenha) {
            mostrarApp();
            abrirTrocarSenha(true);
            return;
        }
        mostrarApp();
        await carregarDados();
        navigate('dashboard');
    }
    catch (e) {
        erroEl.textContent = 'Sem conexão com o servidor. Verifique se o Django está rodando em http://127.0.0.1:8000';
        erroEl.style.display = 'block';
    }
    finally {
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
}
async function fazerLogout() {
    try {
        await apiFetch('/api/auth/logout/', { method: 'POST' });
    }
    catch (e) { }
    APP.auth.token = null;
    APP.auth.usuario = null;
    localStorage.removeItem('authToken');
    mostrarLogin();
}
function abrirTrocarSenha(primeiroAcesso = false) {
    ['tsSenhaAtual', 'tsNovaSenha', 'tsConfirmar'].forEach(id => (document.getElementById(id).value = ''));
    const aviso = document.getElementById('trocaSenhaAviso');
    const titulo = document.getElementById('trocaSenhaTitulo');
    const cancelar = document.getElementById('tsCancelarBtn');
    aviso.style.display = primeiroAcesso ? 'block' : 'none';
    titulo.textContent = primeiroAcesso ? 'Primeiro Acesso' : 'Trocar Senha';
    cancelar.style.display = primeiroAcesso ? 'none' : '';
    openModal('modalTrocarSenha');
}
async function trocarSenha() {
    const senhaAtual = document.getElementById('tsSenhaAtual').value;
    const novaSenha = document.getElementById('tsNovaSenha').value;
    const confirmar = document.getElementById('tsConfirmar').value;
    if (!senhaAtual || !novaSenha || !confirmar) {
        toast('Preencha todos os campos', 'error');
        return;
    }
    if (novaSenha !== confirmar) {
        toast('As senhas não conferem', 'error');
        return;
    }
    if (novaSenha.length < 6) {
        toast('A nova senha deve ter no mínimo 6 caracteres', 'error');
        return;
    }
    try {
        const resp = await apiFetch('/api/auth/trocar-senha/', {
            method: 'POST', body: JSON.stringify({ senhaAtual, novaSenha }),
        });
        const data = await resp.json();
        if (!resp.ok) {
            toast(data.erro || 'Erro ao trocar senha', 'error');
            return;
        }
        APP.auth.token = data.token;
        localStorage.setItem('authToken', data.token);
        aplicarUsuarioLogado(data.usuario);
        closeModal('modalTrocarSenha');
        toast('Senha alterada com sucesso!', 'success');
        await carregarDados();
        navigate('dashboard');
    }
    catch (e) {
        toast('Erro ao conectar com o servidor', 'error');
    }
}
/* ── PÁGINA USUÁRIOS (admin) ─────────────────────────── */
let _editandoUsuarioId = null;
function usuarios() {
    return `
  <div class="card">
    <div class="card-header">
      <div class="card-title">Usuários do Sistema</div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()">+ Novo Usuário</button>
    </div>
    <div id="usuariosTabela"><div class="empty"><h3>Carregando...</h3></div></div>
  </div>`;
}
async function afterRenderUsuarios() {
    if (APP.currentPage !== 'usuarios')
        return;
    try {
        const resp = await apiFetch('/api/usuarios/');
        if (!resp.ok) {
            document.getElementById('usuariosTabela').innerHTML =
                '<div class="empty"><h3>Sem permissão</h3></div>';
            return;
        }
        const lista = await resp.json();
        const mim = APP.auth.usuario?.id;
        const papelLabel = { admin: 'Admin', garcom: 'Garçom', cozinha: 'Cozinha' };
        document.getElementById('usuariosTabela').innerHTML = lista.length === 0
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
    }
    catch (e) {
        document.getElementById('usuariosTabela').innerHTML =
            '<div class="empty"><h3>Erro ao carregar</h3></div>';
    }
}
function abrirModalUsuario(id = null) {
    _editandoUsuarioId = id;
    document.getElementById('modalUsuarioTitle').textContent = id ? 'Editar Usuário' : 'Novo Usuário';
    document.getElementById('uSenhaGrupo').style.display = '';
    ['uNome', 'uUsername', 'uSenha'].forEach(i => (document.getElementById(i).value = ''));
    document.getElementById('uPapel').value = 'garcom';
    document.getElementById('uUsername').disabled = !!id;
    const labelEl = document.getElementById('uSenhaGrupo').querySelector('label');
    if (id) {
        labelEl.textContent = 'Nova senha (deixe em branco para não alterar)';
    }
    else {
        labelEl.innerHTML = 'Senha temporária <span class="text-muted">(mín. 6 caracteres)</span>';
    }
    openModal('modalUsuario');
}
async function salvarUsuario() {
    const nome = document.getElementById('uNome').value.trim();
    const username = document.getElementById('uUsername').value.trim();
    const senha = document.getElementById('uSenha').value;
    const papel = document.getElementById('uPapel').value;
    try {
        let resp;
        if (_editandoUsuarioId) {
            const body = { nome, papel };
            if (senha)
                body.novaSenha = senha;
            resp = await apiFetch(`/api/usuarios/${_editandoUsuarioId}/`, { method: 'PUT', body: JSON.stringify(body) });
        }
        else {
            if (!username || !senha) {
                toast('Usuário e senha são obrigatórios', 'error');
                return;
            }
            resp = await apiFetch('/api/usuarios/', { method: 'POST', body: JSON.stringify({ nome, username, senha, papel }) });
        }
        const data = await resp.json();
        if (!resp.ok) {
            toast(data.erro || 'Erro ao salvar', 'error');
            return;
        }
        closeModal('modalUsuario');
        toast(_editandoUsuarioId ? 'Usuário atualizado!' : 'Usuário criado! Ele deve trocar a senha no primeiro acesso.', 'success');
        afterRenderUsuarios();
    }
    catch (e) {
        toast('Erro ao conectar com o servidor', 'error');
    }
}
async function excluirUsuario(id, nome) {
    if (!confirm(`Excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`))
        return;
    try {
        const resp = await apiFetch(`/api/usuarios/${id}/`, { method: 'DELETE' });
        if (!resp.ok) {
            const d = await resp.json();
            toast(d.erro || 'Erro ao excluir', 'error');
            return;
        }
        toast('Usuário excluído', 'success');
        afterRenderUsuarios();
    }
    catch (e) {
        toast('Erro ao conectar com o servidor', 'error');
    }
}
/* ══════════════════════════════════════════════════════
   KDS AUTO-REFRESH
══════════════════════════════════════════════════════ */
setInterval(() => {
    if (APP.currentPage === 'kds')
        render();
    updateBadge();
}, 30000);
/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
(async () => {
    await carregarConfigServidor();
    const ll = document.getElementById('loginLogo');
    if (ll) {
        ll.textContent = (APP.config.nome || 'P')[0].toUpperCase();
        ll.style.background = APP.config.cor;
    }
    const ln = document.getElementById('loginNome');
    if (ln)
        ln.textContent = APP.config.nome;
    await verificarAuth();
    if (APP.auth.usuario && !APP.auth.usuario.deveTrocarSenha) {
        await carregarDados();
        navigate('dashboard');
    }
})();
//# sourceMappingURL=app.js.map