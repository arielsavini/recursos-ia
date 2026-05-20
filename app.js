// ===== STATE =====
const STATE_KEY = 'ai_hub_state';

const DEFAULT_TOOLS = [
  { id: 'chatgpt',        name: 'ChatGPT',           emoji: '🤖', color: '#10a37f', desc: 'Modelo de lenguaje de OpenAI para conversación, redacción, código y análisis.' },
  { id: 'claude',         name: 'Claude',            emoji: '🧠', color: '#c97a3e', desc: 'Asistente IA de Anthropic, orientado a análisis profundo y documentos largos.' },
  { id: 'gemini',         name: 'Gemini',            emoji: '✨', color: '#4285f4', desc: 'IA multimodal de Google, integrada con Drive, Docs y el ecosistema Google.' },
  { id: 'midjourney',     name: 'Midjourney',        emoji: '🎨', color: '#eb459e', desc: 'Generador de imágenes por IA con estética artística de alta calidad.' },
  { id: 'stablediffusion',name: 'Stable Diffusion',  emoji: '🖼️', color: '#7c3aed', desc: 'Modelo open-source para generación de imágenes, ejecutable de forma local.' },
  { id: 'dalle',          name: 'DALL·E',            emoji: '🌈', color: '#ff6b35', desc: 'Generador de imágenes de OpenAI, integrado directamente con ChatGPT.' },
  { id: 'copilot',        name: 'GitHub Copilot',    emoji: '🚀', color: '#6366f1', desc: 'Asistente de código IA integrado en el editor, potenciado por modelos de OpenAI.' },
  { id: 'suno',           name: 'Suno',              emoji: '🎵', color: '#f59e0b', desc: 'Genera canciones completas con letra e instrumentación a partir de un prompt.' },
  { id: 'runway',         name: 'Runway',            emoji: '🎬', color: '#06b6d4', desc: 'Suite de herramientas IA para generación y edición de video con IA.' },
  { id: 'perplexity',     name: 'Perplexity',        emoji: '🔎', color: '#8b5cf6', desc: 'Motor de búsqueda con IA que responde con fuentes verificadas en tiempo real.' },
  { id: 'notebooklm',     name: 'NotebookLM',        emoji: '📓', color: '#34a853', desc: 'Herramienta de Google para analizar, resumir y conversar con tus propios documentos.' },
  { id: 'educacion',      name: 'Educación',         emoji: '🎓', color: '#0ea5e9', desc: 'Recursos educativos sobre IA: cursos, tutoriales, guías y materiales de aprendizaje.' },
];

// ===== SEED RESOURCES =====
const SEED_RESOURCES = [
  {
    id: 'seed_notebooklm_local_01',
    toolId: 'notebooklm',
    type: 'webpage',
    title: 'NotebookLM Tips',
    content: 'https://arielsavini.github.io/recursos-ia/notebooklm-tips.html',
    body: '',
    source: 'arielsavini.github.io',
    notes: '',
    tags: ['tips', 'notebooklm', 'guia'],
    createdAt: '2026-05-20T00:00:00.000Z',
  },
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
let currentTool      = 'all';
let currentFilter    = 'all';
let currentSearch    = '';
let currentTopic     = null;
let viewingId        = null;
let pendingImageData = null;

// ===== LOAD / SAVE =====
function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const resources = parsed.resources || [];
      // Inject seed resources if not present
      SEED_RESOURCES.forEach(seed => {
        if (!resources.find(r => r.id === seed.id)) {
          resources.push({ ...seed, createdAt: new Date().toISOString() });
        }
      });
      return {
        tools: mergeTools(parsed.tools || []),
        resources,
      };
    }
  } catch (_) {}
  return { tools: [...DEFAULT_TOOLS], resources: [...SEED_RESOURCES] };
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  // Firebase sync (if configured)
  if (window._fbDoc) {
    window._fbDoc.set(state).catch(err => {
      if (err.code === 'resource-exhausted' || (err.message && err.message.includes('size'))) {
        console.warn('Firebase: documento demasiado grande (imágenes base64). Guardado solo en localStorage.');
      } else {
        console.warn('Firebase sync error:', err);
      }
    });
  }
}

