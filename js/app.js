import { SAFE_CONFIG } from './config.js';
import { QUESTIONS } from './questions.js';

const TIMER_SECONDS = 30;
const MAX_RETRIES = 3;
const SELF_DESTRUCT_SECONDS = 10;

const WHISPERS = [
  'pascal is watching...',
  'almost there...',
  'wrong answer — try again',
  'the safe is waiting',
  'you got this',
  'tick tock...',
  'nice work so far',
];

const $ = (sel) => document.querySelector(sel);
const whisperEl = $('#whisper');
const flashOverlay = $('#flash-overlay');
const particlesEl = $('#particles');
const quizCatRunner = $('#quiz-cat-runner');
const levelProgress = $('#level-progress');

const screens = {
  landing: $('#landing'),
  quiz: $('#quiz'),
  symbol: $('#symbol'),
  safe: $('#safe'),
  reward: $('#reward'),
};

const hud = $('#hud');
const symbolSlots = $('#symbol-slots');
const btnStart = $('#btn-start');
const btnContinue = $('#btn-continue');
const btnClaim = $('#btn-claim');
const btnPickMain = $('#btn-pick-main');
const btnPickAlt = $('#btn-pick-alt');
const prizePicker = $('#prize-picker');
const prizeMainReveal = $('#prize-main-reveal');
const prizeAltReveal = $('#prize-alt-reveal');

const quizTitle = $('#quiz-title');
const levelLabel = $('#level-label');
const retriesDisplay = $('#retries-display');
const timerBar = $('#timer-bar');
const timerText = $('#timer-text');
const questionText = $('#question-text');
const optionsEl = $('#options');

const symbolOkLine = $('#symbol-ok-line');
const symbolDisplay = $('#symbol-display');
const symbolHint = $('#symbol-hint');

const inventoryPick = $('#inventory-pick');
const unlockForm = $('#unlock-form');
const unlockInput = $('#unlock-input');
const safeError = $('#safe-error');
const safeDoor = $('#safe-door');
const safeStatus = $('#safe-status');

const rewardCodeArea = $('#reward-code-area');
const rewardCodeEl = $('#reward-code');
const toast = $('#toast');
const jokePopup = $('#joke-popup');
const selfDestruct = $('#self-destruct');
const selfDestructOverlay = $('#self-destruct-overlay');
const selfDestructTimer = $('#self-destruct-timer');
const selfDestructGoodbye = $('#self-destruct-goodbye');

let selfDestructId = null;
let quizCatTimeoutId = null;
let quizCatRunning = false;
let jokePopupTimeoutId = null;
let prizeChoice = null;

let state = {
  currentLevel: 0,
  retriesLeft: MAX_RETRIES,
  symbolsCollected: [],
  timerId: null,
  secondsLeft: TIMER_SECONDS,
  answering: false,
};

function init() {
  renderLevelProgress();
  renderSymbolSlots();
  if (selfDestructOverlay) selfDestructOverlay.hidden = true;
  if (selfDestructGoodbye) selfDestructGoodbye.hidden = true;
  selfDestruct?.classList.remove('critical');
  document.body.classList.remove('destruct-active', 'site-destroyed');
  btnStart.addEventListener('click', startChallenge);
  btnContinue.addEventListener('click', onContinueAfterSymbol);
  unlockForm.addEventListener('submit', onUnlockSubmit);
  btnClaim.addEventListener('click', onClaimReward);
  btnPickMain?.addEventListener('click', onPickMainPrize);
  btnPickAlt?.addEventListener('click', onPickAltPrize);
  unlockInput.addEventListener('input', () => {
    safeError.hidden = true;
  });
  scheduleAmbientWhisper();
  scheduleQuizCat();
}

function scheduleQuizCat() {
  const delay = 8000 + Math.random() * 22000;
  quizCatTimeoutId = setTimeout(() => {
    if (screens.quiz.classList.contains('active') && !state.answering) {
      runQuizCat();
    }
    scheduleQuizCat();
  }, delay);
}

function runQuizCat() {
  if (!quizCatRunner || quizCatRunning) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fromLeft = Math.random() > 0.35;
  const top = 12 + Math.random() * 58;
  const duration = 3200 + Math.random() * 2800;

  quizCatRunning = true;
  quizCatRunner.hidden = false;
  quizCatRunner.style.top = `${top}%`;
  quizCatRunner.style.setProperty('--cat-run-duration', `${duration}ms`);
  quizCatRunner.classList.remove('from-left', 'from-right', 'running');
  void quizCatRunner.offsetWidth;
  quizCatRunner.classList.add(fromLeft ? 'from-left' : 'from-right', 'running');

  const onDone = (e) => {
    if (e.animationName !== 'catRunLeft' && e.animationName !== 'catRunRight') return;
    quizCatRunner.removeEventListener('animationend', onDone);
    dismissQuizCat();
  };
  quizCatRunner.addEventListener('animationend', onDone);
}

