const state = {
  questions: [],
  selected: [],
  answers: {},
  currentIndex: 0,
  timer: {
    mode: 'exam',
    remaining: 0,
    intervalId: null,
    running: false,
  },
};

const RECENT_TESTS_LIMIT = 10;
const RECENT_STORAGE_KEY = 'ps_recent_tests_v1';

const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');
const questionPanel = document.getElementById('questionPanel');
const progressEl = document.getElementById('progress');
const questionTextEl = document.getElementById('questionText');
const optionsEl = document.getElementById('options');
const confirmBtn = document.getElementById('confirmBtn');
const resultEl = document.getElementById('result');
const resultTitle = document.getElementById('resultTitle');
const resultSummary = document.getElementById('resultSummary');
const resultDetails = document.getElementById('resultDetails');
const modeInputs = document.querySelectorAll('input[name="mode"]');
const timerControls = document.getElementById('timerControls');
const timerDisplay = document.getElementById('timerDisplay');
const timerInline = document.getElementById('timerInline');

function getQuestionKey(q) {
  if (q && q.hash) return q.hash;
  if (q && q.id !== undefined && q.id !== null) return String(q.id);
  return '';
}

function loadRecentTests() {
  if (!('localStorage' in window)) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(test => Array.isArray(test))
      .map(test => test.filter(entry => typeof entry === 'string'));
  } catch {
    return [];
  }
}

function saveRecentTests(tests) {
  if (!('localStorage' in window)) return;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(tests));
  } catch {
    // ignore storage errors (private mode etc.)
  }
}

function getRecentKeys() {
  const tests = loadRecentTests();
  const flat = tests.flat();
  return new Set(flat);
}

function recordRecentTest(selected) {
  if (!Array.isArray(selected) || selected.length === 0) return;
  const tests = loadRecentTests();
  const keys = selected.map(getQuestionKey).filter(Boolean);
  if (keys.length === 0) return;
  tests.unshift(keys);
  if (tests.length > RECENT_TESTS_LIMIT) {
    tests.length = RECENT_TESTS_LIMIT;
  }
  saveRecentTests(tests);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function getMode() {
  const selected = Array.from(modeInputs).find(input => input.checked);
  return selected ? selected.value : 'exam';
}

function updateTimerVisibility() {
  const mode = getMode();
  timerControls.style.opacity = mode === 'exam' ? '1' : '0.5';
  timerControls.style.pointerEvents = mode === 'exam' ? 'auto' : 'none';
  if (mode !== 'exam') {
    timerDisplay.textContent = 'bez limitu';
    if (timerInline) timerInline.textContent = 'bez limitu';
  }
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function setTimerDisplay(seconds) {
  const text = formatTime(Math.max(seconds, 0));
  timerDisplay.textContent = text;
  if (timerInline) timerInline.textContent = text;
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
  }
  state.timer.intervalId = null;
  state.timer.running = false;
}

function startTimer() {
  stopTimer();
  const mode = getMode();
  state.timer.mode = mode;
  if (mode !== 'exam') {
    timerDisplay.textContent = 'bez limitu';
    if (timerInline) timerInline.textContent = 'bez limitu';
    return;
  }
  const minutes = 20;
  state.timer.remaining = minutes * 60;
  setTimerDisplay(state.timer.remaining);
  state.timer.running = true;
  state.timer.intervalId = setInterval(() => {
    state.timer.remaining -= 1;
    setTimerDisplay(state.timer.remaining);
    if (state.timer.remaining <= 0) {
      stopTimer();
      finishExam({ timeExpired: true });
    }
  }, 1000);
}

function pickUnique(pool, count, usedKeys, avoidKeys) {
  const picks = [];
  for (const q of shuffle(pool)) {
    if (picks.length >= count) break;
    const key = getQuestionKey(q);
    if (!key) continue;
    if (usedKeys.has(key)) continue;
    if (avoidKeys && avoidKeys.has(key)) continue;
    usedKeys.add(key);
    picks.push(q);
  }
  return picks;
}

function renderCurrentQuestion() {
  const q = state.selected[state.currentIndex];
  if (!q) return;
  progressEl.textContent = `Pytanie ${state.currentIndex + 1}/10`;
  confirmBtn.textContent =
    state.currentIndex === state.selected.length - 1
      ? 'Zatwierdź i pokaż wynik'
      : 'Zatwierdź i dalej';
  questionTextEl.textContent = q.question;
  optionsEl.innerHTML = '';

  const groupName = `current-${q.id || state.currentIndex}`;
  ['A', 'B', 'C'].forEach(letter => {
    const option = document.createElement('label');
    option.className = 'option';
    option.dataset.answer = letter;
    option.innerHTML = `
      <input type="radio" name="${groupName}" value="${letter}" autocomplete="off" />
      <span class="option__label">${letter}</span>
      <span class="option__text">${q.answers[letter]}</span>
    `;
    optionsEl.appendChild(option);
  });

  confirmBtn.disabled = true;
  const radios = optionsEl.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      confirmBtn.disabled = false;
    });
  });
}

