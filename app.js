const $ = (selector) => document.querySelector(selector);
const audio = $('#audio');
const transcriptEl = $('#transcript');
const playButton = $('#playButton');
const playIcon = $('#playIcon');
const seekBar = $('#seekBar');
const currentTimeEl = $('#currentTime');
const durationEl = $('#duration');

let transcript = [];
let translations = {};
let dictionary = {};
let wordTimings = [];
let wordTimeline = [];
let activeWordTimelineIndex = -1;
let activeWordElement = null;
let americanVoice = null;
let activeIndex = 0;
let repeatSegment = false;
let loopA = null;
let loopB = null;
let selectedText = '';
let selectedSegmentIndex = 0;
let practiceSeconds = 0;
let lastTick = 0;
let syncFrameId = 0;
let selectionTimer = 0;

const chapters = [
  { start: 5, label: '开场与成长心态' },
  { start: 146, label: '销售是一份“默认工作”' },
  { start: 356, label: '学习销售的七个步骤' },
  { start: 523, label: '用“How”寻找行动' },
  { start: 953, label: '把收入换算成时薪' },
  { start: 1268, label: '增加与客户面对面的时间' },
  { start: 1851, label: '关系、倾听与提问' },
  { start: 2208, label: '呈现价值与处理异议' },
  { start: 2565, label: '成交、转介绍与总结' },
];