function dismissQuizCat() {
  if (!quizCatRunner) return;
  quizCatRunner.hidden = true;
  quizCatRunner.classList.remove('from-left', 'from-right', 'running');
  quizCatRunning = false;
}

function scheduleAmbientWhisper() {
  const delay = 12000 + Math.random() * 18000;
  setTimeout(() => {
    if (!whisperEl) return;
    if (screens.quiz.classList.contains('active') || screens.safe.classList.contains('active')) {
      showWhisper(randomWhisper());
    }
    scheduleAmbientWhisper();
  }, delay);
}

function randomWhisper() {
  return WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
}

function showWhisper(text) {
  if (!whisperEl) return;
  whisperEl.textContent = text;
  whisperEl.classList.add('visible');
  setTimeout(() => whisperEl.classList.remove('visible'), 3200);
}

function staticBurst() {
  document.body.classList.add('static-burst');
  setTimeout(() => document.body.classList.remove('static-burst'), 400);
}

function setDreadMode(on) {
  document.body.classList.toggle('dread-mode', on);
}

function playFlash(type) {
  if (!flashOverlay) return;
  flashOverlay.classList.remove('success', 'fail');
  void flashOverlay.offsetWidth;
  flashOverlay.classList.add(type);
  setTimeout(() => flashOverlay.classList.remove(type), 500);
}

function burstParticles(count = 14, gold = false) {
  if (!particlesEl) return;
  const rect = particlesEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = gold ? 'particle gold' : 'particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 60 + Math.random() * 100;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    particlesEl.appendChild(p);
    setTimeout(() => p.remove(), 750);
  }
}

function animateWindow(screenEl) {
  const win = screenEl?.querySelector('.terminal-window, .casino-frame');
  if (!win) return;
  win.classList.remove('window-enter');
  void win.offsetWidth;
  win.classList.add('window-enter');
  setTimeout(() => win.classList.remove('window-enter'), 550);
}

function renderLevelProgress() {
  if (!levelProgress) return;
  const activeScreen = Object.entries(screens).find(([, el]) => el.classList.contains('active'))?.[0];
  levelProgress.innerHTML = '';
  for (let i = 0; i < QUESTIONS.length; i++) {
    const dot = document.createElement('span');
    dot.className = 'level-dot';
    dot.title = `Level ${i + 1}`;
    if (state.symbolsCollected[i]) {
      dot.classList.add('done');
    } else if (
      activeScreen === 'quiz' && i === state.currentLevel
    ) {
      dot.classList.add('current');
    } else if (
      activeScreen === 'symbol' && i === state.symbolsCollected.filter(Boolean).length
    ) {
      dot.classList.add('current');
    }
    levelProgress.appendChild(dot);
  }
}

function renderSymbolSlots(justFilledIndex = -1) {
  symbolSlots.innerHTML = '';
  SAFE_CONFIG.symbols.forEach((sym, i) => {
    const slot = document.createElement('span');
    slot.className = 'symbol-slot';
    slot.dataset.index = String(i);
    slot.textContent = state.symbolsCollected[i] ?? '·';
    if (state.symbolsCollected[i]) {
      slot.classList.add('filled');
      if (i === justFilledIndex) slot.classList.add('just-filled');
    }
    symbolSlots.appendChild(slot);
  });
}

let screenTransitioning = false;

function showScreen(name) {
  if (screenTransitioning) return;
  const current = Object.entries(screens).find(([, el]) => el.classList.contains('active'));
  const next = screens[name];

  const applyScreen = () => {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
      el.classList.remove('screen-exit');
    });
    const showHud = name !== 'landing' && name !== 'reward';
    hud.hidden = !showHud;
    requestAnimationFrame(() => {
      hud.classList.toggle('visible', showHud);
    });
    renderLevelProgress();
    animateWindow(next);
    screenTransitioning = false;
  };

  if (current && current[1] !== next && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    screenTransitioning = true;
    current[1].classList.add('screen-exit');
    setTimeout(applyScreen, 220);
  } else {
    applyScreen();
  }
}

async function typewriter(el, text, speed = 14) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (el) el.textContent = text;
    return;
  }
  el.textContent = '';
  el.classList.add('typing');
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await new Promise((r) => setTimeout(r, speed));
  }
  el.classList.remove('typing');
}