function startExam() {
  const priority = state.questions.filter(q => ['uobia', 'bezpieczenstwo'].includes(q.category));
  const others = state.questions.filter(q => !['uobia', 'bezpieczenstwo'].includes(q.category));

  const usedKeys = new Set();
  const recentKeys = getRecentKeys();
  const firstFour = pickUnique(priority, 4, usedKeys, recentKeys);
  if (firstFour.length < 4) {
    firstFour.push(...pickUnique(priority, 4 - firstFour.length, usedKeys));
  }
  const rest = pickUnique(others, 6, usedKeys, recentKeys);
  if (rest.length < 6) {
    rest.push(...pickUnique(others, 6 - rest.length, usedKeys));
  }

  if (firstFour.length < 4 || rest.length < 6) {
    setStatus('Brakuje pytań w wymaganych kategoriach. Sprawdź kategorie w data/questions.json.');
    return;
  }

  state.selected = [...firstFour, ...rest];
  recordRecentTest(state.selected);
  state.answers = {};
  state.currentIndex = 0;

  document.body.classList.add('is-testing');
  questionPanel.hidden = false;
  resultEl.hidden = true;
  resetBtn.disabled = false;

  renderCurrentQuestion();
  setStatus('Zaznacz odpowiedź i kliknij „Zatwierdź i dalej”.');
  startTimer();
}

function finishExam({ timeExpired = false } = {}) {
  stopTimer();
  questionPanel.hidden = true;
  document.body.classList.remove('is-testing');

  const firstFour = state.selected.slice(0, 4);
  const rest = state.selected.slice(4);

  const isCorrect = q => state.answers[q.id] === q.correct;
  const firstFourCorrect = firstFour.every(isCorrect);
  const restCorrectCount = rest.filter(isCorrect).length;
  const restErrors = rest.length - restCorrectCount;
  const totalCorrect = state.selected.filter(isCorrect).length;
  const totalErrors = state.selected.length - totalCorrect;
  const passed = firstFourCorrect && restErrors <= 1;

  resultTitle.textContent = passed ? 'Zaliczone' : 'Nie zaliczone';
  resultTitle.style.color = passed ? 'var(--accent-2)' : 'var(--accent-3)';
  resultSummary.textContent = `Wynik: ${totalCorrect}/10 — ${passed ? 'zdane' : 'niezdane'}.`;

  const summaryList = document.createElement('div');
  summaryList.className = 'summary-list';

  state.selected.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    const userAnswer = state.answers[q.id] || 'brak';
    const userText = userAnswer === 'brak' ? 'brak odpowiedzi' : `${userAnswer}. ${q.answers[userAnswer]}`;
    const correctText = `${q.correct}. ${q.answers[q.correct]}`;

    item.innerHTML = `
      <div class="summary-question">Pytanie ${idx + 1}. ${q.question}</div>
      <div class="summary-answers">
        <div>Twoja odpowiedź: <span class="${userAnswer === q.correct ? 'is-correct' : 'is-wrong'}">${userText}</span></div>
        <div>Poprawna odpowiedź: <span class="is-correct">${correctText}</span></div>
      </div>
    `;
    summaryList.appendChild(item);
  });

  resultDetails.innerHTML = `
    <div>Warunek części pierwszej: ${firstFourCorrect ? 'spełniony' : 'niespełniony'}.</div>
    <div>Błędy w części drugiej: ${restErrors} (dopuszczalny 1).</div>
    <div>Łącznie błędów: ${totalErrors} (dopuszczalny 1).</div>
    ${timeExpired ? '<div>Limit czasu minął.</div>' : ''}
  `;
  resultDetails.appendChild(summaryList);

  resultEl.hidden = false;
  setStatus(passed ? 'Test zaliczony. Możesz losować kolejny.' : 'Test niezaliczony. Spróbuj ponownie.');
}

confirmBtn.addEventListener('click', () => {
  const selected = optionsEl.querySelector('input[type="radio"]:checked');
  if (!selected) return;
  const q = state.selected[state.currentIndex];
  if (!q) return;
  state.answers[q.id] = selected.value;

  if (state.currentIndex < state.selected.length - 1) {
    state.currentIndex += 1;
    renderCurrentQuestion();
    setStatus('Zaznacz odpowiedź i kliknij „Zatwierdź i dalej”.');
  } else {
    finishExam();
  }
});

startBtn.addEventListener('click', startExam);
resetBtn.addEventListener('click', () => {
  stopTimer();
  questionPanel.hidden = true;
  resultEl.hidden = true;
  document.body.classList.remove('is-testing');
  state.answers = {};
  state.currentIndex = 0;
  resetBtn.disabled = true;
  setStatus('Kliknij „Losuj nowy test”, aby rozpocząć.');
});

modeInputs.forEach(input => {
  input.addEventListener('change', () => {
    updateTimerVisibility();
  });
});

updateTimerVisibility();


function loadQuestions() {
  if (Array.isArray(window.QUESTION_BANK)) {
    state.questions = window.QUESTION_BANK;
    setStatus(`Baza pytań wczytana (${state.questions.length}). Kliknij „Losuj nowy test”.`);
    startBtn.disabled = false;
    resetBtn.disabled = true;
    return;
  }
  fetch('data/questions.json')
    .then(res => res.json())
    .then(data => {
      state.questions = data;
      setStatus(`Baza pytań wczytana (${state.questions.length}). Kliknij „Losuj nowy test”.`);
      startBtn.disabled = false;
      resetBtn.disabled = true;
    })
    .catch(() => {
      setStatus('Nie udało się wczytać bazy pytań. Sprawdź pliki data/questions.js / data/questions.json.');
      startBtn.disabled = true;
    });
}

loadQuestions();