// Ensures DEFAULT_TOOLS not yet in stored tools are added
function mergeTools(stored) {
  const result = [...stored];
  DEFAULT_TOOLS.forEach(def => {
    if (!result.find(t => t.id === def.id)) {
      result.push(def);
    }
  });
  return result;
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
  const map = { webpage: '🔗 Página', social: '📱 Red Social', text: '📝 Texto', image: '🖼️ Imagen' };
  return map[type] || type;
}

function getTypeClass(type) {
  return `badge-${type}`;
}

function getTool(id) {
  return state.tools.find(t => t.id === id);
}

function getResourceToolIds(r) {
  return r.toolIds || (r.toolId ? [r.toolId] : []);
}

// ===== RENDER TOOL PICKER =====
function renderToolPicker(selectedIds = []) {
  const picker = document.getElementById('toolPicker');
  if (!picker) return;
  picker.innerHTML = '';
  state.tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-pick-btn' + (selectedIds.includes(tool.id) ? ' selected' : '');
    btn.dataset.toolId = tool.id;
    btn.style.setProperty('--pick-color', tool.color);
    btn.textContent = `${tool.emoji} ${tool.name}`;
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
    picker.appendChild(btn);
  });
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
    const count = state.resources.filter(r => getResourceToolIds(r).includes(tool.id)).length;
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

  renderToolPicker([]);

  // Render topics
  renderTopics();
}

// ===== RENDER TOPICS =====
function renderTopics() {
  const container = document.getElementById('topicsList');
  if (!container) return;

  // Gather all tags from resources filtered by current tool
  let pool = currentTool === 'all'
    ? state.resources
    : state.resources.filter(r => getResourceToolIds(r).includes(currentTool));

  const allTags = pool.flatMap(r => r.tags || []);
  const counts = {};
  allTags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const topics = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = '';
  if (topics.length === 0) {
    container.innerHTML = '<span class="no-topics">Sin temas aún</span>';
    return;
  }

  topics.forEach(([tag, count]) => {
    const pill = document.createElement('button');
    pill.className = 'topic-pill' + (currentTopic === tag ? ' active' : '');
    pill.textContent = `#${tag}`;
    pill.title = `${count} recurso${count !== 1 ? 's' : ''}`;
    pill.addEventListener('click', () => selectTopic(tag));
    container.appendChild(pill);
  });
}

// ===== SELECT TOPIC =====
function selectTopic(tag) {
  currentTopic = currentTopic === tag ? null : tag;
  renderTopics();
  renderResources();
}

// ===== SELECT TOOL =====
function selectTool(toolId) {
  currentTool = toolId;

  document.querySelectorAll('.tool-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tool === toolId);
  });

  currentTopic = null;

  if (toolId === 'all') {
    sectionTitle.textContent = 'Todos los recursos';
    sectionSubtitle.textContent = 'Explora todos los recursos guardados';
  } else {
    const tool = getTool(toolId);
    sectionTitle.textContent = `${tool.emoji} ${tool.name}`;
    sectionSubtitle.textContent = tool.desc || `Recursos guardados para ${tool.name}`;
  }

  renderTopics();
  renderResources();
}