function startChallenge() {
  resetState();
  showWhisper('let\'s go...');
  showScreen('quiz');
  loadQuestion();
}

function resetState() {
  clearTimer();
  state = {
    currentLevel: 0,
    retriesLeft: MAX_RETRIES,
    symbolsCollected: [],
    timerId: null,
    secondsLeft: TIMER_SECONDS,
    answering: false,
  };
  renderSymbolSlots();
  renderLevelProgress();
  hud.classList.remove('visible');
}

async function loadQuestion() {
  const q = QUESTIONS[state.currentLevel];
  if (!q) {
    showSafe();
    return;
  }

  state.retriesLeft = MAX_RETRIES;
  state.answering = false;
  updateRetriesDisplay();
  renderLevelProgress();

  const levelNum = String(q.level).padStart(2, '0');
  quizTitle.textContent = `question_${levelNum}`;
  levelLabel.textContent = `level ${q.level} / ${QUESTIONS.length}`;

  optionsEl.innerHTML = '';
  clearTimer();

  await typewriter(questionText, q.text);

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn option-enter';
    btn.style.animationDelay = `${i * 0.07}s`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.innerHTML = `<span class="opt-num">${i + 1})</span> <span class="opt-text">${escapeHtml(opt)}</span>`;
    btn.addEventListener('click', () => onAnswer(i));
    optionsEl.appendChild(btn);
  });

  if (q.options.length > 3) {
    optionsEl.classList.add('options-many');
  } else {
    optionsEl.classList.remove('options-many');
  }

  startTimer();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function startTimer() {
  clearTimer();
  state.secondsLeft = TIMER_SECONDS;
  updateTimerUI();

  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    updateTimerUI(true);
    if (state.secondsLeft <= 0) {
      clearTimer();
      onWrong('Time\'s up!');
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateTimerUI(tick = false) {
  const pct = (state.secondsLeft / TIMER_SECONDS) * 100;
  timerBar.style.width = `${pct}%`;
  const s = String(state.secondsLeft).padStart(2, '0');
  timerText.textContent = `00:${s}`;
  if (tick) {
    timerText.classList.remove('tick');
    void timerText.offsetWidth;
    timerText.classList.add('tick');
  }
  const warning = state.secondsLeft <= 10;
  const critical = state.secondsLeft <= 5;
  timerBar.classList.toggle('warning', warning);
  timerBar.classList.toggle('critical', critical);
  setDreadMode(critical);
  if (critical && state.secondsLeft === 5) {
    showWhisper('hurry up...');
  }
  if (critical && state.secondsLeft <= 3) {
    timerText.style.color = 'var(--amber)';
  } else {
    timerText.style.color = '';
  }
}

function updateRetriesDisplay() {
  retriesDisplay.textContent = `tries left: ${state.retriesLeft}`;
}

function setOptionsDisabled(disabled) {
  optionsEl.querySelectorAll('.option-btn').forEach((btn) => {
    btn.disabled = disabled;
  });
}

function onAnswer(selectedIndex) {
  if (state.answering) return;
  state.answering = true;
  clearTimer();
  setOptionsDisabled(true);

  const q = QUESTIONS[state.currentLevel];
  const buttons = optionsEl.querySelectorAll('.option-btn');

  if (selectedIndex === q.correctIndex) {
    buttons[selectedIndex].classList.add('correct');
    playFlash('success');
    burstParticles(16);
    setTimeout(() => grantSymbol(), 600);
  } else {
    buttons[selectedIndex]?.classList.add('wrong');
    buttons[q.correctIndex]?.classList.add('reveal-correct');
    onWrong('Nope — that\'s not it.');
  }
}

function onWrong(message) {
  state.retriesLeft -= 1;
  updateRetriesDisplay();

  if (state.retriesLeft <= 0) {
    failRestart(message);
    return;
  }

  playFlash('fail');
  flashMessage(message);
  setTimeout(() => {
    state.answering = false;
    setOptionsDisabled(false);
    optionsEl.querySelectorAll('.option-btn').forEach((btn) => {
      btn.classList.remove('wrong', 'correct', 'reveal-correct');
    });
    startTimer();
  }, 1200);
}

function flashMessage(msg) {
  const el = document.createElement('p');
  el.className = 'fail-flash';
  el.textContent = `[FAIL] ${msg} — ${state.retriesLeft} try/tries left before you start over.`;
  staticBurst();
  questionText.parentElement.insertBefore(el, optionsEl);
  setTimeout(() => el.remove(), 1100);
}

function failRestart(message) {
  clearTimer();
  dismissQuizCat();
  setDreadMode(false);
  hud.classList.remove('visible');
  showScreen('landing');
  const landingBody = screens.landing.querySelector('.terminal-body');
  const existing = landingBody.querySelector('.restart-notice');
  existing?.remove();

  const notice = document.createElement('p');
  notice.className = 'restart-notice fail-flash';
  notice.textContent = `[FAIL] ${message} — out of tries. Starting from the beginning...`;
  staticBurst();
  showWhisper('back to square one...');
  landingBody.insertBefore(notice, btnStart);
  setTimeout(() => notice.remove(), 5000);
  resetState();
}

function grantSymbol() {
  const sym = SAFE_CONFIG.symbols[state.currentLevel];
  const idx = state.currentLevel;
  state.symbolsCollected[idx] = sym;
  renderSymbolSlots(idx);

  symbolOkLine.textContent = `[OK] key piece collected: ${sym}`;
  symbolDisplay.textContent = sym;
  symbolHint.textContent = `key #${idx + 1} = "${sym}"`;
  symbolOkLine.classList.remove('glitch');
  void symbolOkLine.offsetWidth;
  symbolOkLine.classList.add('glitch');
  showWhisper('nice one!');

  showScreen('symbol');
}

function onContinueAfterSymbol() {
  state.currentLevel += 1;
  if (state.currentLevel >= QUESTIONS.length) {
    showSafe();
  } else {
    showScreen('quiz');
    loadQuestion();
  }
}

function showSafe() {
  clearTimer();
  showScreen('safe');
  safeError.hidden = true;
  unlockInput.value = '';
  safeDoor.classList.remove('unlocked');
  safeStatus.textContent = 'LOCKED';
  showWhisper('enter the code...');

  inventoryPick.innerHTML = '';
  const label = document.createElement('p');
  label.className = 'dim pick-label eerie';
  label.textContent = '// tap your key pieces to build the code:';
  inventoryPick.appendChild(label);

  const row = document.createElement('div');
  row.className = 'pick-row';
  state.symbolsCollected.forEach((sym) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'symbol-chip';
    chip.textContent = sym;
    chip.addEventListener('click', () => {
      unlockInput.value += sym;
      unlockInput.focus();
      chip.style.transform = 'scale(0.9)';
      setTimeout(() => { chip.style.transform = ''; }, 120);
    });
    row.appendChild(chip);
  });
  inventoryPick.appendChild(row);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-text';
  clearBtn.textContent = 'clear input';
  clearBtn.addEventListener('click', () => {
    unlockInput.value = '';
    safeError.hidden = true;
  });
  inventoryPick.appendChild(clearBtn);

  unlockInput.focus();
}

function normalizeCode(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '');
}

