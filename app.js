// Search and render logic
const searchInput = document.getElementById('search');
const startsWithCheckbox = document.getElementById('startswith');
const alphabetEl = document.getElementById('alphabet');
const resultsEl = document.getElementById('results');
let debounceTimer = null;
// Build alphabet buttons
(function buildAlphabet() {
  for (const letter of LETTERS) {
    const btn = document.createElement('button');
    btn.className = 'alpha-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      const targetPack = btn.dataset.targetPack;
      if (targetPack !== undefined && targetPack !== '') {
        const el = document.getElementById('pack-' + targetPack);
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
function updateAlphabetButtons(letterToFirstPack) {
  for (const btn of alphabetEl.querySelectorAll('.alpha-btn')) {
    const pack = letterToFirstPack.get(btn.textContent);
    if (pack !== undefined) {
      btn.classList.remove('disabled');
      btn.dataset.targetPack = pack;
    } else {
      btn.classList.add('disabled');
      btn.dataset.targetPack = '';
    }
  }
}
function renderBrowse() {
  // Show all packs as clickable links, no word lists
  let html = '';
  for (let i = 0; i < UPLOADED_UNTIL; i++) {
    html += `<div class="pack-group" id="pack-${i}">` +
      `<h2><a href="${escapeHtml(packUrl(i))}" target="_blank" rel="noopener">${escapeHtml(PACK_NAMES[i])}</a></h2>` +
      `</div>`;
  }
  resultsEl.innerHTML = html;
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
    updateAlphabetButtons(new Map());
    return;
  }
  // Build HTML
  let html = '';
  for (const [packIndex, words] of matchesByPack) {
    html += `<div class="pack-group" id="pack-${packIndex}">` +
      `<h2><a href="${escapeHtml(packUrl(packIndex))}" target="_blank" rel="noopener">${escapeHtml(PACK_NAMES[packIndex])}</a></h2>` +
      `<ul>`;
    for (const word of words) {
      html += `<li>${escapeHtml(word)}</li>`;
    }
    html += `</ul></div>`;
  }
  resultsEl.innerHTML = html;
  // Determine which letters are represented in the results and which pack they first appear in.
  // matchesByPack is iterated in insertion order (= ascending pack index), so the first
  // pack seen for a given letter is the earliest one in the results.
  const letterToFirstPack = new Map();
  outer: for (const [packIndex, words] of matchesByPack) {
    for (const word of words) {
      if (!word) continue;
      let ch = word[0].toUpperCase();
      if (ch === 'Ё') ch = 'Е';
      if (LETTERS.includes(ch) && !letterToFirstPack.has(ch)) {
        letterToFirstPack.set(ch, packIndex);
        if (letterToFirstPack.size === LETTERS.length) break outer;
      }
    }
  }
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