// ===== RENDER RESOURCES =====
function renderResources() {
  let list = [...state.resources];

  // Filter by tool
  if (currentTool !== 'all') {
    list = list.filter(r => getResourceToolIds(r).includes(currentTool));
  }

  // Filter by type
  if (currentFilter !== 'all') {
    list = list.filter(r => r.type === currentFilter);
  }

  // Filter by topic/hashtag
  if (currentTopic) {
    list = list.filter(r => (r.tags || []).includes(currentTopic));
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
    const rToolIds = getResourceToolIds(resource);
    const firstTool = rToolIds.length ? getTool(rToolIds[0]) : null;
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.style.setProperty('--card-color', firstTool ? firstTool.color : '#6366f1');

    const isImage = resource.type === 'image';
    const displayContent = resource.type === 'text'
      ? (resource.body || '').slice(0, 120)
      : isImage
        ? (isUrl(resource.content || '') ? resource.content : '')
        : (resource.content || '');

    const imageHtml = isImage && resource.content
      ? `<div class="card-image"><img src="${escapeHtml(resource.content)}" alt="${escapeHtml(resource.title)}" loading="lazy" /></div>`
      : '';

    const tagsHtml = (resource.tags || []).length
      ? `<div class="card-tags">${resource.tags.map(t => `<span class="tag hashtag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    const sourceHtml = resource.source
      ? `<div class="card-source">📌 ${escapeHtml(resource.source)}</div>`
      : '';

    card.innerHTML = `
      <div class="card-top">
        <div class="card-badges">
          ${rToolIds.map(tid => { const t = getTool(tid); return t ? `<span class="badge badge-tool">${escapeHtml(t.emoji)} ${escapeHtml(t.name)}</span>` : ''; }).join('')}
          <span class="badge ${getTypeClass(resource.type)}">${getTypeBadge(resource.type)}</span>
        </div>
        <span class="card-date">${formatDate(resource.createdAt)}</span>
      </div>
      <div class="card-title">${escapeHtml(resource.title)}</div>
      ${imageHtml}
      ${!isImage && displayContent ? `<div class="card-content">${escapeHtml(displayContent)}</div>` : ''}
      ${sourceHtml}
      ${tagsHtml}
    `;

    card.addEventListener('click', e => {
      const tagEl = e.target.closest('.hashtag');
      if (tagEl) {
        e.stopPropagation();
        selectTopic(tagEl.dataset.tag);
        return;
      }
      openViewModal(resource.id);
    });
    resourcesGrid.appendChild(card);
  });
}

// ===== OPEN VIEW MODAL =====
function openViewModal(id) {
  const r = state.resources.find(x => x.id === id);
  if (!r) return;

  viewingId = id;
  viewTitle.textContent = r.title;

  const vToolIds = getResourceToolIds(r);
  let html = `<div class="view-badges">`;
  vToolIds.forEach(tid => {
    const t = getTool(tid);
    if (t) html += `<span class="badge badge-tool">${escapeHtml(t.emoji)} ${escapeHtml(t.name)}</span>`;
  });
  html += `<span class="badge ${getTypeClass(r.type)}">${getTypeBadge(r.type)}</span>`;
  html += `</div>`;

  if (r.type === 'image' && r.content) {
    html += `<div class="view-section">
      <div class="view-label">Imagen</div>
      <img class="view-image-full" src="${escapeHtml(r.content)}" alt="${escapeHtml(r.title)}" />
    </div>`;
    if (isUrl(r.content)) {
      html += `<div class="view-section">
        <div class="view-label">URL de la imagen</div>
        <div class="view-content"><a class="view-link" href="${escapeHtml(r.content)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.content)}</a></div>
      </div>`;
    }
  } else if (r.type !== 'text' && r.content) {
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
      <div class="view-label">Temas</div>
      <div class="card-tags">${r.tags.map(t => `<span class="tag hashtag">#${escapeHtml(t)}</span>`).join('')}</div>
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
  // Reset image state
  pendingImageData = null;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imagePreviewImg').src = '';
  updateTypeUI('webpage');

  if (id) {
    const r = state.resources.find(x => x.id === id);
    if (!r) return;
    modalResTitle.textContent = 'Editar Recurso';
    fldId.value       = r.id;
    renderToolPicker(getResourceToolIds(r));
    fldType.value     = r.type;
    fldTitle.value    = r.title;
    fldContent.value  = r.type === 'image' ? '' : (r.content || '');
    fldBody.value     = r.body || '';
    fldSource.value   = r.source || '';
    fldNotes.value    = r.notes || '';
    fldTags.value     = (r.tags || []).join(', ');
    document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === r.type));
    updateTypeUI(r.type);
    // Show existing image preview
    if (r.type === 'image' && r.content) {
      document.getElementById('imagePreviewImg').src = r.content;
      document.getElementById('imagePreview').style.display = 'block';
    }
  } else {
    modalResTitle.textContent = 'Agregar Recurso';
    renderToolPicker(currentTool !== 'all' ? [currentTool] : []);
  }

  modalView.style.display = 'none';
  modalResource.style.display = 'flex';
}