function isValidCombination(input) {
  const normalized = normalizeCode(input);
  const accepted = [
    SAFE_CONFIG.combination,
    ...(SAFE_CONFIG.alternateCombinations ?? []),
  ].map(normalizeCode);
  return accepted.includes(normalized);
}

function onUnlockSubmit(e) {
  e.preventDefault();
  const code = unlockInput.value;

  if (!code.trim()) {
    showSafeError('No combination entered.');
    return;
  }

  if (isValidCombination(code)) {
    safeDoor.classList.remove('unlocked');
    void safeDoor.offsetWidth;
    safeDoor.classList.add('unlocked');
    safeStatus.textContent = 'OPEN';
    playFlash('success');
    burstParticles(24, true);
    showWhisper('it\'s open!');
    safeError.hidden = true;
    setTimeout(() => showReward(), 900);
  } else {
    screens.safe.querySelector('.terminal-window')?.classList.add('shake');
    setTimeout(() => screens.safe.querySelector('.terminal-window')?.classList.remove('shake'), 500);
    showSafeError('Wrong code — try again.');
    staticBurst();
    showWhisper('not quite...');
  }
}

function showSafeError(msg) {
  safeError.textContent = `[FAIL] ${msg}`;
  safeError.hidden = false;
}

function showReward() {
  showScreen('reward');
  resetPrizeChoice();
  rewardCodeArea.hidden = true;
  rewardCodeArea.classList.remove('reveal');
  rewardCodeEl.textContent = '';
}