function formatTime(value) {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function tokenize(text) {
  return text.match(/\[[^\]]+\]|[A-Za-z]+(?:['’][A-Za-z]+)*|\d+(?::\d+)?(?:%|th)?|[^\s]/g) || [];
}

function renderTranscript() {
  transcriptEl.innerHTML = transcript.map((segment, index) => {
    const words = tokenize(segment.text);
    let spokenWordIndex = 0;
    const wordHtml = words.map((word, wordIndex) => {
      const clean = /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(word);
      const safe = escapeHtml(word);
      let html;
      if (clean) {
        const timing = wordTimings[index]?.[spokenWordIndex++] || null;
        const attributes = timing ? ` data-start="${timing[0]}" data-end="${timing[1]}"` : '';
        html = `<span class="word" data-segment="${index}" data-word="${safe}"${attributes}>${safe}</span>`;
      } else {
        html = `<span class="token">${safe}</span>`;
      }
      return `${wordIndex && !/^[,.;:!?%)\]]$/.test(word) ? ' ' : ''}${html}`;
    }).join('');
    const chinese = translations[String(segment.start)] || '翻译正在整理中。';
    return `<article class="segment" id="segment-${index}" data-index="${index}">
      <button class="timestamp" type="button" data-seek="${segment.start}" aria-label="跳转到 ${formatTime(segment.start)}">${formatTime(segment.start)}</button>
      <div class="segment-copy"><p class="english">${wordHtml}</p><p class="chinese">${escapeHtml(chinese)}</p></div>
    </article>`;
  }).join('');
  wordTimeline = [...transcriptEl.querySelectorAll('.word[data-start]')].map((element) => ({
    start: Number(element.dataset.start),
    end: Number(element.dataset.end),
    element,
  })).sort((a, b) => a.start - b.start);
  activeWordTimelineIndex = -1;
  activeWordElement = null;
  $('#segmentCount').textContent = `${transcript.length} 段`;
  updateActiveSegment(true);
}

function renderChapters() {
  $('#chapterNav').innerHTML = chapters.map((chapter, index) => `<button class="chapter-button" type="button" data-chapter="${index}"><span class="chapter-time">${formatTime(chapter.start)}</span><span class="chapter-name">${chapter.label}</span></button>`).join('');
}

function currentSegmentIndex(time) {
  let low = 0, high = transcript.length - 1, result = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (transcript[mid].start <= time) { result = mid; low = mid + 1; } else high = mid - 1;
  }
  return result;
}

function currentChapterIndex(time) {
  let result = 0;
  chapters.forEach((chapter, index) => { if (chapter.start <= time) result = index; });
  return result;
}

function updateActiveSegment(force = false) {
  if (!transcript.length) return;
  const nextIndex = currentSegmentIndex(audio.currentTime || 0);
  if (force || nextIndex !== activeIndex) {
    transcriptEl.querySelector('.segment.active')?.classList.remove('active');
    activeIndex = nextIndex;
    const nextEl = $(`#segment-${activeIndex}`);
    nextEl?.classList.add('active');
    if ($('#autoScrollToggle').checked && !force && !audio.paused) nextEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const chapterIndex = currentChapterIndex(audio.currentTime || 0);
  $('#chapterLabel').textContent = chapters[chapterIndex].label;
  document.querySelectorAll('.chapter-button').forEach((button, index) => button.classList.toggle('active', index === chapterIndex));
}

function updateActiveWord() {
  if (!wordTimeline.length) return;
  const time = audio.currentTime || 0;
  let low = 0, high = wordTimeline.length - 1, found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (wordTimeline[mid].start <= time + .035) { found = mid; low = mid + 1; } else high = mid - 1;
  }
  if (found >= 0) {
    const item = wordTimeline[found];
    const nextStart = wordTimeline[found + 1]?.start ?? Infinity;
    const grace = Math.min(.14, Math.max(.04, (nextStart - item.end) * .28));
    if (time > item.end + grace) found = -1;
  }
  if (found === activeWordTimelineIndex) return;
  activeWordElement?.classList.remove('active-word');
  activeWordElement?.removeAttribute('aria-current');
  activeWordTimelineIndex = found;
  activeWordElement = found >= 0 ? wordTimeline[found].element : null;
  activeWordElement?.classList.add('active-word');
  activeWordElement?.setAttribute('aria-current', 'true');
}

function updateProgress() {
  const duration = audio.duration || transcript.at(-1)?.end || 2818;
  seekBar.max = duration;
  seekBar.value = audio.currentTime || 0;
  currentTimeEl.textContent = formatTime(audio.currentTime || 0);
  durationEl.textContent = formatTime(duration);
  const percent = duration ? (audio.currentTime / duration) * 100 : 0;
  $('#progressText').textContent = `进度 ${Math.round(percent)}%`;
  $('#miniProgressBar').style.width = `${percent}%`;
  updateActiveSegment();
  updateActiveWord();
  if (!audio.paused) {
    const now = performance.now();
    if (lastTick) practiceSeconds += Math.min(1, (now - lastTick) / 1000);
    lastTick = now;
    $('#practiceTime').textContent = Math.floor(practiceSeconds / 60);
  }
}

function syncPlaybackFrame() {
  updateProgress();
  if (!audio.paused && !audio.ended) syncFrameId = requestAnimationFrame(syncPlaybackFrame);
  else syncFrameId = 0;
}

function seekTo(time, shouldPlay = true) {
  audio.currentTime = Math.max(0, Math.min(time, audio.duration || 99999));
  updateProgress();
  if (shouldPlay) audio.play().catch(() => {});
}

function chooseAmericanVoice() {
  const voices = speechSynthesis.getVoices().filter((voice) => /^en[-_]US$/i.test(voice.lang));
  const preferredNames = [/Aria/i, /Jenny/i, /Guy/i, /Google US English/i, /Samantha/i, /Alex/i];
  americanVoice = preferredNames.map((pattern) => voices.find((voice) => pattern.test(voice.name))).find(Boolean) || voices.find((voice) => voice.default) || voices[0] || null;
}

function speak(text) {
  speechSynthesis.cancel();
  chooseAmericanVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  if (americanVoice) utterance.voice = americanVoice;
  utterance.rate = 0.82;
  speechSynthesis.speak(utterance);
}

chooseAmericanVoice();
speechSynthesis.addEventListener('voiceschanged', chooseAmericanVoice);

const irregularLemmas = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', does: 'do', did: 'do', done: 'do', went: 'go', gone: 'go',
  got: 'get', gotten: 'get', made: 'make', took: 'take', taken: 'take', came: 'come',
  became: 'become', found: 'find', thought: 'think', told: 'tell', said: 'say', saw: 'see',
  heard: 'hear', gave: 'give', given: 'give', knew: 'know', known: 'know', wrote: 'write',
  written: 'write', bought: 'buy', brought: 'bring', felt: 'feel', left: 'leave',
};

function lookupWord(word) {
  const key = word.toLowerCase().replace(/’/g, "'");
  if (dictionary[key]) return { ...dictionary[key], lookup: key, derivedFrom: dictionary[key].base || '' };
  const candidates = [irregularLemmas[key], key.replace(/'s$/, ''), key.replace(/s$/, ''), key.replace(/es$/, ''), key.replace(/ies$/, 'y'), key.replace(/ied$/, 'y'), key.replace(/ed$/, ''), key.replace(/ed$/, 'e'), key.replace(/ing$/, ''), key.replace(/ing$/, 'e'), key.replace(/ly$/, ''), key.replace(/er$/, ''), key.replace(/est$/, '')].filter(Boolean);
  for (const candidate of candidates) if (dictionary[candidate]) return { ...dictionary[candidate], lookup: candidate, derivedFrom: dictionary[candidate].base || candidate };
  return { phonetic: '', pos: '', translation: '词典中暂无单独释义，请结合下方段落翻译理解。', lookup: key };
}

function firstMeaning(entry) {
  return (entry.translation || '').split(/[；\n]/).map((item) => item.trim()).filter(Boolean)[0] || '';
}

function explainWord(word) {
  const data = lookupWord(word);
  const segmentTranslation = translations[String(transcript[activeIndex]?.start)] || '';
  const meanings = (data.translation || '').split(/[；\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 5);
  $('#coachTitle').textContent = '单词与发音';
  $('#coachContent').className = 'coach-content';
  $('#coachContent').innerHTML = `<div class="word-heading">${escapeHtml(word)}</div><p class="phonetic"><span class="phonetic-label">音标</span><span>${escapeHtml(data.phonetic ? `/${data.phonetic}/` : '暂无音标')}</span></p><button class="tool-button speak-button" type="button" id="speakWordButton">▶ 播放美式发音</button><div class="coach-section"><h3>中文释义</h3><ul class="meaning-list">${meanings.map((meaning) => `<li>${escapeHtml(meaning)}</li>`).join('')}</ul></div>${data.pos ? `<div class="coach-section"><h3>词性${data.derivedFrom ? '与原形' : ''}</h3><p>${escapeHtml(data.pos)}${data.derivedFrom ? ` · 原形 ${escapeHtml(data.derivedFrom)}` : ''}</p></div>` : ''}<div class="coach-section"><h3>所在段落译文</h3><p>${escapeHtml(segmentTranslation)}</p></div><p class="local-note">固定优先使用系统中的 en-US 美式语音；词典查询不需要联网或密钥。</p>`;
  $('#coachPanel').classList.add('open');
  $('#speakWordButton').addEventListener('click', () => speak(word));
}

const auxiliaries = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must']);
const functionWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'for', 'from', 'with', 'by', 'as', 'that', 'this', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their']);

function grammarStructure(text) {
  const words = tokenize(text).filter((word) => /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(word));
  if (!words.length) return '没有识别到完整的英文词组。';
  const verbIndex = words.findIndex((word) => {
    const lower = word.toLowerCase();
    return auxiliaries.has(lower) || /动词/.test(lookupWord(lower).pos || '');
  });
  if (verbIndex <= 0) return `这是一个${verbIndex === 0 ? '以动词开头的祈使或省略' : '不含明显谓语的短语'}结构；中心内容是 “${words.slice(0, 8).join(' ')}${words.length > 8 ? '…' : ''}”。`;
  const subject = words.slice(0, verbIndex).join(' ');
  const predicate = words.slice(verbIndex).join(' ');
  return `主语部分：${subject}\n谓语及其补充成分：${predicate}`;
}

function grammarPoints(text) {
  const lower = ` ${text.toLowerCase().replace(/’/g, "'")} `;
  const points = [];
  const add = (label, detail) => { if (!points.some((item) => item.label === label)) points.push({ label, detail }); };
  if (/\b(if|unless)\b/.test(lower)) add('条件结构', 'if / unless 引出条件；先判断条件从句，再看主句中的结果或行动。');
  if (/\b(because|since|as)\b/.test(lower)) add('原因从句', 'because / since / as 用来交代原因，后面接一个完整或省略的从句。');
  if (/\b(when|while|before|after|until)\b/.test(lower)) add('时间关系', '时间连接词把动作放进先后或同时发生的关系中。');
  if (/\b(who|which|that)\b/.test(lower)) add('定语或名词从句', 'who / which / that 连接后面的说明内容；要结合前面的名词或动词判断作用。');
  const modal = lower.match(/\b(can|could|will|would|should|must|may|might|shall)\b/);
  if (modal) add('情态动词', `${modal[1]} 后接动词原形，表达能力、可能、意愿、建议或必要性。`);
  if (/\b(have|has|had)\s+(?:\w+\s+){0,2}(been|done|gone|made|taken|given|known|seen|found|\w+ed)\b/.test(lower)) add('完成时', 'have / has / had + 过去分词，把过去的动作与现在或另一个过去时间点联系起来。');
  if (/\b(am|is|are|was|were|be|been|being)\s+(?:\w+\s+){0,1}\w+ing\b/.test(lower)) add('进行时', 'be + -ing 强调动作正在进行或处于一个持续阶段。');
  if (/\b(am|is|are|was|were|be|been|being)\s+(?:\w+\s+){0,1}(\w+ed|done|made|given|taken|known|seen)\b/.test(lower)) add('被动语态', 'be + 过去分词把重点放在承受动作的人或事物上。');
  if (/\bto\s+[a-z]+\b/.test(lower)) add('不定式', 'to + 动词原形常表示目的、计划、结果，或作前面动词的补充。');
  if (/\b\w+ing\b/.test(lower)) add('-ing 形式', '-ing 可能构成进行时，也可能像名词一样表示一项活动；需看它前面是否有 be。');
  if (/\b(more|less|better|worse|higher|lower|than|as\s+\w+\s+as)\b/.test(lower)) add('比较结构', '比较级或 than / as…as 用来比较程度、数量或效果。');
  if (/\b(and|but|or|so)\b/.test(lower)) add('并列连接', 'and / but / or / so 连接并列信息；朗读时可在连接词前后形成意群。');
  if (/\b(why don't you|would you|could you|how do you mean|let me|have to|want to|need to|going to)\b/.test(lower)) add('常用口语句型', '这是演讲和销售对话中的高频固定搭配，应整体记忆，而不是逐词翻译。');
  if (/\b(don't|doesn't|didn't|can't|couldn't|won't|wouldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't)\b/.test(lower)) add('否定缩写', '口语中助动词与 not 经常缩写；重音通常落在否定信息或其后的关键词上。');
  if (/\b(how|what|why|when|where|who|which)\b/.test(lower)) add('疑问表达', '疑问词先限定所缺的信息，再配合助动词或语序构成问题。');
  if (!points.length) add('一般陈述', '片段以常见的主语—谓语结构展开，重点观察谓语动词及其后的宾语或补充信息。');
  return points.slice(0, 6);
}

function keyWordGlossary(text) {
  const seen = new Set();
  return tokenize(text).filter((word) => /^[A-Za-z]+(?:['’][A-Za-z]+)*$/.test(word)).map((word) => word.toLowerCase()).filter((word) => word.length > 2 && !functionWords.has(word) && !seen.has(word) && seen.add(word)).map((word) => ({ word, meaning: firstMeaning(lookupWord(word)) })).filter((item) => item.meaning).slice(0, 8);
}

function readingChunks(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.replace(/\s+(and|but|because|so|if|when|while|which|who|although|then)\s+/gi, ' ｜ $1 ').replace(/\s+(to\s+[A-Za-z]+)\s+/g, ' ｜ $1 ');
}

function explainSelection() {
  if (!selectedText) return;
  const contextTranslation = translations[String(transcript[selectedSegmentIndex]?.start)] || '';
  const points = grammarPoints(selectedText);
  const glossary = keyWordGlossary(selectedText);
  const sections = [
    { title: '选中内容', content: `“${selectedText}”` },
    { title: '句子主干', content: grammarStructure(selectedText) },
    { title: '语法点', content: points.map((item) => `• ${item.label}：${item.detail}`).join('\n') },
    { title: '关键词', content: glossary.length ? glossary.map((item) => `${item.word}：${item.meaning}`).join('\n') : '这个片段主要由基础功能词组成，请结合句子主干理解。' },
    { title: '表达分组', content: readingChunks(selectedText) },
    { title: '所在段落译文', content: contextTranslation },
  ];
  $('#coachTitle').textContent = '本地语法讲解';
  $('#coachContent').className = 'coach-content';
  $('#coachContent').innerHTML = sections.map((section) => `<div class="coach-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.content)}</p></div>`).join('') + '<p class="local-note">基于本地词典与语法规则生成，不需要联网或密钥。</p>';
  $('#coachPanel').classList.add('open');
  window.getSelection()?.removeAllRanges();
  $('#selectionAction').classList.add('hidden');
}

function updateSelectionAction() {
  const selection = window.getSelection();
  const text = selection?.toString().replace(/\s+/g, ' ').trim() || '';
  if (!selection?.rangeCount || text.length < 2 || text.length > 600) {
    $('#selectionAction').classList.add('hidden');
    return;
  }
  const range = selection.getRangeAt(0);
  const rangeContainer = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  const startContainer = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
  if (!rangeContainer?.closest?.('#transcript') && !startContainer?.closest?.('#transcript')) {
    $('#selectionAction').classList.add('hidden');
    return;
  }
  selectedText = text;
  selectedSegmentIndex = Number(startContainer?.closest?.('.segment')?.dataset.index ?? activeIndex);
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return;
  const action = $('#selectionAction');
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportTop = window.visualViewport?.offsetTop || 0;
  const actionWidth = 126;
  const left = Math.min(viewportWidth - actionWidth - 8, Math.max(8, rect.left + rect.width / 2 - actionWidth / 2));
  const above = rect.top - 48;
  const top = above >= viewportTop + 8 ? above : rect.bottom + 10;
  action.style.left = `${left}px`;
  action.style.top = `${top}px`;
  action.classList.remove('hidden');
}

function scheduleSelectionAction(delay = 80) {
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(updateSelectionAction, delay);
}

async function showMobileAccess() {
  const list = $('#mobileUrlList');
  const copy = $('#mobileAccessCopy');
  const steps = $('#mobileSteps');
  const privacyNote = $('#mobilePrivacyNote');
  list.innerHTML = '<p class="address-status">正在读取本机地址…</p>';
  $('#mobileAccessDialog').showModal();
  const hostname = location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  if (!isLocal) {
    const cloudUrl = new URL('.', location.href).href.replace(/\/$/, '');
    copy.textContent = '这是独立的云端版本。iPhone 使用 Wi‑Fi 或移动数据都能打开，不需要电脑保持开机。';
    list.innerHTML = `<div class="mobile-url-row"><div><span class="network-label">HTTPS 云端地址 · 推荐收藏</span><strong>${escapeHtml(cloudUrl)}</strong></div><button class="tool-button copy-address" type="button" data-copy="${escapeHtml(cloudUrl)}">复制</button></div><p class="address-hint">首次访问私有站点时，请按页面提示登录同一账号。</p>`;
    steps.innerHTML = '<li>在 iPhone 的 Safari 打开上方 HTTPS 地址。</li><li>首次访问时按提示登录，然后即可通过移动数据使用。</li><li>在 Safari 点“分享”→“添加到主屏幕”，以后可像 App 一样打开。</li><li>长按英文并拖动选区，再点“本地语法讲解”。</li>';
    privacyNote.textContent = '云端版本不依赖电脑是否开机，也不要求手机与电脑处于同一个 Wi‑Fi。';
    return;
  }

  copy.textContent = '当前打开的是电脑本地版本。要在同一局域网内访问，可使用下方地址；外出时请使用已发布的 HTTPS 云端地址。';
  steps.innerHTML = '<li>同一 Wi‑Fi 下，在 iPhone 的 Safari 输入上方地址。</li><li>外出使用移动数据时，打开云端 HTTPS 地址。</li><li>在 Safari 点“分享”→“添加到主屏幕”。</li><li>长按英文并拖动选区，再点“本地语法讲解”。</li>';
  privacyNote.textContent = '本地地址依赖电脑保持开机；云端地址不依赖电脑，也不要求同一 Wi‑Fi。';
  try {
    const response = await fetch('./device-info');
    const info = await response.json();
    const addresses = info.addresses?.length ? info.addresses : [];
    if (!addresses.length) {
      list.innerHTML = '<p class="address-status warning">没有找到可用的局域网地址。外出使用时请直接打开云端 HTTPS 地址。</p>';
      return;
    }
    list.innerHTML = addresses.map((item, index) => `<div class="mobile-url-row"><div><span class="network-label">${escapeHtml(item.name)}${item.isPrivate ? ' · 推荐' : ''}</span><strong>${escapeHtml(item.url)}</strong></div><button class="tool-button copy-address" type="button" data-copy="${escapeHtml(item.url)}">复制</button></div>${index === 0 ? '<p class="address-hint">优先尝试这个地址。</p>' : ''}`).join('');
  } catch {
    list.innerHTML = '<p class="address-status warning">读取本地地址失败。外出使用时请直接打开云端 HTTPS 地址。</p>';
  }
}

async function copyAddress(button) {
  const value = button.dataset.copy;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
  button.textContent = '已复制';
  window.setTimeout(() => { button.textContent = '复制'; }, 1600);
}

function isLocalAddress(hostname = location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

async function prepareAudioSource() {
  if (audio.getAttribute('src')) {
    audio.load();
    return;
  }
  const source = audio.dataset.src || './media/brian-tracy-sales.mp3';
  audio.src = source;
  audio.load();
}

async function init() {
  try {
    if (window.EMBEDDED_DATA) {
      transcript = window.EMBEDDED_DATA.transcript || [];
      translations = window.EMBEDDED_DATA.translations || {};
      dictionary = window.EMBEDDED_DATA.dictionary || {};
      wordTimings = window.EMBEDDED_DATA.wordTimings || [];
    } else {
      const [transcriptResponse, translationsResponse, dictionaryResponse, timingsResponse] = await Promise.all([fetch('./data/transcript.json'), fetch('./data/translations.full.json'), fetch('./data/dictionary.json'), fetch('./data/word-timings.json')]);
      transcript = await transcriptResponse.json();
      translations = translationsResponse.ok ? await translationsResponse.json() : {};
      dictionary = dictionaryResponse.ok ? await dictionaryResponse.json() : {};
      wordTimings = timingsResponse.ok ? await timingsResponse.json() : [];
    }
  } catch {
    transcript = [{ start: 5, end: 42, text: 'Thank you. Thank you for being here. Thank you for coming so far and making such a sacrifice.' }];
    translations = { '5': '谢谢大家。感谢各位来到这里，也感谢大家远道而来并为此付出。' };
  }
  renderChapters();
  renderTranscript();
  const saved = JSON.parse(localStorage.getItem('shadowing-preferences') || '{}');
  try {
    await prepareAudioSource();
  } catch (error) {
    playButton.disabled = true;
    playButton.title = error.message;
    durationEl.textContent = '音频加载失败';
  }
  if (saved.rate) { audio.playbackRate = saved.rate; $('#rateSelect').value = String(saved.rate); }
  if (saved.position) {
    const restorePosition = () => { audio.currentTime = Math.min(saved.position, audio.duration || saved.position); };
    if (audio.readyState >= 1) restorePosition();
    else audio.addEventListener('loadedmetadata', restorePosition, { once: true });
  }
  if (saved.practiceSeconds) practiceSeconds = saved.practiceSeconds;
  updateProgress();
}

playButton.addEventListener('click', () => audio.paused ? audio.play() : audio.pause());
audio.addEventListener('play', () => { playIcon.textContent = 'Ⅱ'; playButton.setAttribute('aria-label', '暂停'); lastTick = performance.now(); if (!syncFrameId) syncFrameId = requestAnimationFrame(syncPlaybackFrame); });
audio.addEventListener('pause', () => { playIcon.textContent = '▶'; playButton.setAttribute('aria-label', '播放'); lastTick = 0; if (syncFrameId) cancelAnimationFrame(syncFrameId); syncFrameId = 0; });
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('timeupdate', () => {
  updateProgress();
  const segment = transcript[activeIndex];
  if (repeatSegment && segment && audio.currentTime >= segment.end - .08) seekTo(segment.start, true);
  if (loopA != null && loopB != null && audio.currentTime >= loopB) seekTo(loopA, true);
});
seekBar.addEventListener('input', () => { audio.currentTime = Number(seekBar.value); updateProgress(); });
$('#backButton').addEventListener('click', () => seekTo(audio.currentTime - 5));
$('#forwardButton').addEventListener('click', () => seekTo(audio.currentTime + 5));
$('#prevButton').addEventListener('click', () => seekTo(transcript[Math.max(0, activeIndex - 1)]?.start || 0));
$('#nextButton').addEventListener('click', () => seekTo(transcript[Math.min(transcript.length - 1, activeIndex + 1)]?.start || 0));
$('#rateSelect').addEventListener('change', (event) => { audio.playbackRate = Number(event.target.value); });
$('#repeatButton').addEventListener('click', () => { repeatSegment = !repeatSegment; $('#repeatButton').classList.toggle('active', repeatSegment); });
$('#aButton').addEventListener('click', () => { loopA = audio.currentTime; $('#aButton').textContent = `A ${formatTime(loopA)}`; $('#aButton').classList.add('active'); $('#clearLoopButton').classList.remove('hidden'); });
$('#bButton').addEventListener('click', () => { loopB = audio.currentTime; if (loopA == null || loopB <= loopA) { loopA = Math.max(0, loopB - 8); $('#aButton').textContent = `A ${formatTime(loopA)}`; $('#aButton').classList.add('active'); } $('#bButton').textContent = `B ${formatTime(loopB)}`; $('#bButton').classList.add('active'); $('#clearLoopButton').classList.remove('hidden'); });
$('#clearLoopButton').addEventListener('click', () => { loopA = loopB = null; $('#aButton').textContent = '设 A 点'; $('#bButton').textContent = '设 B 点'; $('#aButton').classList.remove('active'); $('#bButton').classList.remove('active'); $('#clearLoopButton').classList.add('hidden'); });
$('#translationToggle').addEventListener('change', (event) => transcriptEl.classList.toggle('hide-translation', !event.target.checked));
transcriptEl.addEventListener('click', (event) => {
  const timestamp = event.target.closest('[data-seek]');
  if (timestamp) return seekTo(Number(timestamp.dataset.seek));
  const word = event.target.closest('.word');
  if (word && !window.getSelection()?.toString().trim()) {
    activeIndex = Number(word.dataset.segment);
    speak(word.dataset.word);
    explainWord(word.dataset.word);
  }
});
$('#chapterNav').addEventListener('click', (event) => { const button = event.target.closest('[data-chapter]'); if (button) seekTo(chapters[Number(button.dataset.chapter)].start); });

document.addEventListener('selectionchange', () => scheduleSelectionAction(120));
document.addEventListener('mouseup', (event) => {
  if (!event.target.closest?.('#selectionAction')) scheduleSelectionAction(0);
});
document.addEventListener('touchend', (event) => {
  if (!event.target.closest?.('#selectionAction')) scheduleSelectionAction(180);
}, { passive: true });
$('#selectionAction').addEventListener('pointerdown', (event) => event.preventDefault());
$('#selectionAction').addEventListener('click', explainSelection);
$('#shortcutsButton').addEventListener('click', () => $('#shortcutsDialog').showModal());
$('#mobileAccessButton').addEventListener('click', showMobileAccess);
$('#mobileUrlList').addEventListener('click', (event) => {
  const button = event.target.closest('.copy-address');
  if (button) copyAddress(button);
});
$('#closeCoachButton').addEventListener('click', () => $('#coachPanel').classList.remove('open'));

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  if (event.code === 'Space') { event.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
  if (event.key === 'ArrowLeft') seekTo(audio.currentTime - 5);
  if (event.key === 'ArrowRight') seekTo(audio.currentTime + 5);
  if (event.key.toLowerCase() === 'r') $('#repeatButton').click();
});

setInterval(() => localStorage.setItem('shadowing-preferences', JSON.stringify({ position: audio.currentTime || 0, rate: audio.playbackRate, practiceSeconds })), 5000);
init();