// ===== TYPE UI =====
function updateTypeUI(type) {
  const imageGroup = document.getElementById('imageGroup');
  imageGroup.style.display = type === 'image' ? 'flex' : 'none';

  if (type === 'text') {
    contentGroup.style.display = 'none';
    bodyGroup.style.display = 'flex';
  } else if (type === 'image') {
    contentGroup.style.display = 'flex';
    contentLabel.textContent = 'URL de la imagen (opcional si subís archivo)';
    bodyGroup.style.display = 'none';
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

  const selectedToolIds = Array.from(
    document.querySelectorAll('#toolPicker .tool-pick-btn.selected')
  ).map(btn => btn.dataset.toolId);

  const resolvedContent = fldType.value === 'image' && pendingImageData
    ? pendingImageData
    : fldContent.value.trim();

  const data = {
    toolIds:   selectedToolIds,
    type:      fldType.value,
    title:     fldTitle.value.trim(),
    content:   resolvedContent,
    body:      fldBody.value.trim(),
    source:    fldSource.value.trim(),
    notes:     fldNotes.value.trim(),
    tags,
  };

  if (selectedToolIds.length === 0) { alert('Por favor seleccioná al menos una herramienta IA.'); return; }
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

// ===== IMAGE UPLOAD =====
document.getElementById('resourceImageFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) { pendingImageData = null; return; }
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImageData = ev.target.result;
    const preview = document.getElementById('imagePreview');
    const img    = document.getElementById('imagePreviewImg');
    img.src = pendingImageData;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
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

// ===== EXPORT =====
function exportData() {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ai-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('btnExport').addEventListener('click', exportData);

// ===== IMPORT =====
document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = ''; // reset para permitir reimportar el mismo archivo

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!parsed.resources || !Array.isArray(parsed.resources)) {
        alert('Archivo inválido: no se encontraron recursos.');
        return;
      }
      const customTools = (parsed.tools || []).filter(t => !DEFAULT_TOOLS.find(d => d.id === t.id));
      const msg =
        `Archivo: "${file.name}"\n` +
        `• ${parsed.resources.length} recursos\n` +
        `• ${customTools.length} herramientas personalizadas\n\n` +
        `¿Reemplazar todos los datos actuales con este archivo?`;
      if (!confirm(msg)) return;

      state = {
        tools: mergeTools(parsed.tools || []),
        resources: parsed.resources,
      };
      // Re-inyectar seeds si no están
      SEED_RESOURCES.forEach(seed => {
        if (!state.resources.find(r => r.id === seed.id)) {
          state.resources.push({ ...seed });
        }
      });
      saveState();
      renderSidebar();
      renderResources();
      alert(`✓ Importación exitosa. Se cargaron ${state.resources.length} recursos.`);
    } catch (_) {
      alert('Error al leer el archivo. Usá un JSON exportado desde esta app.');
    }
  };
  reader.readAsText(file);
});

// ===== AUTH UI =====
const ADMIN_EMAIL = 'arielsavini@gmail.com';

function renderAuthUI() {
  const area = document.getElementById('authArea');
  if (!area) return;

  if (window._isAdmin) {
    const user   = window._currentUser;
    const name   = escapeHtml(user.displayName || user.email);
    const avatar = user.photoURL
      ? `<img class="auth-avatar" src="${escapeHtml(user.photoURL)}" alt="" />`
      : '';
    area.innerHTML = `
      <span class="auth-user">${avatar}<span class="auth-name">${name}</span></span>
      <button class="btn-ghost auth-btn" id="btnSignOut">Salir</button>
    `;
    document.getElementById('btnSignOut').addEventListener('click',
      () => window._fbAuth && window._fbAuth.signOut());

  } else if (window._currentUser) {
    // Logueado pero no es admin
    area.innerHTML = `
      <span class="auth-readonly">Solo lectura</span>
      <button class="btn-ghost auth-btn" id="btnSignOut">Salir</button>
    `;
    document.getElementById('btnSignOut').addEventListener('click',
      () => window._fbAuth && window._fbAuth.signOut());

  } else {
    area.innerHTML = `<button class="btn-ghost auth-btn" id="btnSignIn">🔐 Acceder</button>`;
    document.getElementById('btnSignIn').addEventListener('click', () => {
      if (!window._fbAuth || !window.firebase) return;
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: ADMIN_EMAIL });
      window._fbAuth.signInWithPopup(provider)
        .catch(err => { console.warn('Sign-in error:', err); alert('Error al iniciar sesión. Intentá de nuevo.'); });
    });
  }
}

