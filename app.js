// ===== STATE =====
const STATE_KEY = 'ai_hub_state';

const DEFAULT_TOOLS = [
  { id: 'chatgpt',        name: 'ChatGPT',           emoji: '🤖', color: '#10a37f' },
  { id: 'claude',         name: 'Claude',            emoji: '🧠', color: '#c97a3e' },
  { id: 'gemini',         name: 'Gemini',            emoji: '✨', color: '#4285f4' },
  { id: 'midjourney',     name: 'Midjourney',        emoji: '🎨', color: '#eb459e' },
  { id: 'stablediffusion',name: 'Stable Diffusion',  emoji: '🖼️', color: '#7c3aed' },
  { id: 'dalle',          name: 'DALL·E',            emoji: '🌈', color: '#ff6b35' },
  { id: 'copilot',        name: 'GitHub Copilot',    emoji: '🚀', color: '#6366f1' },
  { id: 'suno',           name: 'Suno',              emoji: '🎵', color: '#f59e0b' },
  { id: 'runway',         name: 'Runway',            emoji: '🎬', color: '#06b6d4' },
  { id: 'perplexity',     name: 'Perplexity',        emoji: '🔎', color: '#8b5cf6' },
];

let state = loadState();

// ===== UI REFS =====
const toolList       = document.getElementById('toolList');
const resourcesGrid  = document.getElementById('resourcesGrid');
const emptyState     = document.getElementById('emptyState');
const sectionTitle   = document.getElementById('sectionTitle');
const sectionSubtitle = document.getElementById('sectionSubtitle');
const searchInput    = document.getElementById('searchInput');

// Resource modal
const modalResource  = document.getElementById('modalResource');
const resourceForm   = document.getElementById('resourceForm');
const modalResTitle  = document.getElementById('modalResourceTitle');
const fldId          = document.getElementById('resourceId');
const fldTool        = document.getElementById('resourceTool');
const fldType        = document.getElementById('resourceType');
const fldTitle       = document.getElementById('resourceTitle');
const fldContent     = document.getElementById('resourceContent');
const fldBody        = document.getElementById('resourceBody');
const fldSource      = document.getElementById('resourceSource');
const fldNotes       = document.getElementById('resourceNotes');
const fldTags        = document.getElementById('resourceTags');
const contentGroup   = document.getElementById('contentGroup');
const bodyGroup      = document.getElementById('bodyGroup');
const contentLabel   = document.getElementById('contentLabel');

// Tool modal
const modalTool      = document.getElementById('modalTool');
const toolForm       = document.getElementById('toolForm');
const fldToolName    = document.getElementById('toolName');
const fldToolEmoji   = document.getElementById('toolEmoji');
const fldToolColor   = document.getElementById('toolColor');

// View modal
const modalView      = document.getElementById('modalView');
const viewTitle      = document.getElementById('viewTitle');
const viewBody       = document.getElementById('viewBody');
const viewEdit       = document.getElementById('viewEdit');
const viewDelete     = document.getElementById('viewDelete');

// ===== FILTER STATE =====
let currentTool   = 'all';
let currentFilter = 'all';
let currentSearch = '';
let viewingId     = null;

// ===== LOAD / SAVE =====
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tools: parsed.tools || [...DEFAULT_TOOLS],
        resources: parsed.resources || [],
      };
    }
  } catch (_) {}
  return { tools: [...DEFAULT_TOOLS], resources: [] };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// ===== HELPERS =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function isUrl(str) {
  return /^https?:\/\//i.test(str.trim());
}

function getTypeBadge(type) {
  const map = { webpage: '🔗 Página', social: '📱 Red Social', text: '📝 Texto' };
  return map[type] || type;
}

function getTypeClass(type) {
  return `badge-${type}`;
}

function getTool(id) {
  return state.tools.find(t => t.id === id);
}

// ===== RENDER SIDEBAR =====
function renderSidebar() {
  // Clear dynamic items (keep 'all')
  const all = toolList.querySelector('[data-tool="all"]');
  toolList.innerHTML = '';
  toolList.appendChild(all);

  // Update 'all' count
  document.getElementById('count-all').textContent = state.resources.length;

  state.tools.forEach(tool => {
    const count = state.resources.filter(r => r.toolId === tool.id).length;
    const li = document.createElement('li');
    li.className = 'tool-item' + (currentTool === tool.id ? ' active' : '');
    li.dataset.tool = tool.id;
    li.style.setProperty('--tool-color', tool.color);
    li.innerHTML = `
      <span class="tool-emoji">${escapeHtml(tool.emoji)}</span>
      <span class="tool-name">${escapeHtml(tool.name)}</span>
      <span class="tool-count">${count}</span>
    `;
    li.addEventListener('click', () => selectTool(tool.id));
    toolList.appendChild(li);
  });

  // Update all count
  document.getElementById('count-all').textContent = state.resources.length;

  // Update tool select in form
  const prevVal = fldTool.value;
  fldTool.innerHTML = '<option value="">— Selecciona una herramienta —</option>';
  state.tools.forEach(tool => {
    const opt = document.createElement('option');
    opt.value = tool.id;
    opt.textContent = `${tool.emoji} ${tool.name}`;
    fldTool.appendChild(opt);
  });
  if (prevVal) fldTool.value = prevVal;
}

