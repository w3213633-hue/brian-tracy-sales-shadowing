import { capitalizeEnglish, punctuationMarks } from './punctuation-engine.mjs?v=punctuation-20261003';

(() => {
  const transcript = document.querySelector('#transcript');
  const audio = document.querySelector('#audio');
  if (!transcript || !audio) return;

  const WORD_PREROLL_SECONDS = 0.35;
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
    '.auto-punctuation { color: currentColor; pointer-events: none; }\n' +
    '.auto-punctuation.sentence-end { margin-right: .16em; }\n' +
    '.sentence-pair { margin: 0 0 .95rem; }\n' +
    '.sentence-pair .english { margin: 0 0 .28rem; }\n' +
    '.sentence-pair .chinese { margin: 0; line-height: 1.75; }\n' +
    '.sentence-pair .translation-note { margin-top: .35rem; padding-left: .65rem; border-left: 2px solid var(--teal); font-size: .82rem; }\n' +
    '.play-from-word-button { margin-left: 8px; border-color: rgba(244,182,77,.35); color: var(--amber); }\n' +
    '@media (max-width: 560px) { .play-from-word-button { display: block; margin: 8px 0 0; width: 100%; } }';
  document.head.appendChild(style);

  const hint = document.querySelector('.toolbar-hint');
  if (hint) hint.textContent = '真实语音逐词同步 · 点单词听美式发音并看释义 · 双击会提前约 0.35 秒播放原音 · 英文句首自动大写 · 严格对照译文 · 拖选内容看详细语法';

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
      const clearStart = Math.max(0, start - WORD_PREROLL_SECONDS);
      audio.currentTime = Math.min(clearStart, audio.duration || clearStart);
      audio.play().catch(() => {});
    };
    if (audio.readyState === 0) {
      audio.addEventListener('loadedmetadata', begin, { once: true });
      audio.load();
    } else begin();
    word.classList.add('word-play-origin');
    setTimeout(() => word.classList.remove('word-play-origin'), 650);
  }

  function insertPunctuation(word, mark) {
    const punctuation = document.createElement('span');
    punctuation.className = 'auto-punctuation' + (mark === ',' ? '' : ' sentence-end');
    punctuation.textContent = mark;
    word.insertAdjacentElement('afterend', punctuation);
  }


  function capitalizeSentenceStarts() {
    let sentenceStart = true;
    const items = transcript.querySelectorAll('.english .word, .english .token, .english .auto-punctuation');
    items.forEach((item) => {
      if (item.classList.contains('sentence-end') || (item.classList.contains('token') && /[.!?]/.test(item.textContent || ''))) {
        sentenceStart = true;
        return;
      }
      if (!item.classList.contains('word') || !sentenceStart) return;
      item.textContent = capitalizeEnglish(item.textContent);
      sentenceStart = false;
    });
  }


  function addSmartPunctuation() {
    transcript.querySelectorAll('.auto-punctuation').forEach((item) => item.remove());
    const pairs = [...transcript.querySelectorAll('.sentence-pair')];
    if (!pairs.length) return false;
    pairs.forEach((pair) => {
      const elements = [...pair.querySelectorAll('.sentence-english .word[data-start][data-end]')];
      if (!elements.length) return;
      const words = elements.map(element => ({
        text: element.dataset.word || element.textContent || '',
        start: Number(element.dataset.start),
        end: Number(element.dataset.end),
        noPause: element.dataset.noPause === 'true',
      }));
      const chinese = pair.querySelector('.sentence-chinese')?.textContent || '';
      punctuationMarks(words, chinese).forEach((mark, index) => {
        let anchor = elements[index];
        if (index === elements.length - 1) {
          const finalToken = pair.querySelector('.sentence-english')?.lastElementChild;
          if (finalToken) anchor = finalToken;
        }
        insertPunctuation(anchor, mark);
      });
    });
    capitalizeSentenceStarts();
    return true;
  }

  function preparePunctuation() {
    if (addSmartPunctuation()) return;
    const observer = new MutationObserver(() => {
      if (addSmartPunctuation()) observer.disconnect();
    });
    observer.observe(transcript, { childList: true, subtree: true });
  }

  preparePunctuation();

  function addFallbackButton(word) {
    const speakButton = document.querySelector('#speakWordButton');
    if (!speakButton || document.querySelector('#playFromWordButton')) return;
    const button = document.createElement('button');
    button.className = 'tool-button play-from-word-button';
    button.type = 'button';
    button.id = 'playFromWordButton';
    button.textContent = '↳ 从此处清晰播放原音';
    button.title = '会提前约 0.35 秒进入，避免吞掉目标单词的开头';
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
