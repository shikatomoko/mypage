const completedTabs = [
  { key: 'main', label: 'メイン' },
  { key: 'ongoing', label: '継続' },
  { key: 'planned', label: '通過予定' }
];

const gmTabs = [
  { key: 'main', label: 'メイン' },
  { key: 'ongoing', label: '継続' }
];

const filterOrder = ['ソロ', 'タイマン', 'KPレス', '1-2PL', '2-3PL', '1-4PL', '2PL', '3PL', '4PL'];

document.addEventListener('DOMContentLoaded', () => {
  loadPageData();
});

function loadPageData() {
  try {
    const data = getSiteData();

    applyMeta(data.profile.meta || {});
    renderLikes(data.profile.likes || []);
    renderCompletedScenarios(data.completed || {});
    renderScenarioSection('gm-content', data.gm || []);
    renderGallery(data.gallery || []);

    // Calculate counts from data (always use actual data count, not profile meta)
    const completedCount = (data.completed.main?.length || 0) + (data.completed.ongoing?.length || 0);
    const gmCount = Array.isArray(data.gm) ? data.gm.length : ((data.gm.main?.length || 0) + (data.gm.ongoing?.length || 0));
    document.getElementById('completed-count').textContent = String(completedCount);
    document.getElementById('gm-count').textContent = String(gmCount);

    bindTabSwitching();
    bindFilters();
    setupSlider();
  } catch (error) {
    showLoadError(error);
  }
}

function getSiteData() {
  if (!window.profileData || !window.completedData || !window.gmData || !window.galleryData) {
    throw new Error('Data files are not loaded');
  }

  return {
    profile: window.profileData,
    completed: window.completedData,
    gm: window.gmData,
    gallery: window.galleryData
  };
}

function applyMeta(meta) {
  if (meta.title) {
    document.title = meta.title;
    document.getElementById('page-title').textContent = meta.title;
  }

  if (meta.footer) {
    document.getElementById('footer-text').textContent = meta.footer;
  }
}

function renderLikes(items) {
  const target = document.getElementById('likes-list');
  target.innerHTML = items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('');
}

function renderCompletedScenarios(data) {
  const tabs = document.getElementById('completed-tabs');
  const panels = document.getElementById('completed-panels');

  tabs.innerHTML = completedTabs.map((tab, index) => {
    return '<button class="tab-btn' + (index === 0 ? ' active' : '') + '" data-tab="' + tab.key + '">' + escapeHtml(tab.label) + '</button>';
  }).join('');

  panels.innerHTML = completedTabs.map((tab, index) => {
    const items = data[tab.key] || [];
    return buildScenarioPanel(tab.key, items, index !== 0);
  }).join('');
}

function renderScenarioSection(targetId, items) {
  const target = document.getElementById(targetId);
  const sectionItems = normalizeScenarioSections(items);

  if (sectionItems) {
    target.innerHTML = [
      '<div class="tab-bar">',
      gmTabs.map((tab, index) => {
        return '<button class="tab-btn' + (index === 0 ? ' active' : '') + '" data-tab="' + tab.key + '">' + escapeHtml(tab.label) + '</button>';
      }).join(''),
      '</div>',
      gmTabs.map((tab, index) => {
        return buildScenarioPanel(tab.key, sectionItems[tab.key] || [], index !== 0);
      }).join('')
    ].join('');
    return;
  }

  target.innerHTML = buildFilterBar(items) + buildScenarioList(items);
}

function normalizeScenarioSections(items) {
  if (Array.isArray(items)) {
    const midpoint = Math.ceil(items.length / 2);
    return {
      main: items.slice(0, midpoint),
      ongoing: items.slice(midpoint)
    };
  }

  if (items && typeof items === 'object') {
    return {
      main: items.main || [],
      ongoing: items.ongoing || []
    };
  }

  return null;
}

function buildScenarioPanel(id, items, hidden) {
  return [
    '<div class="tab-panel' + (hidden ? ' hidden' : '') + '" id="tab-' + id + '">',
    buildFilterBar(items),
    buildScenarioList(items),
    '</div>'
  ].join('');
}

function buildFilterBar(items) {
  const filters = ['all', ...getOrderedFilters(items)];
  return [
    '<div class="filter-bar">',
    '<span class="filter-label">PL数:</span>',
    filters.map((filter, index) => {
      const label = filter === 'all' ? 'すべて' : filter;
      return '<button class="filter-btn' + (index === 0 ? ' active' : '') + '" data-filter="' + escapeHtml(filter) + '">' + escapeHtml(label) + '</button>';
    }).join(''),
    '</div>'
  ].join('');
}