// ===== SELECT TOOL =====
function selectTool(toolId) {
  currentTool = toolId;

  document.querySelectorAll('.tool-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tool === toolId);
  });

  if (toolId === 'all') {
    sectionTitle.textContent = 'Todos los recursos';
    sectionSubtitle.textContent = 'Explora todos los recursos guardados';
  } else {
    const tool = getTool(toolId);
    sectionTitle.textContent = `${tool.emoji} ${tool.name}`;
    sectionSubtitle.textContent = `Recursos guardados para ${tool.name}`;
  }

  renderResources();
}

// ===== RENDER RESOURCES =====
function renderResources() {
  let list = [...state.resources];

  // Filter by tool
  if (currentTool !== 'all') {
    list = list.filter(r => r.toolId === currentTool);
  }

  // Filter by type
  if (currentFilter !== 'all') {
    list = list.filter(r => r.type === currentFilter);
  }

  // Filter by search
  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.content || '').toLowerCase().includes(q) ||
      (r.body || '').toLowerCase().includes(q) ||
      (r.source || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort by date desc
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  resourcesGrid.innerHTML = '';

  if (list.length === 0) {
    emptyState.style.display = 'flex';
    resourcesGrid.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  resourcesGrid.style.display = 'grid';

  list.forEach(resource => {
    const tool = getTool(resource.toolId);
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.style.setProperty('--card-color', tool ? tool.color : '#6366f1');

    const displayContent = resource.type === 'text'
      ? (resource.body || '').slice(0, 120)
      : (resource.content || '');

    const tagsHtml = (resource.tags || []).length
      ? `<div class="card-tags">${resource.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    const sourceHtml = resource.source
      ? `<div class="card-source">📌 ${escapeHtml(resource.source)}</div>`
      : '';

    card.innerHTML = `
      <div class="card-top">
        <div class="card-badges">
          ${tool ? `<span class="badge badge-tool">${escapeHtml(tool.emoji)} ${escapeHtml(tool.name)}</span>` : ''}
          <span class="badge ${getTypeClass(resource.type)}">${getTypeBadge(resource.type)}</span>
        </div>
        <span class="card-date">${formatDate(resource.createdAt)}</span>
      </div>
      <div class="card-title">${escapeHtml(resource.title)}</div>
      ${displayContent ? `<div class="card-content">${escapeHtml(displayContent)}</div>` : ''}
      ${sourceHtml}
      ${tagsHtml}
    `;

    card.addEventListener('click', () => openViewModal(resource.id));
    resourcesGrid.appendChild(card);
  });
}

// ===== OPEN VIEW MODAL =====
function openViewModal(id) {
  const r = state.resources.find(x => x.id === id);
  if (!r) return;

  viewingId = id;
  const tool = getTool(r.toolId);

  viewTitle.textContent = r.title;

  let html = `<div class="view-badges">`;
  if (tool) html += `<span class="badge badge-tool">${escapeHtml(tool.emoji)} ${escapeHtml(tool.name)}</span>`;
  html += `<span class="badge ${getTypeClass(r.type)}">${getTypeBadge(r.type)}</span>`;
  html += `</div>`;

  if (r.type !== 'text' && r.content) {
    html += `<div class="view-section">
      <div class="view-label">${r.type === 'webpage' ? 'URL / Enlace' : 'Enlace / Referencia'}</div>
      <div class="view-content">`;
    if (isUrl(r.content)) {
      html += `<a class="view-link" href="${escapeHtml(r.content)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.content)}</a>`;
    } else {
      html += escapeHtml(r.content);
    }
    html += `</div></div>`;
  }

  if (r.body) {
    html += `<div class="view-section">
      <div class="view-label">Contenido</div>
      <div class="view-content">${escapeHtml(r.body)}</div>
    </div>`;
  }

  if (r.source) {
    html += `<div class="view-section">
      <div class="view-label">Fuente / Autor</div>
      <div class="view-content">${escapeHtml(r.source)}</div>
    </div>`;
  }

  if (r.notes) {
    html += `<div class="view-section">
      <div class="view-label">Notas personales</div>
      <div class="view-content">${escapeHtml(r.notes)}</div>
    </div>`;
  }

  if (r.tags && r.tags.length) {
    html += `<div class="view-section">
      <div class="view-label">Etiquetas</div>
      <div class="card-tags">${r.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    </div>`;
  }

  html += `<div class="view-section">
    <div class="view-label">Fecha</div>
    <div class="view-content">${formatDate(r.createdAt)}</div>
  </div>`;

  viewBody.innerHTML = html;
  modalView.style.display = 'flex';
}

// ===== OPEN RESOURCE MODAL (add/edit) =====
function openResourceModal(id = null) {
  resourceForm.reset();
  fldId.value = '';
  fldType.value = 'webpage';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'webpage'));
  updateTypeUI('webpage');

  if (id) {
    const r = state.resources.find(x => x.id === id);
    if (!r) return;
    modalResTitle.textContent = 'Editar Recurso';
    fldId.value       = r.id;
    fldTool.value     = r.toolId;
    fldType.value     = r.type;
    fldTitle.value    = r.title;
    fldContent.value  = r.content || '';
    fldBody.value     = r.body || '';
    fldSource.value   = r.source || '';
    fldNotes.value    = r.notes || '';
    fldTags.value     = (r.tags || []).join(', ');
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === r.type));
    updateTypeUI(r.type);
  } else {
    modalResTitle.textContent = 'Agregar Recurso';
    if (currentTool !== 'all') fldTool.value = currentTool;
  }

  modalView.style.display = 'none';
  modalResource.style.display = 'flex';
}

