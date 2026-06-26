// Search and render logic
const searchInput = document.getElementById('search');
const startsWithCheckbox = document.getElementById('startswith');
const alphabetEl = document.getElementById('alphabet');
const resultsEl = document.getElementById('results');
const statsEl = document.getElementById('stats');
let debounceTimer = null;

// Precompute letter group transitions sorted by start pack index.
// Letters that share the same first-pack are grouped together (e.g. "Щ, Э").
const LETTER_TRANSITIONS = (function () {
  const byPack = new Map();
  for (const letter of LETTERS) {
    const pack = LETTER_FIRST_PACK[letter];
    if (!byPack.has(pack)) byPack.set(pack, []);
    byPack.get(pack).push(letter);
  }
  return [...byPack.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, letters]) => ({ display: letters.join(', '), letters, start }));
})();

function getLetterGroupForPack(packIndex) {
  let group = LETTER_TRANSITIONS[0];
  for (const t of LETTER_TRANSITIONS) {
    if (t.start <= packIndex) group = t;
    else break;
  }
  return group;
}

// Build alphabet buttons
(function buildAlphabet() {
  for (const letter of LETTERS) {
    const btn = document.createElement('button');
    btn.className = 'alpha-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.targetId;
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
    alphabetEl.appendChild(btn);
  }
})();

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function updateAlphabetButtons(letterToFirstPack) {
  for (const btn of alphabetEl.querySelectorAll('.alpha-btn')) {
    const pack = letterToFirstPack.get(btn.textContent);
    if (pack !== undefined) {
      btn.classList.remove('disabled');
      btn.dataset.targetId = 'letter-' + pack;
    } else {
      btn.classList.add('disabled');
      btn.dataset.targetId = '';
    }
  }
}

// Spoiler toggle via event delegation — ignore clicks on the external link
resultsEl.addEventListener('click', (e) => {
  if (e.target.closest('.pack-link')) return;
  const header = e.target.closest('.pack-header');
  if (!header) return;
  const packGroup = header.closest('.pack-group');
  if (packGroup) packGroup.classList.toggle('open');
});

// Build HTML for a list of packs, inserting letter-group headers as needed.
// In search mode each pack is open with a word count badge and a word list.
// In browse mode packs are collapsed with no body.
function buildPacksHtml(packsData, isSearch) {
  let html = '';
  let currentGroupDisplay = null;
  for (const { packIndex, words } of packsData) {
    const group = getLetterGroupForPack(packIndex);
    if (group.display !== currentGroupDisplay) {
      currentGroupDisplay = group.display;
      html += `<div class="letter-header" id="letter-${packIndex}">${escapeHtml(group.display)}</div>`;
    }
    const openClass = isSearch ? ' open expandable' : '';
    html += `<div class="pack-group${openClass}" id="pack-${packIndex}">`;
    html += `<div class="pack-header">`;
    html += `<span class="pack-title">${escapeHtml(PACK_NAMES[packIndex])}</span>`;
    if (isSearch) {
      html += `<span class="pack-count">${words.length}</span>`;
    }
    html += `<a class="pack-link" href="${escapeHtml(packUrl(packIndex))}" target="_blank" rel="noopener">↗</a>`;
    html += `</div>`;
    if (isSearch) {
      html += `<div class="pack-body"><ul>`;
      for (const word of words) {
        html += `<li>${escapeHtml(word)}</li>`;
      }
      html += `</ul></div>`;
    }
    html += `</div>`;
  }
  return html;
}

function renderBrowse() {
  const totalPacks = UPLOADED_UNTIL;
  const totalWords = PACK_SIZE * UPLOADED_UNTIL;
  statsEl.textContent =
    `${totalPacks} ${pluralize(totalPacks, 'набор', 'набора', 'наборов')}, ` +
    `${totalWords} ${pluralize(totalWords, 'слово', 'слова', 'слов')}`;
  const packsData = [];
  for (let i = 0; i < UPLOADED_UNTIL; i++) {
    packsData.push({ packIndex: i, words: [] });
  }
  resultsEl.innerHTML = buildPacksHtml(packsData, false);
  updateAlphabetButtons(new Map(Object.entries(LETTER_FIRST_PACK)));
}

function renderSearch(query, fromStart) {
  // Collect matching words grouped by pack index
  const matchesByPack = new Map();
  const limit = Math.min(WORDS.length, UPLOADED_UNTIL * PACK_SIZE);
  for (let i = 0; i < limit; i++) {
    const word = WORDS[i];
    if (!word) continue;
    const normalized = normalizeStr(word);
    const matches = fromStart ? normalized.startsWith(query) : normalized.includes(query);
    if (matches) {
      const packIndex = Math.floor(i / PACK_SIZE);
      if (!matchesByPack.has(packIndex)) matchesByPack.set(packIndex, []);
      matchesByPack.get(packIndex).push(word);
    }
  }
  if (matchesByPack.size === 0) {
    resultsEl.innerHTML = '<p class="no-results">Ничего не найдено.</p>';
    statsEl.textContent = '';
    updateAlphabetButtons(new Map());
    return;
  }
  // Build packs data; derive letterToFirstPack from static letter groups so
  // the alphabet buttons align with the rendered letter-group headers.
  const packsData = [];
  const letterToFirstPack = new Map();
  for (const [packIndex, words] of matchesByPack) {
    packsData.push({ packIndex, words });
    const group = getLetterGroupForPack(packIndex);
    for (const letter of group.letters) {
      if (!letterToFirstPack.has(letter)) {
        letterToFirstPack.set(letter, packIndex);
      }
    }
  }
  // Stats
  const totalPacks = packsData.length;
  const totalWords = packsData.reduce((s, d) => s + d.words.length, 0);
  statsEl.textContent =
    `Найдено ${totalPacks} ${pluralize(totalPacks, 'набор', 'набора', 'наборов')}, ` +
    `${totalWords} ${pluralize(totalWords, 'слово', 'слова', 'слов')}`;
  resultsEl.innerHTML = buildPacksHtml(packsData, true);
  updateAlphabetButtons(letterToFirstPack);
}

function update() {
  const query = normalizeStr(searchInput.value.trim());
  if (query.length === 0) {
    renderBrowse();
  } else {
    renderSearch(query, startsWithCheckbox.checked);
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(update, 150);
});

startsWithCheckbox.addEventListener('change', () => {
  clearTimeout(debounceTimer);
  update();
});

// Initial render
update();