function buildScenarioList(items) {
  return '<ul class="scenario-list">' + items.map(buildScenarioItem).join('') + '</ul>';
}

function buildScenarioItem(item) {
  const metaClass = item.meta === '継続' ? 'ongoing' : 'badge-dur';
  return [
    '<li data-filter="' + escapeHtml(item.filter) + '">',
    '<span class="scenario-name">' + escapeHtml(item.name) + '</span>',
    '<span class="scenario-badges">',
    '<span class="scenario-badge badge-pl">' + escapeHtml(item.badge) + '</span>',
    item.meta ? '<span class="scenario-badge ' + metaClass + '">' + escapeHtml(item.meta) + '</span>' : '',
    '</span>',
    '</li>'
  ].join('');
}

function getUniqueFilters(items) {
  const seen = new Set();
  return items
    .map((item) => item.filter)
    .filter((filter) => filter && !seen.has(filter) && seen.add(filter));
}

function getOrderedFilters(items) {
  const unique = getUniqueFilters(items);
  const indexMap = new Map();

  unique.forEach((filter, index) => {
    indexMap.set(filter, index);
  });

  return unique.slice().sort((a, b) => {
    const aOrder = filterOrder.indexOf(a);
    const bOrder = filterOrder.indexOf(b);

    if (aOrder !== -1 && bOrder !== -1) {
      return aOrder - bOrder;
    }

    if (aOrder !== -1) {
      return -1;
    }

    if (bOrder !== -1) {
      return 1;
    }

    return (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0);
  });
}

function bindTabSwitching() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      card.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
      btn.classList.add('active');
      card.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.add('hidden'));
      card.querySelector('#tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });
}

function bindFilters() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bar = btn.closest('.filter-bar');
      const list = bar.nextElementSibling;
      const filter = btn.dataset.filter;
      const normalizedFilters = {
        '2PL': ['2PL', '秘匿2PL'],
        '3PL': ['3PL', '秘匿3PL'],
        '4PL': ['4PL', '秘匿4PL']
      };
      const allowed = normalizedFilters[filter] || [filter];

      bar.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
      btn.classList.add('active');

      list.querySelectorAll('li').forEach((item) => {
        const visible = filter === 'all' || allowed.includes(item.dataset.filter);
        item.style.display = visible ? '' : 'none';
      });
    });
  });
}

function renderGallery(items) {
  const track = document.getElementById('slider-track');
  const dots = document.getElementById('slider-dots');

  track.innerHTML = items.map((item) => {
    return [
      '<div class="slide">',
      '<img src="' + encodeURI(item.image) + '" alt="' + escapeHtml(item.character) + '" />',
      '<div class="slide-caption">',
      '<span class="slide-chara">' + escapeHtml(item.character) + '</span>',
      '<span class="slide-scenario">' + escapeHtml(item.scenario) + '</span>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');

  dots.innerHTML = items.map((_, index) => {
    return '<span class="dot' + (index === 0 ? ' active' : '') + '" data-index="' + index + '"></span>';
  }).join('');
}

function setupSlider() {
  const track = document.querySelector('.slider-track');
  const slides = track ? Array.from(track.querySelectorAll('.slide')) : [];
  const dots = Array.from(document.querySelectorAll('.dot'));
  const outer = document.querySelector('.slider-track-outer');

  if (!track || slides.length === 0) {
    return;
  }

  let current = 0;
  let touchStartX = 0;

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + current * 100 + '%)';
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === current));
  }

  document.querySelector('.slider-prev')?.addEventListener('click', () => goTo(current - 1));
  document.querySelector('.slider-next')?.addEventListener('click', () => goTo(current + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));

  outer?.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  outer?.addEventListener('touchend', (event) => {
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      goTo(current + (deltaX < 0 ? 1 : -1));
    }
  }, { passive: true });
}

function showLoadError(error) {
  const message = 'データファイルを読み込めませんでした。data フォルダ内の JavaScript ファイルが見つからないか、読み込みに失敗しています。';
  console.error(error);
  document.getElementById('likes-list').innerHTML = '<li class="status-message">' + message + '</li>';
  document.getElementById('completed-panels').innerHTML = '<p class="status-message">' + message + '</p>';
  document.getElementById('gm-content').innerHTML = '<p class="status-message">' + message + '</p>';
  document.getElementById('slider-track').innerHTML = '<div class="slide slide-status">' + message + '</div>';
  document.getElementById('slider-dots').innerHTML = '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}