// ===== TYPE UI =====
function updateTypeUI(type) {
  if (type === 'text') {
    contentGroup.style.display = 'none';
    bodyGroup.style.display = 'flex';
  } else {
    contentGroup.style.display = 'flex';
    bodyGroup.style.display = 'flex';
    contentLabel.textContent = type === 'webpage' ? 'URL' : 'Enlace / URL del post';
  }
}

// ===== SAVE RESOURCE =====
resourceForm.addEventListener('submit', e => {
  e.preventDefault();

  const tags = fldTags.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const data = {
    toolId:    fldTool.value,
    type:      fldType.value,
    title:     fldTitle.value.trim(),
    content:   fldContent.value.trim(),
    body:      fldBody.value.trim(),
    source:    fldSource.value.trim(),
    notes:     fldNotes.value.trim(),
    tags,
  };

  if (!data.toolId) { alert('Por favor selecciona una herramienta IA.'); return; }
  if (!data.title)  { alert('El título es obligatorio.'); return; }

  if (fldId.value) {
    // Edit
    const idx = state.resources.findIndex(r => r.id === fldId.value);
    if (idx > -1) {
      state.resources[idx] = { ...state.resources[idx], ...data };
    }
  } else {
    // Add
    state.resources.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
  }

  saveState();
  closeAllModals();
  renderSidebar();
  renderResources();
});

// ===== SAVE TOOL =====
toolForm.addEventListener('submit', e => {
  e.preventDefault();

  const name  = fldToolName.value.trim();
  const emoji = fldToolEmoji.value.trim() || '🔧';
  const color = fldToolColor.value;

  if (!name) return;

  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (state.tools.find(t => t.id === id)) {
    alert('Ya existe una herramienta con ese nombre.');
    return;
  }

  state.tools.push({ id, name, emoji, color });
  saveState();
  closeAllModals();
  renderSidebar();
  renderResources();
});

// ===== DELETE RESOURCE =====
viewDelete.addEventListener('click', () => {
  if (!viewingId) return;
  if (!confirm('¿Eliminar este recurso?')) return;
  state.resources = state.resources.filter(r => r.id !== viewingId);
  saveState();
  closeAllModals();
  renderSidebar();
  renderResources();
});

viewEdit.addEventListener('click', () => {
  openResourceModal(viewingId);
});

// ===== CLOSE MODALS =====
function closeAllModals() {
  modalResource.style.display = 'none';
  modalTool.style.display = 'none';
  modalView.style.display = 'none';
}

document.getElementById('closeModalResource').addEventListener('click', closeAllModals);
document.getElementById('cancelResource').addEventListener('click', closeAllModals);
document.getElementById('closeModalTool').addEventListener('click', closeAllModals);
document.getElementById('cancelTool').addEventListener('click', closeAllModals);
document.getElementById('closeModalView').addEventListener('click', closeAllModals);
document.getElementById('closeViewBtn').addEventListener('click', closeAllModals);

// Close on overlay click
[modalResource, modalTool, modalView].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeAllModals();
  });
});

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

// ===== OPEN MODALS =====
document.getElementById('btnAddResource').addEventListener('click', () => openResourceModal());
document.getElementById('btnAddTool').addEventListener('click', () => {
  toolForm.reset();
  fldToolColor.value = '#6366f1';
  modalTool.style.display = 'flex';
});

// ===== TYPE BUTTONS =====
document.getElementById('typeSelector').addEventListener('click', e => {
  const btn = e.target.closest('.type-btn');
  if (!btn) return;
  const type = btn.dataset.type;
  fldType.value = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b === btn));
  updateTypeUI(type);
});

// ===== FILTER TABS =====
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t === tab));
    renderResources();
  });
});

// ===== SIDEBAR TOOL CLICK (all) =====
toolList.querySelector('[data-tool="all"]').addEventListener('click', () => selectTool('all'));

// ===== SEARCH =====
searchInput.addEventListener('input', e => {
  currentSearch = e.target.value;
  renderResources();
});

// ===== INIT =====
renderSidebar();
renderResources();
