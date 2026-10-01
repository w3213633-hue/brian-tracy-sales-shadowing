(() => {
  const transcript = document.querySelector('#transcript');
  const audio = document.querySelector('#audio');
  if (!transcript || !audio) return;

  let clickTimer = 0;
  let bypassClick = false;
  let suppressClickUntil = 0;
  let lastTouchWord = null;
  let lastTouchAt = 0;
  let lastPlayedWord = null;
  let lastPlayedAt = 0;

  const style = document.createElement('style');
  style.textContent = '.word { touch-action: manipulation; }\n' +
    '.word.word-play-origin { color: #061d24 !important; background: var(--teal) !important; box-shadow: 0 0 0 4px rgba(84,210,200,.2) !important; }\n' +
    '.play-from-word-button { margin-left: 8px; border-color: rgba(244,182,77,.35); color: var(--amber); }\n' +
    '@media (max-width: 560px) { .play-from-word-button { display: block; margin: 8px 0 0; width: 100%; } }';
  document.head.appendChild(style);

  const hint = document.querySelector('.toolbar-hint');
  if (hint) hint.textContent = '真实语音逐词同步 · 点单词听美式发音并看释义 · 双击从该词位置播放原音 · 拖选内容做语法讲解';

  function startTime(word) {
    const exact = Number(word.dataset.start);
    if (Number.isFinite(exact)) return exact;
    const stamp = word.closest('.segment')?.querySelector('[data-seek]');
    return Number(stamp?.dataset.seek);
  }

  function playFromWord(word) {
    const start = startTime(word);
    if (!Number.isFinite(start)) return;
    const now = performance.now();
    if (word === lastPlayedWord && now - lastPlayedAt < 450) return;
    lastPlayedWord = word;
    lastPlayedAt = now;
    speechSynthesis.cancel();
    const begin = () => {
      audio.currentTime = Math.max(0, Math.min(start, audio.duration || start));
      audio.play().catch(() => {});
    };
    if (audio.readyState === 0) {
      audio.addEventListener('loadedmetadata', begin, { once: true });
      audio.load();
    } else begin();
    word.classList.add('word-play-origin');
    setTimeout(() => word.classList.remove('word-play-origin'), 650);
  }

  function addFallbackButton(word) {
    const speakButton = document.querySelector('#speakWordButton');
    if (!speakButton || document.querySelector('#playFromWordButton')) return;
    const button = document.createElement('button');
    button.className = 'tool-button play-from-word-button';
    button.type = 'button';
    button.id = 'playFromWordButton';
    button.textContent = '↳ 从此处播放原音';
    button.addEventListener('click', () => playFromWord(word));
    speakButton.insertAdjacentElement('afterend', button);
  }

  function runOriginalClick(word) {
    bypassClick = true;
    word.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    bypassClick = false;
    setTimeout(() => addFallbackButton(word), 0);
  }

  transcript.addEventListener('click', (event) => {
    if (bypassClick) return;
    const word = event.target.closest('.word');
    if (!word) return;
    event.stopImmediatePropagation();
    if (event.detail >= 2) {
      event.preventDefault();
      clearTimeout(clickTimer);
      suppressClickUntil = performance.now() + 500;
      window.getSelection()?.removeAllRanges();
      playFromWord(word);
      return;
    }
    if (performance.now() < suppressClickUntil || window.getSelection()?.toString().trim()) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => runOriginalClick(word), 360);
  }, true);

  transcript.addEventListener('dblclick', (event) => {
    const word = event.target.closest('.word');
    if (!word) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearTimeout(clickTimer);
    suppressClickUntil = performance.now() + 500;
    window.getSelection()?.removeAllRanges();
    playFromWord(word);
  }, true);

  transcript.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') return;
    const word = event.target.closest('.word');
    if (!word) return;
    const now = performance.now();
    if (word === lastTouchWord && now - lastTouchAt <= 420) {
      event.preventDefault();
      clearTimeout(clickTimer);
      suppressClickUntil = now + 550;
      window.getSelection()?.removeAllRanges();
      playFromWord(word);
      lastTouchWord = null;
      lastTouchAt = 0;
    } else {
      lastTouchWord = word;
      lastTouchAt = now;
    }
  }, true);
})();