function resetPrizeChoice() {
  prizeChoice = null;
  if (prizePicker) prizePicker.hidden = false;
  if (prizeMainReveal) prizeMainReveal.hidden = true;
  if (prizeAltReveal) prizeAltReveal.hidden = true;
  if (btnPickMain) {
    btnPickMain.disabled = false;
    btnPickMain.classList.remove('selected', 'locked');
  }
  if (btnPickAlt) {
    btnPickAlt.disabled = false;
    btnPickAlt.classList.remove('selected', 'locked');
  }
  if (btnClaim) btnClaim.hidden = false;
}

function lockPrizeOption(selectedBtn, otherBtn) {
  selectedBtn?.classList.add('selected');
  otherBtn?.classList.add('locked');
  otherBtn.disabled = true;
}

function onPickMainPrize() {
  if (prizeChoice) return;
  prizeChoice = 'main';
  lockPrizeOption(btnPickMain, btnPickAlt);
  prizeMainReveal.hidden = false;
  prizeMainReveal.classList.remove('reveal-in');
  void prizeMainReveal.offsetWidth;
  prizeMainReveal.classList.add('reveal-in');
  prizeMainReveal.querySelectorAll('.prize-card, .prize-icon, .prize-map').forEach((el) => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

function onPickAltPrize() {
  if (prizeChoice) return;
  prizeChoice = 'alt';
  lockPrizeOption(btnPickAlt, btnPickMain);
  showJokePopup();
  prizeAltReveal.hidden = false;
  prizeAltReveal.classList.remove('reveal-in');
  void prizeAltReveal.offsetWidth;
  prizeAltReveal.classList.add('reveal-in');
  prizeAltReveal.querySelectorAll('.prize-card, .prize-icon').forEach((el) => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
}

function generateRewardCode() {
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase();
  return `HEIST-PRIZE-${suffix}`;
}

async function onClaimReward() {
  const code = generateRewardCode();
  rewardCodeEl.textContent = code;
  rewardCodeArea.hidden = false;
  rewardCodeArea.classList.remove('reveal');
  void rewardCodeArea.offsetWidth;
  rewardCodeArea.classList.add('reveal');
  burstParticles(20, true);
  playFlash('success');
  btnClaim.hidden = true;

  try {
    await navigator.clipboard.writeText(code);
    showToast();
  } catch {
    showToast('Select and copy the code above.');
  }

  startSelfDestruct();
}

function startSelfDestruct() {
  if (!selfDestructOverlay || !selfDestructTimer) return;
  clearSelfDestruct();
  selfDestruct?.classList.remove('critical');
  selfDestructOverlay.hidden = false;
  selfDestructGoodbye.hidden = true;
  document.body.classList.add('destruct-active');
  document.querySelector('.casino-frame')?.classList.add('destruct-armed');

  let secondsLeft = SELF_DESTRUCT_SECONDS;
  selfDestructTimer.textContent = String(secondsLeft);

  selfDestructId = setInterval(() => {
    secondsLeft -= 1;
    selfDestructTimer.textContent = String(secondsLeft);
    selfDestructTimer.classList.remove('tick');
    void selfDestructTimer.offsetWidth;
    selfDestructTimer.classList.add('tick');

    if (secondsLeft <= 5) {
      selfDestruct?.classList.add('critical');
    }

    if (secondsLeft <= 0) {
      clearSelfDestruct();
      triggerSelfDestruct();
    }
  }, 1000);
}

function clearSelfDestruct() {
  if (selfDestructId) {
    clearInterval(selfDestructId);
    selfDestructId = null;
  }
}

function triggerSelfDestruct() {
  selfDestructGoodbye.hidden = false;
  document.body.classList.add('site-destroyed');
  playFlash('fail');

  setTimeout(() => {
    selfDestructOverlay.hidden = true;
    screens.reward.innerHTML = `
      <div class="destroyed-screen">
        <p class="destroyed-text">[ SIGNAL LOST ]</p>
        <p class="destroyed-sub">This site has self-destructed.</p>
        <p class="destroyed-sub dim">Goodbye.</p>
      </div>
    `;
  }, 1200);
}

function showToast(msg = 'Code copied! Show it to Pascal.') {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function showJokePopup() {
  if (!jokePopup) return;
  if (jokePopupTimeoutId) clearTimeout(jokePopupTimeoutId);

  jokePopup.hidden = false;
  jokePopup.classList.remove('visible');
  void jokePopup.offsetWidth;
  jokePopup.classList.add('visible');

  jokePopupTimeoutId = setTimeout(() => {
    jokePopup.classList.remove('visible');
    jokePopupTimeoutId = setTimeout(() => {
      jokePopup.hidden = true;
      jokePopupTimeoutId = null;
    }, 280);
  }, 3200);
}

init();