function updateAdminUI() {
  const adminEl = document.getElementById('adminButtons');
  if (adminEl) adminEl.style.display = window._isAdmin ? 'flex' : 'none';
  if (viewEdit)   viewEdit.style.display   = window._isAdmin ? '' : 'none';
  if (viewDelete) viewDelete.style.display = window._isAdmin ? '' : 'none';
}

// ===== INIT =====
renderSidebar();
renderResources();
renderAuthUI(); // muestra botón Acceder desde el inicio

// ===== FIREBASE SYNC =====
window._fbDoc        = null;
window._fbAuth       = null;
window._currentUser  = null;
window._isAdmin      = false;
window._fbIgnoreNext = false; // evita loop: propio save → onSnapshot → re-render

window.initFirebaseSync = function (config) {
  try {
    if (!window.firebase) { console.warn('Firebase SDK no cargado.'); return; }
    if (!firebase.apps.length) firebase.initializeApp(config);
    const db = firebase.firestore();
    window._fbDoc = db.collection('hub').doc('main');

    // 1. Carga inicial desde Firestore
    window._fbDoc.get().then(snap => {
      if (snap.exists) {
        const data = snap.data();
        const remoteResources = data.resources || [];
        const localResources  = state.resources || [];

        // Merge: combina ambos por ID, sin duplicados
        const merged = [...remoteResources];
        localResources.forEach(r => {
          if (!merged.find(x => x.id === r.id)) merged.push(r);
        });
        const mergedTools = mergeTools(data.tools || []);

        const incoming = { tools: mergedTools, resources: merged };
        SEED_RESOURCES.forEach(seed => {
          if (!incoming.resources.find(r => r.id === seed.id)) {
            incoming.resources.push({ ...seed });
          }
        });

        state = incoming;
        // Sube el merge a Firestore si el local tenía recursos nuevos
        window._fbDoc.set(state).then(() => {
          console.log(`Firebase: sincronizado (${state.resources.length} recursos) ✓`);
        });
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        renderSidebar();
        renderResources();
      } else {
        // Primera vez: sube el estado local a Firestore
        window._fbDoc.set(state).then(() => {
          console.log('Firebase: estado local subido a Firestore ✓');
        });
      }
    }).catch(err => console.warn('Firebase carga inicial error:', err));

    // 2. Listener en tiempo real (detecta cambios desde otro navegador)
    window._fbDoc.onSnapshot(snap => {
      if (!snap.exists || window._fbIgnoreNext) {
        window._fbIgnoreNext = false;
        return;
      }
      const data = snap.data();
      const localJson = JSON.stringify({ tools: state.tools, resources: state.resources });
      const remoteJson = JSON.stringify({ tools: data.tools || [], resources: data.resources || [] });
      if (localJson === remoteJson) return; // sin cambios reales

      state = {
        tools: mergeTools(data.tools || []),
        resources: data.resources || [],
      };
      SEED_RESOURCES.forEach(seed => {
        if (!state.resources.find(r => r.id === seed.id)) {
          state.resources.push({ ...seed });
        }
      });
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      renderSidebar();
      renderResources();
      console.log('Firebase: estado actualizado desde otro navegador ✓');
    }, err => console.warn('Firebase listener error:', err));

    // 3. Auth — Google Sign-In
    const auth = firebase.auth();
    window._fbAuth = auth;
    auth.onAuthStateChanged(user => {
      window._currentUser = user;
      window._isAdmin     = !!(user && user.email === ADMIN_EMAIL);
      renderAuthUI();
      updateAdminUI();
    });

  } catch (err) {
    console.warn('Firebase init error:', err);
  }
};
