const rules = [
  {
    title: 'instead of + -ing：用一个动作替代另一个动作',
    pattern: /\binstead of\s+(?:going|talking|asking|doing|using|working|spending|thinking|trying|making|selling|buying|learning|calling|presenting|closing|listening)\b[^,.;!?]*/i,
    formula: 'instead of + 名词或动词 -ing = 不做……，而做…… / 代替……',
    detail: 'of 是介词，所以后面的动词使用 -ing。这个结构表达替代或对照，本身不表示“结果”。',
    example: 'Instead of talking, I asked questions. = 我没有自己讲，而是提问。',
  },
  {
    title: 'as opposed to：与……相对、而不是……',
    pattern: /\bas opposed to\s+[^,.;!?]+/i,
    formula: 'A as opposed to B = A 与 B 相比 / A 而不是 B',
    detail: 'to 在这里是介词，不是不定式标记；后接动作时通常使用 -ing。它表示对照，不自动表示因果。',
    example: 'I listened as opposed to talking. = 我选择倾听，而不是自己讲。',
  },
  {
    title: 'what + 从句：把一整段内容当作“……的东西/事情”',
    pattern: /\bwhat\s+(?:i|you|he|she|we|they|people|customers?)\s+(?:do|does|did|want|need|say|said|give|gave|think|thought|found|find|learned|mean)[^,.;!?]*/i,
    formula: 'what + 主语 + 动词 = 主语所……的东西/事情',
    detail: '这里的 what 不是单独问“什么”，而是引导名词性结构；整个结构可以作主语、宾语或表语。',
    example: 'What I need is more time. = 我需要的是更多时间。',
  },
  {
    title: 'do / did + 动词原形：肯定句中的强调',
    pattern: /\b(?:i|you|he|she|we|they|what\s+\w+)\s+(?:do|does|did)\s+(?:give|say|tell|want|need|know|find|make|work|try|care|believe|have)\b[^,.;!?]*/i,
    formula: 'do / does / did + 动词原形 = 的确、确实……',
    detail: '肯定句本来不需要 do；加上它是为了强调或纠正前面的否定印象。did 已经承担过去时，后面的动词保持原形。',
    example: 'What he did say was true. = 他确实说过的话是真的。',
  },
  {
    title: '现在完成时：过去发生，与现在仍有关联',
    pattern: /\b(?:have|has)\s+(?:already\s+|never\s+|ever\s+|just\s+)?(?:been|done|gone|made|taken|given|known|seen|found|sold|worked|learned|started|heard|called|spent|agreed|prepared|opened|written|met|had|become)\b[^,.;!?]*/i,
    formula: 'have / has + 过去分词',
    detail: '重点不是单纯讲一个过去时间，而是说明过去的经历、结果或持续状态与现在有关。have 在这里不是“拥有”。',
    example: 'I have worked here for three years. = 我在这里工作三年了。',
  },
  {
    title: '过去完成时：在另一个过去动作之前已经完成',
    pattern: /\bhad\s+(?:already\s+|never\s+)?(?:been|done|gone|made|taken|given|known|seen|found|sold|worked|learned|started|heard|called|spent|agreed|prepared|opened|written|met|had|become)\b[^,.;!?]*/i,
    formula: 'had + 过去分词',
    detail: '它把观察点放在过去，再说明某件事在那个过去时间之前已经发生。',
    example: 'They had left before I arrived. = 我到达以前，他们已经离开了。',
  },
  {
    title: 'used to：过去经常如此，现在未必如此',
    pattern: /\bused to\s+[a-z]+\b[^,.;!?]*/i,
    formula: 'used to + 动词原形',
    detail: '表示过去的习惯或状态，通常暗示现在已经不同。不要和 be used to doing（习惯于做……）混淆。',
    example: 'I used to knock on doors. = 我过去常常挨家敲门。',
  },
  {
    title: 'would：过去反复发生的动作',
    pattern: /\b(?:i|he|she|we|they|people|customers?)\s+would\s+(?:go|ask|say|start|work|knock|call|listen|make|come|take|look|try|spend|click|laugh|think|find|give)\b[^,.;!?]*/i,
    formula: '主语 + would + 动词原形（叙述过去经历时）',
    detail: '在过去经历的上下文中，would 可以表示反复发生的习惯动作，不一定表示“将会”。',
    example: 'Every evening, I would call customers. = 过去每天晚上，我都会给客户打电话。',
  },
  {
    title: '情态动词 + 动词原形',
    pattern: /\b(?:can|could|will|would|should|must|may|might|shall)\s+(?:not\s+)?[a-z]+\b[^,.;!?]*/i,
    formula: '情态动词 + 动词原形',
    detail: '情态动词表达能力、可能性、意愿、建议或必要性。它后面的动词不加 -s，也不使用过去式。',
    example: 'You can improve. = 你可以提高。',
  },
  {
    title: 'if 条件结构',
    pattern: /\bif\s+[^,.;!?]+/i,
    formula: 'if + 条件，主句说明在该条件下的结果或行动',
    detail: '先找出 if 后面的条件，再看主句说什么。中文可以调整前后顺序，但不能把没有写出的因果关系补进译文。',
    example: 'If you ask, they will answer. = 如果你问，他们就会回答。',
  },
  {
    title: 'the more …, the more …：越……，越……',
    pattern: /\bthe more\s+[^,.;!?]+(?:,|\s)\s*the more\s+[^,.;!?]+/i,
    formula: 'the + 比较级，the + 比较级',
    detail: '前一部分表示条件随程度变化，后一部分表示相应变化。两个 the 都不是普通的“这个”。',
    example: 'The more you ask, the more you learn. = 你问得越多，学得越多。',
  },
  {
    title: 'because / since：明确说明原因',
    pattern: /\b(?:because|since)\s+[^,.;!?]+/i,
    formula: 'because / since + 原因从句',
    detail: '这类连接词明确标出原因。只有原文出现这种原因标记，中文正文才应明确补出“因为”。',
    example: 'Sales rose because we asked better questions. = 因为我们问了更好的问题，销售额提高了。',
  },
  {
    title: 'so：说话人明确给出的结果或下一步',
    pattern: /\bso\s+(?:i|you|he|she|we|they|people|customers?|the|this|that)\b[^,.;!?]*/i,
    formula: '原因或前提 + so + 结果 / 行动',
    detail: 'so 明确连接前后逻辑，可以译为“所以、因此、于是”。如果只有 and，就不应自动译成“结果”。',
    example: 'I changed my approach, so my sales improved. = 我改变了方法，所以销售业绩提高了。',
  },
  {
    title: 'who / which / that：在名词后补充说明',
    pattern: /\b(?:people|person|customers?|salespeople|company|companies|product|service|thing|things|idea|ideas|time|word|way|reason|problem|skill|study|office|manager)\s+(?:who|which|that)\s+[^,.;!?]+/i,
    formula: '名词 + who / which / that + 说明内容',
    detail: '关系词后面的内容修饰前面的名词。who 通常指人，which 通常指物，that 两者都可。',
    example: 'People who ask questions learn more. = 提问的人会了解得更多。',
  },
  {
    title: 'when / whenever / before / after：时间关系',
    pattern: /\b(?:when|whenever|before|after|until)\s+[^,.;!?]+/i,
    formula: '时间连接词 + 从句',
    detail: '这个从句给主句动作设定时间。whenever 强调“每当”，before/after 强调先后。',
    example: 'When they finish speaking, pause. = 他们说完时，停顿一下。',
  },
  {
    title: '被动语态：把重点放在承受动作的一方',
    pattern: /\b(?:am|is|are|was|were|be|been|being)\s+(?:not\s+)?(?:called|determined|based|prepared|made|found|told|paid|rejected|motivated|transformed|surrounded|spelled|discovered|used|finished|opened)\b[^,.;!?]*/i,
    formula: 'be + 过去分词',
    detail: '被动语态强调“谁/什么受到这个动作”，执行动作的人可以不说。',
    example: 'The result is determined by your actions. = 结果由你的行动决定。',
  },
  {
    title: 'to + 动词原形：不定式',
    pattern: /\bto\s+(?:ask|buy|call|change|close|do|earn|find|get|give|go|help|increase|know|learn|listen|make|meet|overcome|present|read|reduce|remember|sell|show|solve|speak|spend|start|take|talk|teach|think|try|use|visit|work|write)\b[^,.;!?]*/i,
    formula: 'to + 动词原形',
    detail: '不定式可能表示目的，也可能补充前面动词或名词的内容。不能只看见 to 就一律解释成“为了”，要连同前面的词一起判断。',
    example: 'I want to learn. = 我想学习。（to learn 补充 want 的内容）',
  },
  {
    title: '介词 + -ing：把动作当作一件事情',
    pattern: /\b(?:by|of|for|about|without|before|after|instead of|as opposed to)\s+[a-z]+ing\b[^,.;!?]*/i,
    formula: '介词 + 动词 -ing',
    detail: '介词后不能直接接动词原形，因此把动作改成 -ing 形式，当作名词性内容。',
    example: 'You improve by practicing. = 你通过练习得到提高。',
  },
  {
    title: 'spend + 时间 + doing：花时间做某事',
    pattern: /\bspend(?:s|ing|t)?\s+[^,.;!?]*\s+[a-z]+ing\b[^,.;!?]*/i,
    formula: 'spend + 时间 + doing something',
    detail: 'doing 说明时间花在什么活动上；这里不用 to do。',
    example: 'Spend more time talking to customers. = 花更多时间与客户交谈。',
  },
  {
    title: 'ask / tell / want + 人 + to do',
    pattern: /\b(?:ask|asks|asked|tell|tells|told|want|wants|wanted|get|gets|got)\s+(?:me|you|him|her|us|them|people|customers?|salespeople)\s+to\s+[a-z]+\b[^,.;!?]*/i,
    formula: '动词 + 人 + to + 动词原形',
    detail: '中间的人是后面动作的执行者：要求、告诉、希望或促使某人去做某事。',
    example: 'I asked them to try. = 我请他们试一试。',
  },
  {
    title: 'make / let + 人 + 动词原形',
    pattern: /\b(?:make|makes|made|let|lets)\s+(?:me|you|him|her|us|them|people|customers?|salespeople)\s+[a-z]+\b[^,.;!?]*/i,
    formula: 'make / let + 人 + 动词原形',
    detail: 'make 表示“使某人做”，let 表示“让某人做”。主动语态中，后面的动词前不加 to。',
    example: 'Questions make customers think. = 问题会让客户思考。',
  },
  {
    title: 'there is / there are：引出某人或某物的存在',
    pattern: /\bthere\s+(?:is|are|was|were|has been|have been)\s+[^,.;!?]+/i,
    formula: 'there + be + 名词',
    detail: 'there 在这里不表示具体地点，而是把一个新的人或事物引入谈话。',
    example: 'There are three steps. = 有三个步骤。',
  },
  {
    title: 'go up：数量、业绩或水平上升',
    pattern: /\b(?:sales|income|price|prices|number|numbers|rate|rates|percentage|percentages|it|they)\s+(?:go|goes|went|gone|going)\s+up\b/i,
    formula: 'go up = 上升、提高、增加',
    detail: '这是常用短语。went 是 go 的过去式；它只陈述“上升了”，并不自带“结果”这个连接词。',
    example: 'My sales went up. = 我的销售业绩提高了。',
  },
  {
    title: 'treat + 人 + differently：以不同方式对待某人',
    pattern: /\btreat(?:s|ed|ing)?\s+(?:me|you|him|her|us|them|people|customers?)\s+differently\b/i,
    formula: 'treat + 人 + 副词',
    detail: 'treat 表示“对待”；differently 是副词，修饰 treat，说明对待的方式不同。',
    example: 'People treated me differently. = 人们对待我的方式不同。',
  },
  {
    title: 'why don’t you …?：提出建议或邀请',
    pattern: /\bwhy\s+don['’]t\s+you\s+[a-z]+\b[^,.;!?]*/i,
    formula: 'Why don’t you + 动词原形?',
    detail: '形式上是否定疑问句，实际常用于温和地建议或邀请：“你何不……？”',
    example: 'Why don’t you give it a try? = 你何不试试看？',
  },
  {
    title: 'give it a try：试一试',
    pattern: /\bgive\s+it\s+a\s+try\b/i,
    formula: 'give + it + a try',
    detail: '固定口语表达，it 指当前讨论的做法、产品或方案；整体理解为“试试看”。',
    example: 'I’ll give it a try. = 我会试试看。',
  },
  {
    title: 'how do you mean?：请对方解释得更具体',
    pattern: /\bhow\s+do\s+you\s+mean(?:\s+exactly)?\b/i,
    formula: 'How do you mean (exactly)?',
    detail: '这里不是询问方式，而是在追问对方刚才的话具体指什么。自然中文是“你的意思是？”或“具体怎么说？”',
    example: 'How do you mean exactly? = 你具体是什么意思？',
  },
  {
    title: 'in terms of：从……角度来看',
    pattern: /\bin\s+terms\s+of\s+[^,.;!?]+/i,
    formula: 'in terms of + 名词',
    detail: '用来限定讨论角度或衡量标准，不是逐词理解为“在术语里”。',
    example: 'Think in terms of your hourly rate. = 从时薪的角度思考。',
  },
  {
    title: 'take place：发生、进行',
    pattern: /\btake(?:s|n|ing)?\s+place\b/i,
    formula: 'take place = 发生',
    detail: '固定搭配，不能按 take 和 place 分别直译。',
    example: 'Buying takes place in the silence. = 购买决定发生在沉默中。',
  },
  {
    title: 'not … but …：否定前者，肯定后者',
    pattern: /\bnot\s+[^,.;!?]+\s+but\s+[^,.;!?]+/i,
    formula: 'not A but B = 不是 A，而是 B',
    detail: '重点落在 but 后面的 B。朗读时，A 和 B 通常形成清楚的对比。',
    example: 'It is not selling but listening. = 这不是推销，而是倾听。',
  },
];

function normalized(text) {
  return text.replace(/\s+/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
}

function findMatch(rule, text) {
  const match = normalized(text).match(rule.pattern);
  return match?.[0]?.trim() || '';
}

export function grammarAnalysis(selectedText, sentenceText) {
  const selected = normalized(selectedText);
  const sentence = normalized(sentenceText || selectedText);
  const chosen = [];
  for (const source of [selected, sentence]) {
    for (const rule of rules) {
      if (chosen.some(item => item.title === rule.title)) continue;
      const focus = findMatch(rule, source);
      if (!focus) continue;
      chosen.push({ ...rule, focus });
      if (chosen.length >= 5) break;
    }
    if (chosen.length >= 5) break;
  }
  if (!chosen.length) {
    chosen.push({
      title: '按意群理解这段口语',
      focus: selected,
      formula: '先找动作，再看动作涉及的人或事',
      detail: '这段没有命中适合可靠解释的固定结构。为避免误导，这里不强行给它贴语法标签；可以结合完整句和对照翻译理解。',
      example: '朗读时先按意思分组，再观察每组中的核心动词。',
    });
  }
  return chosen;
}

export function readingGroups(text) {
  const sentence = normalized(text);
  return sentence
    .replace(/\s+(instead of|as opposed to|because|although|whereas|whenever|when|while|before|after|if|so|but|and)\s+/gi, ' ｜ $1 ')
    .replace(/\s+(to\s+[A-Za-z]+)\s+/g, ' ｜ $1 ');
}
