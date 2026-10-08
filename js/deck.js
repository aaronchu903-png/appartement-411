/* L’Appartement 411 — public study deck (v0.2.0).
 * AI-authored draft for life with Camille, Noé and a Montreal apartment. Not a native-speaker certification.
 * See docs/CONTENT_REVIEW.md. No private learner notes are in this file.
 */
(function (root) {
  'use strict';
  var ITEMS = [
 {
  "id": "salut",
  "grammar": "greetings",
  "band": "A1",
  "speaker": "noe",
  "fr": "Salut !",
  "zh": "嗨！（熟人之间）",
  "en": "Hi! (casual)",
  "noteZh": "Noé 进门常用 Salut，比 Bonjour 随便。离开时也可以用。",
  "noteEn": "Noé says Salut at the door. It is more casual than Bonjour, and it can also mean bye.",
  "listen": {
   "answer": "hi",
   "options": [
    {
     "id": "hi",
     "zh": "打招呼",
     "en": "a greeting"
    },
    {
     "id": "thx",
     "zh": "道谢",
     "en": "saying thanks"
    },
    {
     "id": "ask",
     "zh": "问名字",
     "en": "asking your name"
    }
   ]
  },
  "produce": {
   "accept": [
    "Salut",
    "Salut !"
   ]
  }
 },
 {
  "id": "bonjour",
  "grammar": "greetings",
  "band": "A1",
  "speaker": "camille",
  "fr": "Bonjour !",
  "zh": "你好！（白天、比较礼貌）",
  "en": "Hello! (daytime, a bit more polite)",
  "noteZh": "白天见到不太熟的人，先用 Bonjour。",
  "noteEn": "Use Bonjour in the daytime with someone you don't know well.",
  "listen": {
   "answer": "hi",
   "options": [
    {
     "id": "hi",
     "zh": "打招呼，比较礼貌",
     "en": "a polite hello"
    },
    {
     "id": "bye",
     "zh": "再见",
     "en": "goodbye only"
    },
    {
     "id": "thx",
     "zh": "谢谢",
     "en": "thanks"
    }
   ]
  },
  "produce": {
   "accept": [
    "Bonjour",
    "Bonjour !"
   ]
  }
 },
 {
  "id": "bonsoir",
  "grammar": "greetings",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Bonsoir !",
  "zh": "晚上好！",
  "en": "Good evening!",
  "noteZh": "天黑以后用 Bonsoir，不用 Bonjour。",
  "noteEn": "After dark, Bonsoir replaces Bonjour.",
  "listen": {
   "answer": "bye",
   "options": [
    {
     "id": "bye",
     "zh": "再见",
     "en": "goodbye"
    },
    {
     "id": "hi",
     "zh": "早上好",
     "en": "good morning"
    },
    {
     "id": "thx",
     "zh": "谢谢",
     "en": "thanks"
    }
   ]
  },
  "produce": {
   "accept": [
    "Bonsoir",
    "Bonsoir !"
   ]
  }
 },
 {
  "id": "a_bientot",
  "grammar": "greetings",
  "band": "A1",
  "speaker": "camille",
  "fr": "À bientôt !",
  "zh": "回头见！",
  "en": "See you soon!",
  "noteZh": "分开的时候说。à 要带重音。",
  "noteEn": "Said when leaving. The à has an accent.",
  "listen": {
   "answer": "bye",
   "options": [
    {
     "id": "bye",
     "zh": "再见，回头见",
     "en": "bye, see you"
    },
    {
     "id": "hi",
     "zh": "你好",
     "en": "hello"
    },
    {
     "id": "sorry",
     "zh": "对不起",
     "en": "sorry"
    }
   ]
  },
  "produce": {
   "accept": [
    "À bientôt",
    "A bientôt",
    "À bientôt !"
   ]
  }
 },
 {
  "id": "je_mappelle",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "camille",
  "fr": "Je m'appelle Camille.",
  "zh": "我叫 Camille。",
  "en": "My name is Camille.",
  "noteZh": "m' 是 me 在元音前的省略。名字可以换成你的昵称。",
  "noteEn": "m' is me before a vowel. Swap in your nickname.",
  "listen": {
   "answer": "tell",
   "options": [
    {
     "id": "tell",
     "zh": "她在说自己的名字",
     "en": "she is saying her name"
    },
    {
     "id": "ask",
     "zh": "她在问我的名字",
     "en": "she is asking my name"
    },
    {
     "id": "bye",
     "zh": "她在告别",
     "en": "she is saying goodbye"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je m'appelle Camille"
   ]
  }
 },
 {
  "id": "tu_tappelles_comment",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "camille",
  "fr": "Tu t'appelles comment ?",
  "zh": "你叫什么名字？",
  "en": "What's your name?",
  "noteZh": "t' 是 te 的省略。这是在问你，不是在介绍自己。",
  "noteEn": "t' is te. This asks YOU, it does not introduce the speaker.",
  "listen": {
   "answer": "ask",
   "options": [
    {
     "id": "ask",
     "zh": "在问你的名字",
     "en": "asking your name"
    },
    {
     "id": "tell",
     "zh": "在说自己的名字",
     "en": "saying their own name"
    },
    {
     "id": "thx",
     "zh": "在道谢",
     "en": "saying thanks"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu t'appelles comment",
    "Tu t'appelles comment ?"
   ]
  }
 },
 {
  "id": "moi_cest",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "noe",
  "fr": "Moi, c'est Noé.",
  "zh": "我嘛，我是 Noé。",
  "en": "I'm Noé. (casual)",
  "noteZh": "比 Je m'appelle 更随便。c'est 要省音。",
  "noteEn": "More casual than Je m'appelle. c'est elides.",
  "listen": {
   "answer": "tell",
   "options": [
    {
     "id": "tell",
     "zh": "另一种自我介绍",
     "en": "another way to introduce yourself"
    },
    {
     "id": "ask",
     "zh": "在问名字",
     "en": "asking a name"
    },
    {
     "id": "where",
     "zh": "在问地点",
     "en": "asking where"
    }
   ]
  },
  "produce": {
   "accept": [
    "Moi, c'est Noé"
   ]
  }
 },
 {
  "id": "enchante",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "camille",
  "fr": "Enchanté !",
  "zh": "很高兴认识你！（说这句话的人是男性时用 Enchanté）",
  "en": "Nice to meet you! (Enchanté if the speaker is male)",
  "noteZh": "说话的人是女性时用 Enchantée。这里 Camille 的句子按故事里她的用法，先记住意思。",
  "noteEn": "A woman says Enchantée. Learn the meaning first; the ending follows the speaker.",
  "listen": {
   "answer": "meet",
   "options": [
    {
     "id": "meet",
     "zh": "很高兴认识你",
     "en": "nice to meet you"
    },
    {
     "id": "bye",
     "zh": "再见",
     "en": "goodbye"
    },
    {
     "id": "drink",
     "zh": "想喝咖啡",
     "en": "wants coffee"
    }
   ]
  },
  "produce": {
   "accept": [
    "Enchanté",
    "Enchantée",
    "Enchanté !",
    "Enchantée !"
   ]
  }
 },
 {
  "id": "du_the",
  "grammar": "drinks",
  "band": "A1",
  "speaker": "noe",
  "fr": "Tu veux du thé ?",
  "zh": "你要茶吗？",
  "en": "Do you want some tea?",
  "noteZh": "du 是 de + le，用在不可数的茶前面。",
  "noteEn": "du is de + le, used before uncountable thé.",
  "listen": {
   "answer": "tea",
   "options": [
    {
     "id": "tea",
     "zh": "茶",
     "en": "tea"
    },
    {
     "id": "coffee",
     "zh": "咖啡",
     "en": "coffee"
    },
    {
     "id": "water",
     "zh": "水",
     "en": "water"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu veux du thé",
    "Tu veux du thé ?"
   ]
  }
 },
 {
  "id": "du_cafe",
  "grammar": "drinks",
  "band": "A1",
  "speaker": "camille",
  "fr": "Tu veux du café ?",
  "zh": "你要咖啡吗？",
  "en": "Do you want some coffee?",
  "noteZh": "café 既是咖啡也是咖啡馆。这里和 thé 一起出现，是饮料。",
  "noteEn": "Café can also mean a café. Next to thé, it is the drink.",
  "listen": {
   "answer": "coffee",
   "options": [
    {
     "id": "coffee",
     "zh": "咖啡",
     "en": "coffee"
    },
    {
     "id": "tea",
     "zh": "茶",
     "en": "tea"
    },
    {
     "id": "milk",
     "zh": "牛奶",
     "en": "milk"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu veux du café",
    "Tu veux du café ?"
   ]
  }
 },
 {
  "id": "the_ou_cafe",
  "grammar": "drinks",
  "band": "A1",
  "speaker": "noe",
  "fr": "Tu veux du thé ou du café ?",
  "zh": "你要茶还是咖啡？",
  "en": "Do you want tea or coffee?",
  "noteZh": "ou 是“还是”。两个都是 du。",
  "noteEn": "ou means or. Both drinks take du.",
  "listen": {
   "answer": "choice",
   "options": [
    {
     "id": "choice",
     "zh": "在问你要茶还是咖啡",
     "en": "asking tea or coffee"
    },
    {
     "id": "where",
     "zh": "在问东西在哪",
     "en": "asking where something is"
    },
    {
     "id": "name",
     "zh": "在问名字",
     "en": "asking your name"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu veux du thé ou du café",
    "Tu veux du thé ou du café ?"
   ]
  }
 },
 {
  "id": "je_voudrais_the",
  "grammar": "drinks",
  "band": "A1",
  "speaker": "camille",
  "fr": "Je voudrais du thé.",
  "zh": "我想要茶。",
  "en": "I would like some tea.",
  "noteZh": "voudrais 比 je veux 更客气，点东西时用这个。",
  "noteEn": "voudrais is more polite than je veux. Use it to order.",
  "listen": {
   "answer": "want_tea",
   "options": [
    {
     "id": "want_tea",
     "zh": "我想要茶",
     "en": "I would like tea"
    },
    {
     "id": "want_coffee",
     "zh": "我想要咖啡",
     "en": "I would like coffee"
    },
    {
     "id": "no",
     "zh": "我不要",
     "en": "I don't want any"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je voudrais du thé"
   ]
  }
 },
 {
  "id": "je_voudrais_cafe",
  "grammar": "drinks",
  "band": "A1",
  "speaker": "noe",
  "fr": "Je voudrais du café.",
  "zh": "我想要咖啡。",
  "en": "I would like some coffee.",
  "noteZh": "和茶是同一句型，只换饮料。",
  "noteEn": "Same pattern as tea. Only the drink changes.",
  "listen": {
   "answer": "want_coffee",
   "options": [
    {
     "id": "want_coffee",
     "zh": "我想要咖啡",
     "en": "I would like coffee"
    },
    {
     "id": "want_tea",
     "zh": "我想要茶",
     "en": "I would like tea"
    },
    {
     "id": "thanks",
     "zh": "谢谢",
     "en": "thanks"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je voudrais du café"
   ]
  }
 },
 {
  "id": "merci",
  "grammar": "politeness",
  "band": "A1",
  "speaker": "camille",
  "fr": "Merci !",
  "zh": "谢谢！",
  "en": "Thanks!",
  "noteZh": "收到饮料、帮助时先说这个。",
  "noteEn": "Say this when you get a drink or help.",
  "listen": {
   "answer": "thanks",
   "options": [
    {
     "id": "thanks",
     "zh": "谢谢",
     "en": "thanks"
    },
    {
     "id": "please",
     "zh": "请",
     "en": "please"
    },
    {
     "id": "sorry",
     "zh": "对不起",
     "en": "sorry"
    }
   ]
  },
  "produce": {
   "accept": [
    "Merci",
    "Merci !"
   ]
  }
 },
 {
  "id": "de_rien",
  "grammar": "politeness",
  "band": "A1",
  "speaker": "noe",
  "fr": "De rien.",
  "zh": "不客气。",
  "en": "You're welcome.",
  "noteZh": "别人说 Merci 时可以这样回。",
  "noteEn": "A reply to Merci.",
  "listen": {
   "answer": "welcome",
   "options": [
    {
     "id": "welcome",
     "zh": "不客气",
     "en": "you're welcome"
    },
    {
     "id": "thanks",
     "zh": "谢谢",
     "en": "thanks"
    },
    {
     "id": "please",
     "zh": "请",
     "en": "please"
    }
   ]
  },
  "produce": {
   "accept": [
    "De rien"
   ]
  }
 },
 {
  "id": "s_il_vous_plait",
  "grammar": "politeness",
  "band": "A1",
  "speaker": "neutral",
  "fr": "S'il vous plaît.",
  "zh": "请问 / 劳驾。（对不太熟的人）",
  "en": "Please. (to someone you don't know well)",
  "noteZh": "vous 是礼貌的“您”。对朋友用 s'il te plaît。",
  "noteEn": "vous is the polite you. With friends: s'il te plaît.",
  "listen": {
   "answer": "please",
   "options": [
    {
     "id": "please",
     "zh": "请",
     "en": "please"
    },
    {
     "id": "thanks",
     "zh": "谢谢",
     "en": "thanks"
    },
    {
     "id": "sorry",
     "zh": "对不起",
     "en": "sorry"
    }
   ]
  },
  "produce": {
   "accept": [
    "S'il vous plaît",
    "S'il te plaît"
   ]
  }
 },
 {
  "id": "pardon",
  "grammar": "clarification",
  "band": "A1",
  "speaker": "camille",
  "fr": "Pardon.",
  "zh": "对不起。 / 不好意思。",
  "en": "Sorry. / Excuse me.",
  "noteZh": "撞到人、打断别人、或没听清都可以说。",
  "noteEn": "For bumping into someone, interrupting, or not hearing.",
  "listen": {
   "answer": "sorry",
   "options": [
    {
     "id": "sorry",
     "zh": "对不起",
     "en": "sorry"
    },
    {
     "id": "thanks",
     "zh": "谢谢",
     "en": "thanks"
    },
    {
     "id": "repeat",
     "zh": "请再说一遍",
     "en": "please repeat"
    }
   ]
  },
  "produce": {
   "accept": [
    "Pardon",
    "Pardon."
   ]
  }
 },
 {
  "id": "tu_peux_repeter",
  "grammar": "clarification",
  "band": "A1",
  "speaker": "noe",
  "fr": "Tu peux répéter ?",
  "zh": "你能再说一遍吗？",
  "en": "Can you say that again?",
  "noteZh": "没听清就问，这是正常的沟通，不是出错。",
  "noteEn": "Asking to repeat is normal. It is not a mistake.",
  "listen": {
   "answer": "repeat",
   "options": [
    {
     "id": "repeat",
     "zh": "请你再说一遍",
     "en": "please say that again"
    },
    {
     "id": "sorry",
     "zh": "道歉",
     "en": "an apology"
    },
    {
     "id": "where",
     "zh": "东西在哪",
     "en": "where something is"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu peux répéter",
    "Tu peux répéter ?"
   ]
  }
 },
 {
  "id": "vous_pouvez_repeter",
  "grammar": "clarification",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Vous pouvez répéter, s'il vous plaît ?",
  "zh": "请您再说一遍好吗？",
  "en": "Could you repeat that, please?",
  "noteZh": "对邻居、房东用 vous。意思和 Tu peux répéter 一样，只是更礼貌。",
  "noteEn": "Use vous with a neighbour or the landlady. Same meaning, more polite.",
  "listen": {
   "answer": "repeat_polite",
   "options": [
    {
     "id": "repeat_polite",
     "zh": "请您再说一遍",
     "en": "could you repeat, politely"
    },
    {
     "id": "repeat_tu",
     "zh": "你再说一遍（对朋友）",
     "en": "repeat, to a friend"
    },
    {
     "id": "sorry",
     "zh": "对不起",
     "en": "sorry"
    }
   ]
  },
  "produce": {
   "accept": [
    "Vous pouvez répéter, s'il vous plaît",
    "Vous pouvez répéter, s'il vous plaît ?"
   ]
  }
 },
 {
  "id": "il_y_a_du_bruit",
  "grammar": "clarification",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Il y a du bruit.",
  "zh": "有噪音。",
  "en": "There is noise.",
  "noteZh": "邻居来抱怨时会听到。il y a = 有。",
  "noteEn": "What an annoyed neighbour says. il y a = there is.",
  "listen": {
   "answer": "noise",
   "options": [
    {
     "id": "noise",
     "zh": "有噪音",
     "en": "there is noise"
    },
    {
     "id": "quiet",
     "zh": "很安静",
     "en": "it is quiet"
    },
    {
     "id": "music",
     "zh": "在放音乐这个词本身",
     "en": "the word for music"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il y a du bruit"
   ]
  }
 },
 {
  "id": "sur_la_table",
  "grammar": "location",
  "band": "A1",
  "speaker": "camille",
  "fr": "Le colis est sur la table.",
  "zh": "包裹在桌子上面。",
  "en": "The parcel is on the table.",
  "noteZh": "先认识 le colis 和 la table，sur 是“在……上面”。",
  "noteEn": "Learn le colis and la table first. sur = on top of.",
  "listen": {
   "answer": "on",
   "options": [
    {
     "id": "on",
     "zh": "在桌子上面",
     "en": "on the table"
    },
    {
     "id": "under",
     "zh": "在桌子下面",
     "en": "under the table"
    },
    {
     "id": "in",
     "zh": "在桌子里面",
     "en": "inside the table"
    }
   ]
  },
  "produce": {
   "accept": [
    "Le colis est sur la table",
    "Sur la table"
   ]
  }
 },
 {
  "id": "sous_la_table",
  "grammar": "location",
  "band": "A1",
  "speaker": "noe",
  "fr": "Le colis est sous la table.",
  "zh": "包裹在桌子下面。",
  "en": "The parcel is under the table.",
  "noteZh": "和上一句只换了 sur → sous。",
  "noteEn": "Only sur changes to sous.",
  "listen": {
   "answer": "under",
   "options": [
    {
     "id": "under",
     "zh": "在桌子下面",
     "en": "under the table"
    },
    {
     "id": "on",
     "zh": "在桌子上面",
     "en": "on the table"
    },
    {
     "id": "near",
     "zh": "在桌子旁边",
     "en": "next to the table"
    }
   ]
  },
  "produce": {
   "accept": [
    "Le colis est sous la table",
    "Sous la table"
   ]
  }
 },
 {
  "id": "ou_est_colis",
  "grammar": "location",
  "band": "A1",
  "speaker": "camille",
  "fr": "Où est le colis ?",
  "zh": "包裹在哪里？",
  "en": "Where is the parcel?",
  "noteZh": "où 是哪里。后面先是 est，再是东西。",
  "noteEn": "où = where. Then est, then the thing.",
  "listen": {
   "answer": "where",
   "options": [
    {
     "id": "where",
     "zh": "包裹在哪里",
     "en": "where is the parcel"
    },
    {
     "id": "who",
     "zh": "包裹是谁的",
     "en": "whose parcel"
    },
    {
     "id": "when",
     "zh": "什么时候到",
     "en": "when it arrives"
    }
   ]
  },
  "produce": {
   "accept": [
    "Où est le colis",
    "Où est le colis ?"
   ]
  }
 },
 {
  "id": "ou_sont_cles",
  "grammar": "location",
  "band": "A1",
  "speaker": "noe",
  "fr": "Où sont les clés ?",
  "zh": "钥匙在哪里？",
  "en": "Where are the keys?",
  "noteZh": "clés 是复数，所以用 sont，不是 est。",
  "noteEn": "clés is plural, so sont, not est.",
  "listen": {
   "answer": "keys_where",
   "options": [
    {
     "id": "keys_where",
     "zh": "钥匙在哪里",
     "en": "where are the keys"
    },
    {
     "id": "keys_lost",
     "zh": "我把钥匙丢了（已经发生）",
     "en": "I lost the keys"
    },
    {
     "id": "box_where",
     "zh": "包裹在哪里",
     "en": "where is the parcel"
    }
   ]
  },
  "produce": {
   "accept": [
    "Où sont les clés",
    "Où sont les clés ?"
   ]
  }
 },
 {
  "id": "je_cherche_cles",
  "grammar": "search",
  "band": "A1",
  "speaker": "noe",
  "fr": "Je cherche mes clés.",
  "zh": "我在找我的钥匙。",
  "en": "I'm looking for my keys.",
  "noteZh": "cherche 是现在在找。mes 因为 clés 是复数。",
  "noteEn": "cherche = looking now. mes because clés is plural.",
  "listen": {
   "answer": "search",
   "options": [
    {
     "id": "search",
     "zh": "我在找我的钥匙",
     "en": "I'm looking for my keys"
    },
    {
     "id": "found",
     "zh": "我找到钥匙了",
     "en": "I found my keys"
    },
    {
     "id": "lost",
     "zh": "我丢了钥匙（故事里先当气氛句）",
     "en": "I lost my keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je cherche mes clés"
   ]
  }
 },
 {
  "id": "je_cherche_colis",
  "grammar": "search",
  "band": "A1",
  "speaker": "camille",
  "fr": "Je cherche le colis.",
  "zh": "我在找包裹。",
  "en": "I'm looking for the parcel.",
  "noteZh": "同一句型 Je cherche…，换成另一个已经认识的东西。",
  "noteEn": "Same Je cherche…, with another known object.",
  "listen": {
   "answer": "search_box",
   "options": [
    {
     "id": "search_box",
     "zh": "我在找包裹",
     "en": "I'm looking for the parcel"
    },
    {
     "id": "search_keys",
     "zh": "我在找钥匙",
     "en": "I'm looking for the keys"
    },
    {
     "id": "where",
     "zh": "它在桌子上",
     "en": "it is on the table"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je cherche le colis"
   ]
  }
 },
 {
  "id": "je_cherche_chat",
  "grammar": "search",
  "band": "A1",
  "speaker": "noe",
  "fr": "Je cherche mon chat.",
  "zh": "我在找我的猫。",
  "en": "I'm looking for my cat.",
  "noteZh": "mon chat：chat 是阳性。故事里就是 Croissant。",
  "noteEn": "mon chat: chat is masculine. In the story, that is Croissant.",
  "listen": {
   "answer": "cat",
   "options": [
    {
     "id": "cat",
     "zh": "我在找我的猫",
     "en": "I'm looking for my cat"
    },
    {
     "id": "dog",
     "zh": "我在找我的狗",
     "en": "I'm looking for my dog"
    },
    {
     "id": "keys",
     "zh": "我在找钥匙",
     "en": "I'm looking for keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je cherche mon chat"
   ]
  }
 },
 {
  "id": "je_ne_sais_pas",
  "grammar": "search",
  "band": "A1",
  "speaker": "camille",
  "fr": "Je ne sais pas.",
  "zh": "我不知道。",
  "en": "I don't know.",
  "noteZh": "ne … pas 框住动词。不知道就这样说，可以继续问。",
  "noteEn": "ne … pas wraps the verb. Fine to say this and keep asking.",
  "listen": {
   "answer": "dunno",
   "options": [
    {
     "id": "dunno",
     "zh": "我不知道",
     "en": "I don't know"
    },
    {
     "id": "know",
     "zh": "我知道",
     "en": "I know"
    },
    {
     "id": "search",
     "zh": "我正在找",
     "en": "I'm looking"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je ne sais pas"
   ]
  }
 },
 {
  "id": "a_gauche",
  "grammar": "directions",
  "band": "A1",
  "speaker": "neutral",
  "fr": "À gauche.",
  "zh": "左边。",
  "en": "On the left. / Left.",
  "noteZh": "à 有重音。找猫时路人会这样说。",
  "noteEn": "à is accented. A passer-by may say this.",
  "listen": {
   "answer": "left",
   "options": [
    {
     "id": "left",
     "zh": "左边",
     "en": "left"
    },
    {
     "id": "right",
     "zh": "右边",
     "en": "right"
    },
    {
     "id": "straight",
     "zh": "直走",
     "en": "straight ahead"
    }
   ]
  },
  "produce": {
   "accept": [
    "À gauche",
    "A gauche"
   ]
  }
 },
 {
  "id": "a_droite",
  "grammar": "directions",
  "band": "A1",
  "speaker": "neutral",
  "fr": "À droite.",
  "zh": "右边。",
  "en": "On the right. / Right.",
  "noteZh": "和 à gauche 成对记。",
  "noteEn": "Learn it as the pair of à gauche.",
  "listen": {
   "answer": "right",
   "options": [
    {
     "id": "right",
     "zh": "右边",
     "en": "right"
    },
    {
     "id": "left",
     "zh": "左边",
     "en": "left"
    },
    {
     "id": "back",
     "zh": "回头",
     "en": "go back"
    }
   ]
  },
  "produce": {
   "accept": [
    "À droite",
    "A droite"
   ]
  }
 },
 {
  "id": "tout_droit",
  "grammar": "directions",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Tout droit.",
  "zh": "直走。",
  "en": "Straight ahead.",
  "noteZh": "droit 这里是方向，不是“权利”。",
  "noteEn": "Here droit means straight, not 'a right' (legal).",
  "listen": {
   "answer": "straight",
   "options": [
    {
     "id": "straight",
     "zh": "直走",
     "en": "straight ahead"
    },
    {
     "id": "left",
     "zh": "左转",
     "en": "turn left"
    },
    {
     "id": "stop",
     "zh": "停下",
     "en": "stop"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tout droit"
   ]
  }
 },
 {
  "id": "ici",
  "grammar": "directions",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Le chat est ici.",
  "zh": "猫在这里。",
  "en": "The cat is here.",
  "noteZh": "ici = 这里。房东问 Il y a un chat ici ? 时，ici 是同一个词。",
  "noteEn": "ici = here. The same word is in Il y a un chat ici?",
  "listen": {
   "answer": "here",
   "options": [
    {
     "id": "here",
     "zh": "在这里",
     "en": "here"
    },
    {
     "id": "there",
     "zh": "在那里",
     "en": "there"
    },
    {
     "id": "home",
     "zh": "在家",
     "en": "at home"
    }
   ]
  },
  "produce": {
   "accept": [
    "Le chat est ici",
    "Ici"
   ]
  }
 },
 {
  "id": "il_y_a_un_chat",
  "grammar": "search",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Il y a un chat ici ?",
  "zh": "这里有一只猫吗？",
  "en": "Is there a cat here?",
  "noteZh": "un 因为 chat 是阳性单数。",
  "noteEn": "un because chat is masculine singular.",
  "listen": {
   "answer": "there_is",
   "options": [
    {
     "id": "there_is",
     "zh": "这里有一只猫吗",
     "en": "is there a cat here"
    },
    {
     "id": "where",
     "zh": "猫在哪里",
     "en": "where is the cat"
    },
    {
     "id": "name",
     "zh": "猫叫什么",
     "en": "what is the cat's name"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il y a un chat ici",
    "Il y a un chat ici ?"
   ]
  }
 },
 {
  "id": "cest_ta_plante",
  "grammar": "location",
  "band": "A1",
  "speaker": "camille",
  "fr": "C'est ta plante.",
  "zh": "这是你的植物。",
  "en": "This is your plant.",
  "noteZh": "ta 因为 plante 是阴性。故事第一天 Camille 的句子。",
  "noteEn": "ta because plante is feminine. Camille's Day 1 line.",
  "listen": {
   "answer": "plant",
   "options": [
    {
     "id": "plant",
     "zh": "这是你的植物",
     "en": "this is your plant"
    },
    {
     "id": "thirsty",
     "zh": "植物渴了",
     "en": "the plant is thirsty"
    },
    {
     "id": "water",
     "zh": "我去浇水",
     "en": "I'll water it"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est ta plante"
   ]
  }
 },
 {
  "id": "plante_soif",
  "grammar": "location",
  "band": "A1",
  "speaker": "camille",
  "fr": "Ta plante a soif.",
  "zh": "你的植物渴了。",
  "en": "Your plant is thirsty.",
  "noteZh": "a soif 是“渴”。浇水不是考试，只是听懂就好。",
  "noteEn": "a soif = is thirsty. Watering is not a test.",
  "listen": {
   "answer": "thirsty",
   "options": [
    {
     "id": "thirsty",
     "zh": "你的植物渴了",
     "en": "your plant is thirsty"
    },
    {
     "id": "hungry",
     "zh": "你饿了",
     "en": "you are hungry"
    },
    {
     "id": "mine",
     "zh": "这是我的植物",
     "en": "this is my plant"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ta plante a soif"
   ]
  }
 },
 {
  "id": "ne_veux_pas",
  "grammar": "negation",
  "band": "A1",
  "speaker": "noe",
  "fr": "Je ne veux pas de café.",
  "zh": "我不要咖啡。",
  "en": "I don't want coffee.",
  "noteZh": "否定饮料时，du 常常变成 de：pas de café。",
  "noteEn": "In the negative, du often becomes de: pas de café.",
  "listen": {
   "answer": "not",
   "options": [
    {
     "id": "not",
     "zh": "我不要咖啡",
     "en": "I don't want coffee"
    },
    {
     "id": "want",
     "zh": "我要咖啡",
     "en": "I want coffee"
    },
    {
     "id": "tea",
     "zh": "我要茶",
     "en": "I want tea"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je ne veux pas de café"
   ]
  }
 },
 {
  "id": "je_suis",
  "grammar": "present",
  "band": "A1",
  "speaker": "camille",
  "fr": "Je suis ta colocataire.",
  "zh": "我是你的室友。（说话人是女性）",
  "en": "I'm your roommate. (the speaker is a woman)",
  "noteZh": "suis 是 être 的 je。colocataire 男女同形，女性说话时意思不变。",
  "noteEn": "suis is être for je.",
  "listen": {
   "answer": "am",
   "options": [
    {
     "id": "am",
     "zh": "我是室友",
     "en": "I am the roommate"
    },
    {
     "id": "have",
     "zh": "我有室友",
     "en": "I have a roommate"
    },
    {
     "id": "go",
     "zh": "我去公寓",
     "en": "I go to the apartment"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je suis ta colocataire",
    "Je suis ton colocataire"
   ]
  }
 },
 {
  "id": "jai_une_cle",
  "grammar": "present",
  "band": "A1",
  "speaker": "noe",
  "fr": "J'ai une clé.",
  "zh": "我有一把钥匙。",
  "en": "I have a key.",
  "noteZh": "j'ai = je ai 省音。une 因为 clé 是阴性。",
  "noteEn": "j'ai elides je ai. une because clé is feminine.",
  "listen": {
   "answer": "have",
   "options": [
    {
     "id": "have",
     "zh": "我有一把钥匙",
     "en": "I have a key"
    },
    {
     "id": "am",
     "zh": "我是一把钥匙",
     "en": "I am a key"
    },
    {
     "id": "search",
     "zh": "我在找钥匙",
     "en": "I'm looking for a key"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai une clé"
   ]
  }
 },
 {
  "id": "jai_froid",
  "grammar": "present",
  "band": "A1",
  "speaker": "camille",
  "fr": "J'ai froid.",
  "zh": "我冷。（蒙特利尔冬天很有用）",
  "en": "I'm cold. (useful in a Montreal winter)",
  "noteZh": "法语用 avoir，不是 être：j'ai froid / j'ai chaud / j'ai faim。",
  "noteEn": "French uses avoir: j'ai froid / chaud / faim.",
  "listen": {
   "answer": "cold",
   "options": [
    {
     "id": "cold",
     "zh": "我冷",
     "en": "I'm cold"
    },
    {
     "id": "hot",
     "zh": "我热",
     "en": "I'm hot"
    },
    {
     "id": "hungry",
     "zh": "我饿",
     "en": "I'm hungry"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai froid"
   ]
  }
 },
 {
  "id": "jai_faim",
  "grammar": "present",
  "band": "A1",
  "speaker": "noe",
  "fr": "J'ai faim.",
  "zh": "我饿了。",
  "en": "I'm hungry.",
  "noteZh": "和 j'ai froid 同一个 avoir 块。",
  "noteEn": "Same avoir chunk as j'ai froid.",
  "listen": {
   "answer": "hungry",
   "options": [
    {
     "id": "hungry",
     "zh": "我饿了",
     "en": "I'm hungry"
    },
    {
     "id": "thirsty",
     "zh": "我渴了",
     "en": "I'm thirsty"
    },
    {
     "id": "tired",
     "zh": "我累了",
     "en": "I'm tired"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai faim"
   ]
  }
 },
 {
  "id": "tu_habites",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "neutral",
  "fr": "Tu habites où ?",
  "zh": "你住在哪里？",
  "en": "Where do you live?",
  "noteZh": "在蒙特利尔可以回答 J'habite à Montréal。",
  "noteEn": "In Montreal you can answer J'habite à Montréal.",
  "listen": {
   "answer": "where_live",
   "options": [
    {
     "id": "where_live",
     "zh": "你住在哪里",
     "en": "where do you live"
    },
    {
     "id": "name",
     "zh": "你叫什么",
     "en": "what's your name"
    },
    {
     "id": "work",
     "zh": "你做什么工作",
     "en": "what do you do"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu habites où",
    "Tu habites où ?"
   ]
  }
 },
 {
  "id": "jhabite_montreal",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "camille",
  "fr": "J'habite à Montréal.",
  "zh": "我住在蒙特利尔。",
  "en": "I live in Montreal.",
  "noteZh": "城市前面用 à。Montréal 的 é。",
  "noteEn": "à before a city.",
  "listen": {
   "answer": "live",
   "options": [
    {
     "id": "live",
     "zh": "我住在蒙特利尔",
     "en": "I live in Montreal"
    },
    {
     "id": "go",
     "zh": "我去蒙特利尔",
     "en": "I'm going to Montreal"
    },
    {
     "id": "from",
     "zh": "我来自巴黎",
     "en": "I'm from Paris"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'habite à Montréal",
    "J'habite a Montréal"
   ]
  }
 },
 {
  "id": "cest_un_appartement",
  "grammar": "introductions",
  "band": "A1",
  "speaker": "noe",
  "fr": "C'est un appartement.",
  "zh": "这是一套公寓。",
  "en": "This is an apartment.",
  "noteZh": "appartement 是阳性：un。411 就是这套。",
  "noteEn": "appartement is masculine: un.",
  "listen": {
   "answer": "this",
   "options": [
    {
     "id": "this",
     "zh": "这是一间公寓",
     "en": "this is an apartment"
    },
    {
     "id": "house",
     "zh": "这是一栋房子",
     "en": "this is a house"
    },
    {
     "id": "cafe",
     "zh": "这是一家咖啡馆",
     "en": "this is a café"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est un appartement"
   ]
  }
 },
 {
  "id": "futur_proche_vais",
  "grammar": "futur-proche",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je vais sortir.",
  "zh": "我这就出门。",
  "en": "I'm going to go out.",
  "noteZh": "aller + 动词原形 = 即将。vais 是 aller 的 je。",
  "noteEn": "aller + infinitive = near future. vais is aller for je.",
  "listen": {
   "answer": "go_soon",
   "options": [
    {
     "id": "go_soon",
     "zh": "我马上出门",
     "en": "I'm about to go out"
    },
    {
     "id": "went",
     "zh": "我出门了",
     "en": "I went out"
    },
    {
     "id": "want",
     "zh": "我想出门（愿望）",
     "en": "I want to go out"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je vais sortir"
   ]
  }
 },
 {
  "id": "on_va_prendre",
  "grammar": "futur-proche",
  "band": "A2",
  "speaker": "noe",
  "fr": "On va prendre un café.",
  "zh": "我们这就去喝杯咖啡。",
  "en": "We're going to grab a coffee.",
  "noteZh": "on va 在口语里常常等于 nous allons。",
  "noteEn": "Spoken on va often stands in for nous allons.",
  "listen": {
   "answer": "we_soon",
   "options": [
    {
     "id": "we_soon",
     "zh": "我们马上喝咖啡",
     "en": "we're about to have coffee"
    },
    {
     "id": "we_want",
     "zh": "我们想要咖啡",
     "en": "we want coffee"
    },
    {
     "id": "we_drank",
     "zh": "我们喝过咖啡了",
     "en": "we drank coffee"
    }
   ]
  },
  "produce": {
   "accept": [
    "On va prendre un café"
   ]
  }
 },
 {
  "id": "elle_va_rentrer",
  "grammar": "futur-proche",
  "band": "A2",
  "speaker": "noe",
  "fr": "Camille va rentrer.",
  "zh": "Camille 一会儿就回来。",
  "en": "Camille is going to come back.",
  "noteZh": "va 是 aller 的 elle。rentrer = 回到家里。",
  "noteEn": "va is aller for elle. rentrer = come back home.",
  "listen": {
   "answer": "she_soon",
   "options": [
    {
     "id": "she_soon",
     "zh": "她一会儿回来",
     "en": "she's going to come back"
    },
    {
     "id": "she_back",
     "zh": "她回来了",
     "en": "she came back"
    },
    {
     "id": "she_here",
     "zh": "她在这里",
     "en": "she is here"
    }
   ]
  },
  "produce": {
   "accept": [
    "Camille va rentrer"
   ]
  }
 },
 {
  "id": "jai_trouve",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "noe",
  "fr": "J'ai trouvé mes clés.",
  "zh": "我找到钥匙了。",
  "en": "I found my keys.",
  "noteZh": "avoir + 过去分词。trouver 的过去分词是 trouvé。",
  "noteEn": "avoir + past participle. trouvé.",
  "listen": {
   "answer": "pc",
   "options": [
    {
     "id": "pc",
     "zh": "我找到钥匙了（完成）",
     "en": "I found the keys (done)"
    },
    {
     "id": "imp",
     "zh": "我当时在找钥匙",
     "en": "I was looking for the keys"
    },
    {
     "id": "fut",
     "zh": "我会找到钥匙",
     "en": "I will find the keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai trouvé mes clés"
   ]
  }
 },
 {
  "id": "elle_est_partie",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "camille",
  "fr": "Elle est partie.",
  "zh": "她走了。",
  "en": "She left.",
  "noteZh": "partir 用 être。elle 所以 partie 加 e。",
  "noteEn": "partir takes être. partie agrees with elle.",
  "listen": {
   "answer": "pc_she",
   "options": [
    {
     "id": "pc_she",
     "zh": "她已经出门了",
     "en": "she has left"
    },
    {
     "id": "imp",
     "zh": "她当时在出门",
     "en": "she was leaving"
    },
    {
     "id": "pres",
     "zh": "她正在出门",
     "en": "she is leaving"
    }
   ]
  },
  "produce": {
   "accept": [
    "Elle est partie"
   ]
  }
 },
 {
  "id": "nous_sommes_alles",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "noe",
  "fr": "Nous sommes allés au café.",
  "zh": "我们去了咖啡馆。",
  "en": "We went to the café.",
  "noteZh": "aller 用 être。nous 里如果有男性，allés。au = à + le。",
  "noteEn": "aller takes être. allés for a mixed/male nous. au = à + le.",
  "listen": {
   "answer": "pc_go",
   "options": [
    {
     "id": "pc_go",
     "zh": "我们去了咖啡馆",
     "en": "we went to the café"
    },
    {
     "id": "imp",
     "zh": "我们那时常去咖啡馆",
     "en": "we used to go to the café"
    },
    {
     "id": "fut",
     "zh": "我们要去咖啡馆",
     "en": "we're going to the café"
    }
   ]
  },
  "produce": {
   "accept": [
    "Nous sommes allés au café",
    "Nous sommes allées au café"
   ]
  }
 },
 {
  "id": "jai_achete",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "camille",
  "fr": "J'ai acheté du pain.",
  "zh": "我买了面包。",
  "en": "I bought some bread.",
  "noteZh": "acheter → acheté。du pain 不可数。",
  "noteEn": "acheter → acheté.",
  "listen": {
   "answer": "buy",
   "options": [
    {
     "id": "buy",
     "zh": "我买了面包",
     "en": "I bought bread"
    },
    {
     "id": "eat",
     "zh": "我吃了面包",
     "en": "I ate bread"
    },
    {
     "id": "want",
     "zh": "我想要面包",
     "en": "I want bread"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai acheté du pain"
   ]
  }
 },
 {
  "id": "jai_fait",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "noe",
  "fr": "J'ai fait du café.",
  "zh": "我煮了咖啡。",
  "en": "I made coffee.",
  "noteZh": "faire 的过去分词是 fait，不是 fé。",
  "noteEn": "faire → fait, not fé.",
  "listen": {
   "answer": "irreg",
   "options": [
    {
     "id": "irreg",
     "zh": "我做了咖啡（不规则过去分词）",
     "en": "I made coffee (irregular participle)"
    },
    {
     "id": "reg",
     "zh": "规则的 -é",
     "en": "a regular -é participle"
    },
    {
     "id": "inf",
     "zh": "正在做",
     "en": "making now"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai fait du café"
   ]
  }
 },
 {
  "id": "jai_vu",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "camille",
  "fr": "J'ai vu le chat.",
  "zh": "我看见猫了。",
  "en": "I saw the cat.",
  "noteZh": "voir → vu。没有和 le chat 性数配合（没有前置 COD）。",
  "noteEn": "voir → vu. No agreement here: the object comes after.",
  "listen": {
   "answer": "seen",
   "options": [
    {
     "id": "seen",
     "zh": "我看见猫了",
     "en": "I saw the cat"
    },
    {
     "id": "look",
     "zh": "我在看猫",
     "en": "I'm looking at the cat"
    },
    {
     "id": "search",
     "zh": "我在找猫",
     "en": "I'm looking for the cat"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai vu le chat"
   ]
  }
 },
 {
  "id": "il_pleuvait",
  "grammar": "imparfait",
  "band": "A2",
  "speaker": "neutral",
  "fr": "Il pleuvait.",
  "zh": "那时在下雨。",
  "en": "It was raining.",
  "noteZh": "imparfait 常用来做背景：天气、习惯、当时正在。",
  "noteEn": "Imparfait for background: weather, habits, what was ongoing.",
  "listen": {
   "answer": "bg",
   "options": [
    {
     "id": "bg",
     "zh": "那时在下雨（背景）",
     "en": "it was raining (background)"
    },
    {
     "id": "event",
     "zh": "下过一场雨（事件）",
     "en": "it rained (event)"
    },
    {
     "id": "fut",
     "zh": "要下雨",
     "en": "it's going to rain"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il pleuvait"
   ]
  }
 },
 {
  "id": "je_buvais",
  "grammar": "imparfait",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je buvais du café tous les matins.",
  "zh": "我以前每天早上都喝咖啡。",
  "en": "I used to drink coffee every morning.",
  "noteZh": "tous les matins 这种重复，用 imparfait。boire → buvais。",
  "noteEn": "Repeated tous les matins → imparfait. boire → buvais.",
  "listen": {
   "answer": "habit",
   "options": [
    {
     "id": "habit",
     "zh": "以前我每早喝咖啡",
     "en": "I used to drink coffee every morning"
    },
    {
     "id": "once",
     "zh": "今天早上我喝了咖啡",
     "en": "this morning I drank coffee"
    },
    {
     "id": "fut",
     "zh": "我明天喝咖啡",
     "en": "I'll drink coffee tomorrow"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je buvais du café tous les matins"
   ]
  }
 },
 {
  "id": "elle_lisait",
  "grammar": "imparfait",
  "band": "A2",
  "speaker": "camille",
  "fr": "Quand je suis arrivé, elle lisait.",
  "zh": "我到的时候，她正在看书。",
  "en": "When I arrived, she was reading.",
  "noteZh": "到达是一次性事件（passé composé），看书是当时正在（imparfait）。",
  "noteEn": "Arrival is one event (passé composé). Reading was ongoing (imparfait).",
  "listen": {
   "answer": "ongoing",
   "options": [
    {
     "id": "ongoing",
     "zh": "我到的时候她在看书",
     "en": "she was reading when I arrived"
    },
    {
     "id": "done",
     "zh": "她看完了书",
     "en": "she finished the book"
    },
    {
     "id": "fut",
     "zh": "她要看书",
     "en": "she's going to read"
    }
   ]
  },
  "produce": {
   "accept": [
    "Quand je suis arrivé, elle lisait",
    "Quand je suis arrivée, elle lisait"
   ]
  }
 },
 {
  "id": "pc_imp_pluie",
  "grammar": "pc-imp",
  "band": "A2",
  "speaker": "noe",
  "fr": "Il pleuvait, alors je suis resté à la maison.",
  "zh": "那时在下雨，所以我就留在家里了。",
  "en": "It was raining, so I stayed home.",
  "noteZh": "pleuvait 是背景；suis resté 是决定/事件。rester 用 être。",
  "noteEn": "pleuvait = background. suis resté = the event. rester takes être.",
  "listen": {
   "answer": "contrast",
   "options": [
    {
     "id": "contrast",
     "zh": "背景下雨，所以我留下了",
     "en": "background rain, then I stayed"
    },
    {
     "id": "two_pc",
     "zh": "两件都只是完成的事",
     "en": "two finished events only"
    },
    {
     "id": "fut",
     "zh": "将来的计划",
     "en": "a future plan"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il pleuvait, alors je suis resté à la maison",
    "Il pleuvait, alors je suis restée à la maison"
   ]
  }
 },
 {
  "id": "cestait_calme",
  "grammar": "pc-imp",
  "band": "A2",
  "speaker": "camille",
  "fr": "C'était calme, et soudain on a frappé.",
  "zh": "当时很安静，突然有人敲门。",
  "en": "It was quiet, and suddenly someone knocked.",
  "noteZh": "c'était 背景，on a frappé 突然的事件。",
  "noteEn": "c'était background, on a frappé the sudden event.",
  "listen": {
   "answer": "imp_bg",
   "options": [
    {
     "id": "imp_bg",
     "zh": "当时很安静（背景）",
     "en": "it was quiet (background)"
    },
    {
     "id": "pc",
     "zh": "突然安静了一次",
     "en": "it got quiet once"
    },
    {
     "id": "neg",
     "zh": "不安静",
     "en": "it isn't quiet"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'était calme, et soudain on a frappé"
   ]
  }
 },
 {
  "id": "pc_imp_choice",
  "grammar": "pc-imp",
  "band": "A2",
  "speaker": "neutral",
  "fr": "Hier, il faisait froid et j'ai mis un manteau.",
  "zh": "昨天很冷，于是我穿上了大衣。",
  "en": "Yesterday it was cold and I put on a coat.",
  "noteZh": "天气/状态 faisait；穿上是一次性动作 ai mis。mettre → mis。",
  "noteEn": "Weather/state: faisait. One action: ai mis. mettre → mis.",
  "listen": {
   "answer": "wrong_tense",
   "options": [
    {
     "id": "wrong_tense",
     "zh": "应该用 imparfait 做背景",
     "en": "imparfait for the background"
    },
    {
     "id": "pc_ok",
     "zh": "两半都用 passé composé 才对",
     "en": "both halves passé composé"
    },
    {
     "id": "fut",
     "zh": "用将来时",
     "en": "future tense"
    }
   ]
  },
  "produce": {
   "accept": [
    "Hier, il faisait froid et j'ai mis un manteau"
   ]
  }
 },
 {
  "id": "viens_de",
  "grammar": "passe-recent",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je viens de rentrer.",
  "zh": "我刚刚到家。",
  "en": "I just got home.",
  "noteZh": "venir de + 原形 = 刚刚。不是将来。",
  "noteEn": "venir de + infinitive = just did. Not the future.",
  "listen": {
   "answer": "recent",
   "options": [
    {
     "id": "recent",
     "zh": "我刚刚到家",
     "en": "I just got home"
    },
    {
     "id": "pc_ago",
     "zh": "我昨天到家",
     "en": "I got home yesterday"
    },
    {
     "id": "fut",
     "zh": "我即将到家",
     "en": "I'm about to get home"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je viens de rentrer"
   ]
  }
 },
 {
  "id": "vient_de_partir",
  "grammar": "passe-recent",
  "band": "A2",
  "speaker": "noe",
  "fr": "Noé vient de partir.",
  "zh": "Noé 刚走。",
  "en": "Noé just left.",
  "noteZh": "vient de + partir。partir 不再变位。",
  "noteEn": "vient de + infinitive partir.",
  "listen": {
   "answer": "recent",
   "options": [
    {
     "id": "recent",
     "zh": "他刚走",
     "en": "he just left"
    },
    {
     "id": "still",
     "zh": "他还在",
     "en": "he's still here"
    },
    {
     "id": "fut",
     "zh": "他要走",
     "en": "he's going to leave"
    }
   ]
  },
  "produce": {
   "accept": [
    "Noé vient de partir"
   ]
  }
 },
 {
  "id": "ne_parle_pas",
  "grammar": "imperative",
  "band": "A2",
  "speaker": "noe",
  "fr": "Ne parle pas.",
  "zh": "别说话。",
  "en": "Don't talk.",
  "noteZh": "否定命令：Ne + 动词 + pas。没有 tu。",
  "noteEn": "Negative imperative: Ne + verb + pas. No tu.",
  "listen": {
   "answer": "imp_neg",
   "options": [
    {
     "id": "imp_neg",
     "zh": "别出声（否定命令）",
     "en": "don't make a sound"
    },
    {
     "id": "imp_pos",
     "zh": "请出声",
     "en": "do make a sound"
    },
    {
     "id": "pc",
     "zh": "你没有出声",
     "en": "you didn't make a sound"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ne parle pas"
   ]
  }
 },
 {
  "id": "assieds_toi",
  "grammar": "imperative",
  "band": "A2",
  "speaker": "camille",
  "fr": "Assieds-toi.",
  "zh": "坐下。（对你）",
  "en": "Sit down. (to tu)",
  "noteZh": "肯定命令的代词放后面，用连字符。",
  "noteEn": "Affirmative imperative: pronoun after the verb, with a hyphen.",
  "listen": {
   "answer": "imp",
   "options": [
    {
     "id": "imp",
     "zh": "请坐",
     "en": "please sit down"
    },
    {
     "id": "pc",
     "zh": "你坐下了",
     "en": "you sat down"
    },
    {
     "id": "inf",
     "zh": "坐下这个动作的名词",
     "en": "the noun for sitting"
    }
   ]
  },
  "produce": {
   "accept": [
    "Assieds-toi",
    "Asseyez-vous"
   ]
  }
 },
 {
  "id": "attends_moi",
  "grammar": "imperative",
  "band": "A2",
  "speaker": "noe",
  "fr": "Attends-moi.",
  "zh": "等等我。",
  "en": "Wait for me.",
  "noteZh": "attendre 的 tu 命令是 attends，s 还在。",
  "noteEn": "The tu imperative of attendre keeps the s: attends.",
  "listen": {
   "answer": "imp",
   "options": [
    {
     "id": "imp",
     "zh": "等我一下",
     "en": "wait for me"
    },
    {
     "id": "pc",
     "zh": "你等了我",
     "en": "you waited for me"
    },
    {
     "id": "fut",
     "zh": "我会等",
     "en": "I will wait"
    }
   ]
  },
  "produce": {
   "accept": [
    "Attends-moi"
   ]
  }
 },
 {
  "id": "je_vais_le",
  "grammar": "cod",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je vais le chercher.",
  "zh": "我去把它找回来。",
  "en": "I'm going to look for it.",
  "noteZh": "le 放在原形 chercher 前面，不放在 vais 前面。",
  "noteEn": "le goes before the infinitive chercher, not before vais.",
  "listen": {
   "answer": "cod_inf",
   "options": [
    {
     "id": "cod_inf",
     "zh": "我去找它（代词在原形前）",
     "en": "I'll go get it (pronoun before the infinitive)"
    },
    {
     "id": "cod_after",
     "zh": "代词放在句尾",
     "en": "pronoun at the end"
    },
    {
     "id": "search",
     "zh": "我在找",
     "en": "I'm searching"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je vais le chercher"
   ]
  }
 },
 {
  "id": "je_veux_la_voir",
  "grammar": "cod",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je veux la voir.",
  "zh": "我想见她。",
  "en": "I want to see her.",
  "noteZh": "la 在 voir 前面。voir 的宾语是人，用 la/le。",
  "noteEn": "la before voir.",
  "listen": {
   "answer": "cod",
   "options": [
    {
     "id": "cod",
     "zh": "我想见她",
     "en": "I want to see her"
    },
    {
     "id": "coi",
     "zh": "我想对她说",
     "en": "I want to talk to her"
    },
    {
     "id": "fut",
     "zh": "她要看见我",
     "en": "she will see me"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je veux la voir"
   ]
  }
 },
 {
  "id": "je_lui_ai_parle",
  "grammar": "coi",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je lui ai parlé.",
  "zh": "我和他/她说了。",
  "en": "I spoke to him/her.",
  "noteZh": "parler à → lui。lui 男女都一样，放在助动词前面。",
  "noteEn": "parler à → lui. lui is both genders, before the auxiliary.",
  "listen": {
   "answer": "coi",
   "options": [
    {
     "id": "coi",
     "zh": "我给他打了电话",
     "en": "I called him (à + person)"
    },
    {
     "id": "cod",
     "zh": "我看见了他",
     "en": "I saw him"
    },
    {
     "id": "poss",
     "zh": "这是他的电话",
     "en": "it's his phone"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je lui ai parlé"
   ]
  }
 },
 {
  "id": "son_telephone",
  "grammar": "possessives",
  "band": "A2",
  "speaker": "noe",
  "fr": "C'est son téléphone.",
  "zh": "这是他/她的手机。",
  "en": "It's his/her phone.",
  "noteZh": "son/sa 看后面的名词，不看主人。téléphone 是阳性，所以 son，即使主人是女性。",
  "noteEn": "son/sa follows the noun, not the owner. téléphone is masculine → son.",
  "listen": {
   "answer": "poss",
   "options": [
    {
     "id": "poss",
     "zh": "他的手机（阳性名词也用 son）",
     "en": "his/her phone (son before a masculine noun)"
    },
    {
     "id": "sa",
     "zh": "sa téléphone",
     "en": "sa téléphone"
    },
    {
     "id": "leur",
     "zh": "他们的",
     "en": "their"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est son téléphone"
   ]
  }
 },
 {
  "id": "ses_cles",
  "grammar": "possessives",
  "band": "A2",
  "speaker": "camille",
  "fr": "Ce sont ses clés.",
  "zh": "这是他/她的钥匙。",
  "en": "These are his/her keys.",
  "noteZh": "复数名词用 ses，不分男女主人。",
  "noteEn": "Plural noun → ses, for any owner.",
  "listen": {
   "answer": "poss_f",
   "options": [
    {
     "id": "poss_f",
     "zh": "她的钥匙（阴性复数）",
     "en": "her keys"
    },
    {
     "id": "son",
     "zh": "son clés",
     "en": "son clés"
    },
    {
     "id": "mon",
     "zh": "我的钥匙",
     "en": "my keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ce sont ses clés"
   ]
  }
 },
 {
  "id": "mon_appartement",
  "grammar": "possessives",
  "band": "A2",
  "speaker": "noe",
  "fr": "C'est mon appartement.",
  "zh": "这是我的公寓。",
  "en": "This is my apartment.",
  "noteZh": "mon 在元音前也用：mon amie（避免 ma amie）。appartement 是阳性。",
  "noteEn": "mon is also used before a vowel. appartement is masculine.",
  "listen": {
   "answer": "my",
   "options": [
    {
     "id": "my",
     "zh": "我的公寓",
     "en": "my apartment"
    },
    {
     "id": "your",
     "zh": "你的公寓",
     "en": "your apartment"
    },
    {
     "id": "our",
     "zh": "我们的公寓",
     "en": "our apartment"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est mon appartement"
   ]
  }
 },
 {
  "id": "ce_verre",
  "grammar": "demonstratives",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je prends ce verre.",
  "zh": "我拿这个杯子。",
  "en": "I'll take this glass.",
  "noteZh": "ce + 阳性辅音开头。这杯是咖啡。",
  "noteEn": "ce + masculine noun starting with a consonant.",
  "listen": {
   "answer": "this",
   "options": [
    {
     "id": "this",
     "zh": "这个杯子（近）",
     "en": "this cup"
    },
    {
     "id": "that",
     "zh": "那个杯子",
     "en": "that cup"
    },
    {
     "id": "my",
     "zh": "我的杯子",
     "en": "my cup"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je prends ce verre"
   ]
  }
 },
 {
  "id": "cette_annee",
  "grammar": "demonstratives",
  "band": "A2",
  "speaker": "neutral",
  "fr": "Cette année, j'habite ici.",
  "zh": "今年我住在这里。",
  "en": "This year I live here.",
  "noteZh": "année 是阴性，所以用 cette，不用 cet。",
  "noteEn": "année is feminine, so cette, not cet.",
  "listen": {
   "answer": "this_f",
   "options": [
    {
     "id": "this_f",
     "zh": "今年（cette + 阴性）",
     "en": "this year"
    },
    {
     "id": "cet",
     "zh": "cet année",
     "en": "cet année"
    },
    {
     "id": "cest",
     "zh": "在说「这是一年」",
     "en": "saying it is a year"
    }
   ]
  },
  "produce": {
   "accept": [
    "Cette année, j'habite ici"
   ]
  }
 },
 {
  "id": "cet_homme",
  "grammar": "demonstratives",
  "band": "A2",
  "speaker": "noe",
  "fr": "Cet homme cherche le chat.",
  "zh": "这位男士在找猫。",
  "en": "This man is looking for the cat.",
  "noteZh": "homme 元音开头，ce 要写成 cet。",
  "noteEn": "homme starts with a vowel sound → cet.",
  "listen": {
   "answer": "cet",
   "options": [
    {
     "id": "cet",
     "zh": "这个男人（元音前 cet）",
     "en": "this man (cet before a vowel)"
    },
    {
     "id": "ce",
     "zh": "ce homme",
     "en": "ce homme"
    },
    {
     "id": "cette",
     "zh": "cette homme",
     "en": "cette homme"
    }
   ]
  },
  "produce": {
   "accept": [
    "Cet homme cherche le chat"
   ]
  }
 },
 {
  "id": "qui_parle",
  "grammar": "qui-que",
  "band": "A2",
  "speaker": "camille",
  "fr": "C'est Camille qui parle.",
  "zh": "说话的人是 Camille。",
  "en": "Camille is the one who is speaking.",
  "noteZh": "qui 代替主语，后面直接接动词，动词要变位。",
  "noteEn": "qui replaces the subject. A conjugated verb follows.",
  "listen": {
   "answer": "qui",
   "options": [
    {
     "id": "qui",
     "zh": "qui 后面是动词（人是主语）",
     "en": "qui + verb (person is the subject)"
    },
    {
     "id": "que",
     "zh": "que 后面是主语+动词",
     "en": "que + subject + verb"
    },
    {
     "id": "ou",
     "zh": "在哪里",
     "en": "where"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est Camille qui parle"
   ]
  }
 },
 {
  "id": "que_je_vois",
  "grammar": "qui-que",
  "band": "A2",
  "speaker": "noe",
  "fr": "Le chat que je vois est roux.",
  "zh": "我看见的那只猫是橘色的。",
  "en": "The cat that I see is ginger.",
  "noteZh": "que 是动词 vois 的宾语，所以 je 还在。",
  "noteEn": "que is the object of vois, so je stays.",
  "listen": {
   "answer": "que",
   "options": [
    {
     "id": "que",
     "zh": "que 后面先出现主语",
     "en": "que + subject"
    },
    {
     "id": "qui",
     "zh": "qui 后面直接动词",
     "en": "qui + verb"
    },
    {
     "id": "dont",
     "zh": "dont",
     "en": "dont"
    }
   ]
  },
  "produce": {
   "accept": [
    "Le chat que je vois est roux"
   ]
  }
 },
 {
  "id": "fleurs_belles",
  "grammar": "agreement",
  "band": "A2",
  "speaker": "camille",
  "fr": "Les fleurs sont belles.",
  "zh": "这些花很美。",
  "en": "The flowers are beautiful.",
  "noteZh": "fleurs 阴性复数 → belles。主语和形容词一起变。",
  "noteEn": "fleurs feminine plural → belles.",
  "listen": {
   "answer": "agr_f",
   "options": [
    {
     "id": "agr_f",
     "zh": "阴性复数：美丽的花",
     "en": "feminine plural agreement"
    },
    {
     "id": "m",
     "zh": "阳性复数",
     "en": "masculine plural"
    },
    {
     "id": "sg",
     "zh": "单数",
     "en": "singular"
    }
   ]
  },
  "produce": {
   "accept": [
    "Les fleurs sont belles"
   ]
  }
 },
 {
  "id": "amis_occupes",
  "grammar": "agreement",
  "band": "A2",
  "speaker": "noe",
  "fr": "Ses amis sont occupés.",
  "zh": "他/她的朋友们正忙。",
  "en": "His/her friends are busy.",
  "noteZh": "amis 如果是阳性或混合复数，occupés。",
  "noteEn": "Mixed or masculine plural amis → occupés.",
  "listen": {
   "answer": "agr",
   "options": [
    {
     "id": "agr",
     "zh": "他的朋友们很忙（复数）",
     "en": "his/her friends are busy"
    },
    {
     "id": "sg",
     "zh": "他的朋友很忙（单数）",
     "en": "one friend is busy"
    },
    {
     "id": "f",
     "zh": "只看女性",
     "en": "feminine only"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ses amis sont occupés",
    "Ses amies sont occupées"
   ]
  }
 },
 {
  "id": "cafe_meilleur",
  "grammar": "meilleur-mieux",
  "band": "A2",
  "speaker": "camille",
  "fr": "Ce café est meilleur.",
  "zh": "这杯咖啡更好。",
  "en": "This coffee is better.",
  "noteZh": "meilleur 形容名词 café。bon → meilleur。",
  "noteEn": "meilleur describes the noun café. bon → meilleur.",
  "listen": {
   "answer": "noun",
   "options": [
    {
     "id": "noun",
     "zh": "咖啡更好（东西）",
     "en": "the coffee is better (a thing)"
    },
    {
     "id": "adv",
     "zh": "做得更好（动作）",
     "en": "done better (an action)"
    },
    {
     "id": "same",
     "zh": "两个词一样",
     "en": "the two words are the same"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ce café est meilleur"
   ]
  }
 },
 {
  "id": "parle_mieux",
  "grammar": "meilleur-mieux",
  "band": "A2",
  "speaker": "noe",
  "fr": "Elle parle mieux français.",
  "zh": "她法语说得更好。",
  "en": "She speaks French better.",
  "noteZh": "mieux 修饰动词 parle。bien → mieux。不要说 parle meilleur。",
  "noteEn": "mieux modifies parle. bien → mieux. Not parle meilleur.",
  "listen": {
   "answer": "adv",
   "options": [
    {
     "id": "adv",
     "zh": "她法语说得更好（动作）",
     "en": "she speaks French better"
    },
    {
     "id": "noun",
     "zh": "她的法语这个东西更好",
     "en": "her French, the thing, is better"
    },
    {
     "id": "moins",
     "zh": "更差",
     "en": "worse"
    }
   ]
  },
  "produce": {
   "accept": [
    "Elle parle mieux français",
    "Elle parle mieux le français"
   ]
  }
 },
 {
  "id": "meilleur_et_mieux",
  "grammar": "meilleur-mieux",
  "band": "A2",
  "speaker": "camille",
  "fr": "Ce restaurant est meilleur, mais Noé cuisine mieux.",
  "zh": "这家馆子更好，但 Noé 做菜更拿手。",
  "en": "This restaurant is better, but Noé cooks better.",
  "noteZh": "更好先问：是东西，还是做得。东西 meilleur，做法 mieux。",
  "noteEn": "Ask: a thing, or how it's done? Thing → meilleur. Action → mieux.",
  "listen": {
   "answer": "both",
   "options": [
    {
     "id": "both",
     "zh": "东西用 meilleur，动作用 mieux",
     "en": "meilleur for the thing, mieux for the action"
    },
    {
     "id": "swap",
     "zh": "两个对调",
     "en": "the two are swapped"
    },
    {
     "id": "same",
     "zh": "只用 meilleur",
     "en": "only meilleur"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ce restaurant est meilleur, mais Noé cuisine mieux"
   ]
  }
 },
 {
  "id": "va_mieux",
  "grammar": "meilleur-mieux",
  "band": "A2",
  "speaker": "noe",
  "fr": "Elle va mieux.",
  "zh": "她好些了。",
  "en": "She is feeling better.",
  "noteZh": "身体、状态用 aller mieux，不说 est meilleur。",
  "noteEn": "Health and state: aller mieux, not est meilleur.",
  "listen": {
   "answer": "health",
   "options": [
    {
     "id": "health",
     "zh": "她好些了（身体状态）",
     "en": "she is better (health)"
    },
    {
     "id": "noun",
     "zh": "她是更好的人",
     "en": "she is a better person"
    },
    {
     "id": "adv",
     "zh": "她做得更好",
     "en": "she does it better"
    }
   ]
  },
  "produce": {
   "accept": [
    "Elle va mieux"
   ]
  }
 },
 {
  "id": "jai_elision",
  "grammar": "elision",
  "band": "A2",
  "speaker": "camille",
  "fr": "J'ai un colocataire.",
  "zh": "我有一个室友。",
  "en": "I have a roommate.",
  "noteZh": "je ai 不能分开说，必须 j'ai。",
  "noteEn": "je ai must become j'ai.",
  "listen": {
   "answer": "elision",
   "options": [
    {
     "id": "elision",
     "zh": "我有（省音）",
     "en": "I have (elision)"
    },
    {
     "id": "full",
     "zh": "je ai",
     "en": "je ai"
    },
    {
     "id": "neg",
     "zh": "我没有",
     "en": "I don't have"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai un colocataire"
   ]
  }
 },
 {
  "id": "parce_quil",
  "grammar": "elision",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je reste parce qu'il pleut.",
  "zh": "我留下，因为在下雨。",
  "en": "I'm staying because it's raining.",
  "noteZh": "que il → qu'il。",
  "noteEn": "que il → qu'il.",
  "listen": {
   "answer": "elision",
   "options": [
    {
     "id": "elision",
     "zh": "因为（元音前 qu'）",
     "en": "because (qu' before a vowel)"
    },
    {
     "id": "que",
     "zh": "que il",
     "en": "que il"
    },
    {
     "id": "qui",
     "zh": "qui il",
     "en": "qui il"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je reste parce qu'il pleut"
   ]
  }
 },
 {
  "id": "sur_pas_dans",
  "grammar": "articles",
  "band": "A2",
  "speaker": "camille",
  "fr": "Les clés sont sur la table, pas dans le sac.",
  "zh": "钥匙在桌子上，不在包里。",
  "en": "The keys are on the table, not in the bag.",
  "noteZh": "sur 表面接触；dans 在里面。",
  "noteEn": "sur = on the surface. dans = inside.",
  "listen": {
   "answer": "prep",
   "options": [
    {
     "id": "prep",
     "zh": "在桌子上（sur）",
     "en": "on the table"
    },
    {
     "id": "dans",
     "zh": "在桌子里",
     "en": "inside the table"
    },
    {
     "id": "avec",
     "zh": "用桌子",
     "en": "with the table"
    }
   ]
  },
  "produce": {
   "accept": [
    "Les clés sont sur la table, pas dans le sac"
   ]
  }
 },
 {
  "id": "de_leau",
  "grammar": "articles",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je voudrais de l'eau.",
  "zh": "我想要一点水。",
  "en": "I would like some water.",
  "noteZh": "eau 元音开头：de l'eau，不是 du eau。",
  "noteEn": "eau starts with a vowel: de l'eau, not du eau.",
  "listen": {
   "answer": "art",
   "options": [
    {
     "id": "art",
     "zh": "一些水（不可数 du）",
     "en": "some water"
    },
    {
     "id": "une",
     "zh": "une eau（一般不这样说“一杯”之外）",
     "en": "une eau as a default"
    },
    {
     "id": "les",
     "zh": "所有的水",
     "en": "all water"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je voudrais de l'eau"
   ]
  }
 },
 {
  "id": "pas_de_pain",
  "grammar": "negation",
  "band": "A2",
  "speaker": "camille",
  "fr": "Il n'y a pas de pain.",
  "zh": "没有面包了。",
  "en": "There isn't any bread.",
  "noteZh": "否定句里 du/un 常变成 de。n' 因为 y 是元音。",
  "noteEn": "After ne…pas, du/un often becomes de.",
  "listen": {
   "answer": "neg_art",
   "options": [
    {
     "id": "neg_art",
     "zh": "否定里用 de",
     "en": "de after a negative"
    },
    {
     "id": "du",
     "zh": "还是 du pain",
     "en": "still du pain"
    },
    {
     "id": "un",
     "zh": "un pain",
     "en": "un pain"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il n'y a pas de pain"
   ]
  }
 },
 {
  "id": "plus_calme",
  "grammar": "comparatives",
  "band": "A2",
  "speaker": "noe",
  "fr": "L'appartement est plus calme que le café.",
  "zh": "这公寓比咖啡馆安静。",
  "en": "The apartment is quieter than the café.",
  "noteZh": "plus + 形容词 + que。",
  "noteEn": "plus + adjective + que.",
  "listen": {
   "answer": "comp",
   "options": [
    {
     "id": "comp",
     "zh": "比……更安静",
     "en": "quieter than"
    },
    {
     "id": "sup",
     "zh": "最安静",
     "en": "the quietest"
    },
    {
     "id": "egal",
     "zh": "一样",
     "en": "the same"
    }
   ]
  },
  "produce": {
   "accept": [
    "L'appartement est plus calme que le café"
   ]
  }
 },
 {
  "id": "le_plus_calme",
  "grammar": "comparatives",
  "band": "A2",
  "speaker": "camille",
  "fr": "C'est la pièce la plus calme.",
  "zh": "这是最安静的房间。",
  "en": "It's the quietest room.",
  "noteZh": "最高级：le/la/les plus + 形容词。pièce 阴性 → la plus。",
  "noteEn": "Superlative: le/la/les plus. pièce is feminine → la plus.",
  "listen": {
   "answer": "sup",
   "options": [
    {
     "id": "sup",
     "zh": "这是最安静的房间",
     "en": "the quietest room"
    },
    {
     "id": "comp",
     "zh": "更安静",
     "en": "quieter"
    },
    {
     "id": "moins",
     "zh": "没那么安静",
     "en": "less quiet"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est la pièce la plus calme"
   ]
  }
 },
 {
  "id": "moins_cher",
  "grammar": "comparatives",
  "band": "A2",
  "speaker": "noe",
  "fr": "Ce café est moins cher.",
  "zh": "这家咖啡馆没那么贵。",
  "en": "This café is less expensive.",
  "noteZh": "moins + 形容词。cher 要和名词配合：une tasse moins chère。",
  "noteEn": "moins + adjective. Agreement: une tasse moins chère.",
  "listen": {
   "answer": "moins",
   "options": [
    {
     "id": "moins",
     "zh": "没那么贵",
     "en": "less expensive"
    },
    {
     "id": "plus",
     "zh": "更贵",
     "en": "more expensive"
    },
    {
     "id": "bon",
     "zh": "更好",
     "en": "better"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ce café est moins cher"
   ]
  }
 },
 {
  "id": "en_train",
  "grammar": "present",
  "band": "A2",
  "speaker": "camille",
  "fr": "Je suis en train de chercher les clés.",
  "zh": "我正在找钥匙。",
  "en": "I'm in the middle of looking for the keys.",
  "noteZh": "必须有 suis/es/est：être en train de + 原形。不能说 je en train。",
  "noteEn": "You need être: être en train de + infinitive.",
  "listen": {
   "answer": "ing",
   "options": [
    {
     "id": "ing",
     "zh": "我正在找（être en train de）",
     "en": "I'm in the middle of looking"
    },
    {
     "id": "fut",
     "zh": "我要找",
     "en": "I'm going to look"
    },
    {
     "id": "pc",
     "zh": "我找过了",
     "en": "I looked"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je suis en train de chercher les clés"
   ]
  }
 },
 {
  "id": "envie",
  "grammar": "present",
  "band": "A2",
  "speaker": "noe",
  "fr": "J'ai envie d'un café.",
  "zh": "我想喝杯咖啡。",
  "en": "I feel like a coffee.",
  "noteZh": "avoir envie de。un 元音前 de → d'un。",
  "noteEn": "avoir envie de. d'un before a vowel.",
  "listen": {
   "answer": "want",
   "options": [
    {
     "id": "want",
     "zh": "我想喝咖啡（envie de）",
     "en": "I feel like a coffee"
    },
    {
     "id": "must",
     "zh": "我必须",
     "en": "I must"
    },
    {
     "id": "pc",
     "zh": "我喝过了",
     "en": "I drank"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai envie d'un café"
   ]
  }
 },
 {
  "id": "jai_mal",
  "grammar": "present",
  "band": "A2",
  "speaker": "camille",
  "fr": "J'ai mal à la tête.",
  "zh": "我头疼。",
  "en": "I have a headache.",
  "noteZh": "avoir mal à + 身体部位，部位用定冠词 la/le，不用 mon。",
  "noteEn": "avoir mal à + body part with le/la, not mon.",
  "listen": {
   "answer": "hurt",
   "options": [
    {
     "id": "hurt",
     "zh": "我头疼",
     "en": "my head hurts"
    },
    {
     "id": "cold",
     "zh": "我冷",
     "en": "I'm cold"
    },
    {
     "id": "tired",
     "zh": "我累",
     "en": "I'm tired"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'ai mal à la tête"
   ]
  }
 },
 {
  "id": "je_m_en_souviens",
  "grammar": "present",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je m'en souviens.",
  "zh": "我记得这件事。",
  "en": "I remember (that).",
  "noteZh": "se souvenir de。de 的内容用 en：m'en，不是 me souviens de ça 在这个短句里。",
  "noteEn": "se souvenir de. The de-thing becomes en.",
  "listen": {
   "answer": "remember",
   "options": [
    {
     "id": "remember",
     "zh": "我记得（se souvenir de）",
     "en": "I remember"
    },
    {
     "id": "forget",
     "zh": "我忘了",
     "en": "I forgot"
    },
    {
     "id": "know",
     "zh": "我认识他",
     "en": "I know him"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je m'en souviens"
   ]
  }
 },
 {
  "id": "mise_au_sport",
  "grammar": "passe-compose",
  "band": "A2",
  "speaker": "camille",
  "fr": "Elle s'est mise au sport.",
  "zh": "她开始运动了。",
  "en": "She took up exercise.",
  "noteZh": "se mettre à。elle + être → mise。au = à + le sport。",
  "noteEn": "se mettre à. elle + être → mise. au = à + le.",
  "listen": {
   "answer": "sport",
   "options": [
    {
     "id": "sport",
     "zh": "我开始运动了",
     "en": "I took up sport"
    },
    {
     "id": "stop",
     "zh": "我停止运动",
     "en": "I stopped sport"
    },
    {
     "id": "fut",
     "zh": "我要运动",
     "en": "I'm going to exercise"
    }
   ]
  },
  "produce": {
   "accept": [
    "Elle s'est mise au sport"
   ]
  }
 },
 {
  "id": "je_parlerai",
  "grammar": "futur-simple",
  "band": "B1",
  "speaker": "camille",
  "fr": "Je parlerai au propriétaire demain.",
  "zh": "我明天会和房东说。",
  "en": "I will speak to the landlord tomorrow.",
  "noteZh": "简单将来 je 的结尾是 -ai：parlerai。不是 il 的 parlera。",
  "noteEn": "Futur simple for je ends in -ai: parlerai, not parlera.",
  "listen": {
   "answer": "fs",
   "options": [
    {
     "id": "fs",
     "zh": "我明天会说（简单将来）",
     "en": "I will speak tomorrow"
    },
    {
     "id": "fp",
     "zh": "我这就说",
     "en": "I'm about to speak"
    },
    {
     "id": "cond",
     "zh": "如果……我会说",
     "en": "I would speak"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je parlerai au propriétaire demain"
   ]
  }
 },
 {
  "id": "nous_arriverons",
  "grammar": "futur-simple",
  "band": "B1",
  "speaker": "noe",
  "fr": "Nous arriverons à l'heure.",
  "zh": "我们会准时到。",
  "en": "We will arrive on time.",
  "noteZh": "nous 的简单将来结尾 -ons：arriverons。",
  "noteEn": "nous ending -ons: arriverons.",
  "listen": {
   "answer": "fs_we",
   "options": [
    {
     "id": "fs_we",
     "zh": "我们会到",
     "en": "we will arrive"
    },
    {
     "id": "pc",
     "zh": "我们到了",
     "en": "we arrived"
    },
    {
     "id": "imp",
     "zh": "我们当时在到",
     "en": "we were arriving"
    }
   ]
  },
  "produce": {
   "accept": [
    "Nous arriverons à l'heure"
   ]
  }
 },
 {
  "id": "elle_viendra",
  "grammar": "futur-simple",
  "band": "B1",
  "speaker": "camille",
  "fr": "Elle viendra après le travail.",
  "zh": "她下班后来。",
  "en": "She will come after work.",
  "noteZh": "venir 的将来词干是 viendr-。",
  "noteEn": "venir's future stem is viendr-.",
  "listen": {
   "answer": "fs_irreg",
   "options": [
    {
     "id": "fs_irreg",
     "zh": "她会来（不规则词干 viendr-）",
     "en": "she will come"
    },
    {
     "id": "fp",
     "zh": "她这就来",
     "en": "she's about to come"
    },
    {
     "id": "pc",
     "zh": "她来了",
     "en": "she came"
    }
   ]
  },
  "produce": {
   "accept": [
    "Elle viendra après le travail"
   ]
  }
 },
 {
  "id": "il_va_falloir",
  "grammar": "futur-proche",
  "band": "B1",
  "speaker": "noe",
  "fr": "Il va falloir partir.",
  "zh": "得走了。",
  "en": "We're going to have to leave.",
  "noteZh": "il faut 的近将来。partir 用原形。",
  "noteEn": "Near future of il faut. partir stays infinitive.",
  "listen": {
   "answer": "need",
   "options": [
    {
     "id": "need",
     "zh": "得走了（il va falloir）",
     "en": "we'll have to leave"
    },
    {
     "id": "want",
     "zh": "想走",
     "en": "want to leave"
    },
    {
     "id": "pc",
     "zh": "已经走了",
     "en": "already left"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il va falloir partir"
   ]
  }
 },
 {
  "id": "si_imparfait",
  "grammar": "conditionnel",
  "band": "B1",
  "speaker": "camille",
  "fr": "Si j'avais le temps, je viendrais.",
  "zh": "如果我有时间，我会来。",
  "en": "If I had time, I would come.",
  "noteZh": "si + imparfait，结果用条件式。viendrais 不是 viendra。",
  "noteEn": "si + imparfait, result in the conditional. viendrais, not viendra.",
  "listen": {
   "answer": "cond",
   "options": [
    {
     "id": "cond",
     "zh": "如果有时间我就来（条件式）",
     "en": "I would come if I had time"
    },
    {
     "id": "fs",
     "zh": "我一定会来",
     "en": "I will definitely come"
    },
    {
     "id": "imp",
     "zh": "我那时常来",
     "en": "I used to come"
    }
   ]
  },
  "produce": {
   "accept": [
    "Si j'avais le temps, je viendrais"
   ]
  }
 },
 {
  "id": "je_voudrais_pol",
  "grammar": "conditionnel",
  "band": "B1",
  "speaker": "neutral",
  "fr": "Je voudrais un rendez-vous.",
  "zh": "我想约个时间。",
  "en": "I would like an appointment.",
  "noteZh": "voudrais 是 vouloir 的条件式，点东西、约时间都客气。",
  "noteEn": "Conditional of vouloir. Polite for orders and appointments.",
  "listen": {
   "answer": "cond",
   "options": [
    {
     "id": "cond",
     "zh": "我会想要（客气/假设）",
     "en": "I would like (polite/hypothetical)"
    },
    {
     "id": "pc",
     "zh": "我想要过",
     "en": "I wanted"
    },
    {
     "id": "fs",
     "zh": "我将会要",
     "en": "I will want"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je voudrais un rendez-vous"
   ]
  }
 },
 {
  "id": "jaurais_voulu",
  "grammar": "cond-passe",
  "band": "B1",
  "speaker": "noe",
  "fr": "J'aurais voulu rester.",
  "zh": "我本来想留下来。",
  "en": "I would have liked to stay.",
  "noteZh": "条件式过去：助动词用条件式 aurais + 过去分词。",
  "noteEn": "Conditional past: aurais + past participle.",
  "listen": {
   "answer": "cond_past",
   "options": [
    {
     "id": "cond_past",
     "zh": "我本来会留下来",
     "en": "I would have stayed"
    },
    {
     "id": "pc",
     "zh": "我留下来了",
     "en": "I stayed"
    },
    {
     "id": "cond",
     "zh": "我会留下来",
     "en": "I would stay"
    }
   ]
  },
  "produce": {
   "accept": [
    "J'aurais voulu rester"
   ]
  }
 },
 {
  "id": "etait_partie",
  "grammar": "pqp",
  "band": "B1",
  "speaker": "camille",
  "fr": "Quand je suis arrivé, elle était déjà partie.",
  "zh": "我到的时候，她已经走了。",
  "en": "When I arrived, she had already left.",
  "noteZh": "更早的那件用 plus-que-parfait：était partie。",
  "noteEn": "The earlier event is plus-que-parfait: était partie.",
  "listen": {
   "answer": "pqp",
   "options": [
    {
     "id": "pqp",
     "zh": "我到之前她已经走了",
     "en": "she had already left before I arrived"
    },
    {
     "id": "pc",
     "zh": "她走了，然后我到",
     "en": "she left, then I arrived, same time frame"
    },
    {
     "id": "imp",
     "zh": "她当时正在走",
     "en": "she was leaving"
    }
   ]
  },
  "produce": {
   "accept": [
    "Quand je suis arrivé, elle était déjà partie",
    "Quand je suis arrivée, elle était déjà partie"
   ]
  }
 },
 {
  "id": "quand_tu_auras",
  "grammar": "futur-anterieur",
  "band": "B1",
  "speaker": "noe",
  "fr": "Quand tu auras fini, on mangera.",
  "zh": "等你做完了，我们就吃饭。",
  "en": "When you've finished, we'll eat.",
  "noteZh": "先完成的那件用 futur antérieur（auras fini），然后简单将来。不要和条件式过去 aurais 混。",
  "noteEn": "The earlier future event: auras fini. Then futur simple. Not aurais.",
  "listen": {
   "answer": "fa",
   "options": [
    {
     "id": "fa",
     "zh": "等你做完（将来完成）",
     "en": "when you have finished (future perfect)"
    },
    {
     "id": "condp",
     "zh": "你本来会做完",
     "en": "you would have finished"
    },
    {
     "id": "pc",
     "zh": "你做完了",
     "en": "you finished"
    }
   ]
  },
  "produce": {
   "accept": [
    "Quand tu auras fini, on mangera"
   ]
  }
 },
 {
  "id": "porte_ouverte",
  "grammar": "passive",
  "band": "B1",
  "speaker": "camille",
  "fr": "La porte a été ouverte par Noé.",
  "zh": "门是 Noé 打开的。",
  "en": "The door was opened by Noé.",
  "noteZh": "être 的时态 + 过去分词。porte 阴性 → ouverte。施动者用 par。",
  "noteEn": "être in the tense + participle. ouverte agrees. The doer uses par.",
  "listen": {
   "answer": "pass",
   "options": [
    {
     "id": "pass",
     "zh": "门被 Noé 打开了",
     "en": "the door was opened by Noé"
    },
    {
     "id": "actif",
     "zh": "Noé 是门",
     "en": "Noé is the door"
    },
    {
     "id": "fut",
     "zh": "门将会开",
     "en": "the door will open"
    }
   ]
  },
  "produce": {
   "accept": [
    "La porte a été ouverte par Noé"
   ]
  }
 },
 {
  "id": "cles_seront",
  "grammar": "passive",
  "band": "B1",
  "speaker": "noe",
  "fr": "Les clés seront retrouvées.",
  "zh": "钥匙会被找到的。",
  "en": "The keys will be found.",
  "noteZh": "seront 是 être 的简单将来。retrouvées 配合 clés 阴性复数。",
  "noteEn": "seront is futur simple of être. retrouvées agrees with clés.",
  "listen": {
   "answer": "pass_fut",
   "options": [
    {
     "id": "pass_fut",
     "zh": "钥匙会被找到",
     "en": "the keys will be found"
    },
    {
     "id": "pc",
     "zh": "钥匙被找到了",
     "en": "the keys were found"
    },
    {
     "id": "actif",
     "zh": "有人找钥匙",
     "en": "someone finds the keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Les clés seront retrouvées"
   ]
  }
 },
 {
  "id": "etait_ouverte",
  "grammar": "passive",
  "band": "B1",
  "speaker": "neutral",
  "fr": "La porte était ouverte.",
  "zh": "门当时是开着的。",
  "en": "The door was open.",
  "noteZh": "était 是 imparfait。不是 serait（那是条件式）。",
  "noteEn": "était is imparfait. Not serait (conditional).",
  "listen": {
   "answer": "pass_imp",
   "options": [
    {
     "id": "pass_imp",
     "zh": "当时门是开着的/被打开的状态",
     "en": "the door was being opened / was open in the past"
    },
    {
     "id": "pc",
     "zh": "门被打开了一次",
     "en": "the door got opened once"
    },
    {
     "id": "actif",
     "zh": "有人正在开门",
     "en": "someone is opening it"
    }
   ]
  },
  "produce": {
   "accept": [
    "La porte était ouverte"
   ]
  }
 },
 {
  "id": "dont_voisine",
  "grammar": "dont",
  "band": "B1",
  "speaker": "camille",
  "fr": "C'est la voisine dont je t'ai parlé.",
  "zh": "就是我跟你说过的那位邻居。",
  "en": "That's the neighbour I told you about.",
  "noteZh": "parler de → dont。不是 que。",
  "noteEn": "parler de → dont, not que.",
  "listen": {
   "answer": "dont",
   "options": [
    {
     "id": "dont",
     "zh": "我跟你说过的那个邻居（de）",
     "en": "the neighbour I told you about"
    },
    {
     "id": "que",
     "zh": "我看见的邻居",
     "en": "the neighbour I saw"
    },
    {
     "id": "qui",
     "zh": "正在说话的邻居",
     "en": "the neighbour who is speaking"
    }
   ]
  },
  "produce": {
   "accept": [
    "C'est la voisine dont je t'ai parlé"
   ]
  }
 },
 {
  "id": "dont_jai_besoin",
  "grammar": "dont",
  "band": "B1",
  "speaker": "noe",
  "fr": "Le plan dont j'ai besoin est sur la table.",
  "zh": "我需要的那份计划在桌子上。",
  "en": "The plan I need is on the table.",
  "noteZh": "avoir besoin de → dont。",
  "noteEn": "avoir besoin de → dont.",
  "listen": {
   "answer": "dont",
   "options": [
    {
     "id": "dont",
     "zh": "他需要的那份计划",
     "en": "the plan he needs"
    },
    {
     "id": "que",
     "zh": "他正在读的书",
     "en": "the book he is reading"
    },
    {
     "id": "qui",
     "zh": "写了书的人",
     "en": "the person who wrote the book"
    }
   ]
  },
  "produce": {
   "accept": [
    "Le plan dont j'ai besoin est sur la table"
   ]
  }
 },
 {
  "id": "quest_ce_qui",
  "grammar": "ce-qui",
  "band": "B1",
  "speaker": "neutral",
  "fr": "Qu'est-ce qui est arrivé ?",
  "zh": "发生什么了？",
  "en": "What happened?",
  "noteZh": "qui 后面直接动词：是主语。arrivé 用 être。",
  "noteEn": "qui + verb: it is the subject.",
  "listen": {
   "answer": "cequi",
   "options": [
    {
     "id": "cequi",
     "zh": "发生了什么（主语）",
     "en": "what happened (subject)"
    },
    {
     "id": "ceque",
     "zh": "你做了什么（宾语）",
     "en": "what you did (object)"
    },
    {
     "id": "qui",
     "zh": "谁",
     "en": "who"
    }
   ]
  },
  "produce": {
   "accept": [
    "Qu'est-ce qui est arrivé",
    "Qu'est-ce qui est arrivé ?"
   ]
  }
 },
 {
  "id": "quest_ce_que",
  "grammar": "ce-qui",
  "band": "B1",
  "speaker": "camille",
  "fr": "Qu'est-ce que tu veux ?",
  "zh": "你想要什么？",
  "en": "What do you want?",
  "noteZh": "que 后面是主语 tu：que 是 veux 的宾语。",
  "noteEn": "que + subject tu: que is the object of veux.",
  "listen": {
   "answer": "ceque",
   "options": [
    {
     "id": "ceque",
     "zh": "你想要什么（宾语）",
     "en": "what do you want (object)"
    },
    {
     "id": "cequi",
     "zh": "什么东西想要",
     "en": "what wants"
    },
    {
     "id": "ou",
     "zh": "在哪里",
     "en": "where"
    }
   ]
  },
  "produce": {
   "accept": [
    "Qu'est-ce que tu veux",
    "Qu'est-ce que tu veux ?"
   ]
  }
 },
 {
  "id": "il_faut_que",
  "grammar": "subjonctif",
  "band": "B1",
  "speaker": "noe",
  "fr": "Il faut que tu viennes.",
  "zh": "你得来。",
  "en": "You have to come.",
  "noteZh": "il faut que 后面用虚拟式。venir → viennes，不是 viens。先记住这个块。",
  "noteEn": "After il faut que, subjunctive. viennes, not viens. Learn it as a chunk first.",
  "listen": {
   "answer": "subj",
   "options": [
    {
     "id": "subj",
     "zh": "必须你来（虚拟式）",
     "en": "you have to come (subjunctive)"
    },
    {
     "id": "ind",
     "zh": "你来（直陈）",
     "en": "you come (indicative)"
    },
    {
     "id": "imp",
     "zh": "你来！（命令）",
     "en": "come! (imperative)"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il faut que tu viennes"
   ]
  }
 },
 {
  "id": "je_veux_que",
  "grammar": "subjonctif",
  "band": "B1",
  "speaker": "camille",
  "fr": "Je veux que Camille reste.",
  "zh": "我想让 Camille 留下来。",
  "en": "I want Camille to stay.",
  "noteZh": "vouloir que + 虚拟式。elle reste：主语换了，不能用 je reste。",
  "noteEn": "vouloir que + subjunctive. The subject is Camille, so reste.",
  "listen": {
   "answer": "subj",
   "options": [
    {
     "id": "subj",
     "zh": "我想让她留下来",
     "en": "I want her to stay"
    },
    {
     "id": "ind",
     "zh": "她想留下来",
     "en": "she wants to stay"
    },
    {
     "id": "pc",
     "zh": "她留下来了",
     "en": "she stayed"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je veux que Camille reste"
   ]
  }
 },
 {
  "id": "bien_que",
  "grammar": "subjonctif",
  "band": "B1",
  "speaker": "neutral",
  "fr": "Bien qu'il pleuve, je sors.",
  "zh": "尽管在下雨，我还是出门。",
  "en": "Although it's raining, I'm going out.",
  "noteZh": "bien que + 虚拟式 pleuve。这是 B1 块，先整句记。",
  "noteEn": "bien que + subjunctive pleuve. Learn the whole chunk.",
  "listen": {
   "answer": "although",
   "options": [
    {
     "id": "although",
     "zh": "虽然在下雨，我还是出门",
     "en": "although it was raining, I went out"
    },
    {
     "id": "because",
     "zh": "因为下雨我出门",
     "en": "because it rained I went out"
    },
    {
     "id": "if",
     "zh": "如果下雨",
     "en": "if it rains"
    }
   ]
  },
  "produce": {
   "accept": [
    "Bien qu'il pleuve, je sors"
   ]
  }
 },
 {
  "id": "je_cherche_poste",
  "grammar": "search",
  "band": "A2",
  "speaker": "neutral",
  "fr": "Je cherche un bureau de poste.",
  "zh": "我在找邮局。",
  "en": "I'm looking for a post office.",
  "noteZh": "在蒙特利尔办事会用到。Je cherche 后面直接跟要找的地方。",
  "noteEn": "Useful for errands. Je cherche + the place.",
  "listen": {
   "answer": "mail",
   "options": [
    {
     "id": "mail",
     "zh": "我在找一个邮局",
     "en": "I'm looking for a post office"
    },
    {
     "id": "cafe",
     "zh": "我在找咖啡馆",
     "en": "I'm looking for a café"
    },
    {
     "id": "home",
     "zh": "我回家",
     "en": "I'm going home"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je cherche un bureau de poste"
   ]
  }
 },
 {
  "id": "ou_est_metro",
  "grammar": "directions",
  "band": "A2",
  "speaker": "camille",
  "fr": "Où est la station de métro ?",
  "zh": "地铁站在哪里？",
  "en": "Where is the metro station?",
  "noteZh": "station 阴性：la。Où est + 单数。",
  "noteEn": "station is feminine. Où est + singular.",
  "listen": {
   "answer": "metro",
   "options": [
    {
     "id": "metro",
     "zh": "地铁在哪里",
     "en": "where is the metro"
    },
    {
     "id": "bus",
     "zh": "公交在哪里",
     "en": "where is the bus"
    },
    {
     "id": "key",
     "zh": "钥匙在哪里",
     "en": "where are the keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Où est la station de métro",
    "Où est la station de métro ?"
   ]
  }
 },
 {
  "id": "depanneur",
  "grammar": "location",
  "band": "A2",
  "speaker": "noe",
  "fr": "Il y a un dépanneur au coin.",
  "zh": "街角有一家便利店。",
  "en": "There's a dépanneur on the corner.",
  "noteZh": "dépanneur 是魁北克说的便利店。au coin = 在街角。",
  "noteEn": "In Quebec a convenience store is a dépanneur.",
  "listen": {
   "answer": "dep",
   "options": [
    {
     "id": "dep",
     "zh": "街角有家便利店",
     "en": "there's a convenience store on the corner"
    },
    {
     "id": "cafe",
     "zh": "街角有咖啡馆",
     "en": "there's a café on the corner"
    },
    {
     "id": "none",
     "zh": "街角什么都没有",
     "en": "there's nothing on the corner"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il y a un dépanneur au coin"
   ]
  }
 },
 {
  "id": "froid_manteau",
  "grammar": "pc-imp",
  "band": "A2",
  "speaker": "camille",
  "fr": "Il fait froid, alors j'ai mis mon manteau.",
  "zh": "天很冷，所以我穿上了大衣。",
  "en": "It's cold, so I put my coat on.",
  "noteZh": "il fait froid 是现在的天气块。mis 是 mettre 的过去分词。",
  "noteEn": "il fait froid is the weather chunk. mis is the participle of mettre.",
  "listen": {
   "answer": "winter",
   "options": [
    {
     "id": "winter",
     "zh": "今天很冷，我穿了大衣",
     "en": "it's cold so I put a coat on"
    },
    {
     "id": "hot",
     "zh": "今天很热",
     "en": "it's hot"
    },
    {
     "id": "coat_only",
     "zh": "大衣在椅子上",
     "en": "the coat is on the chair"
    }
   ]
  },
  "produce": {
   "accept": [
    "Il fait froid, alors j'ai mis mon manteau"
   ]
  }
 },
 {
  "id": "lettre_envoyee",
  "grammar": "passive",
  "band": "B1",
  "speaker": "neutral",
  "fr": "La lettre a été envoyée.",
  "zh": "信被寄出了。",
  "en": "The letter was sent.",
  "noteZh": "lettre 阴性 → envoyée。être 用 passé composé：a été。",
  "noteEn": "lettre feminine → envoyée.",
  "listen": {
   "answer": "agree_pass",
   "options": [
    {
     "id": "agree_pass",
     "zh": "信被寄出了（阴性配合）",
     "en": "the letter was sent (feminine agreement)"
    },
    {
     "id": "no_agr",
     "zh": "寄出但过去分词不配合",
     "en": "sent with no agreement"
    },
    {
     "id": "actif",
     "zh": "我寄了信",
     "en": "I sent the letter"
    }
   ]
  },
  "produce": {
   "accept": [
    "La lettre a été envoyée"
   ]
  }
 },
 {
  "id": "rue_ou",
  "grammar": "dont",
  "band": "B1",
  "speaker": "noe",
  "fr": "La rue où j'habite est calme.",
  "zh": "我住的那条街很安静。",
  "en": "The street where I live is quiet.",
  "noteZh": "地方可以用 où。dont 是 de 的关系词，不要混。",
  "noteEn": "A place can use où. dont is for de, don't mix them.",
  "listen": {
   "answer": "dont2",
   "options": [
    {
     "id": "dont2",
     "zh": "我住的那条街",
     "en": "the street I live on"
    },
    {
     "id": "que",
     "zh": "我喜欢的街",
     "en": "the street I like"
    },
    {
     "id": "ou_only",
     "zh": "où 才合法",
     "en": "only où is allowed"
    }
   ]
  },
  "produce": {
   "accept": [
    "La rue où j'habite est calme"
   ]
  }
 },
 {
  "id": "quand_j_aurai",
  "grammar": "futur-anterieur",
  "band": "B1",
  "speaker": "camille",
  "fr": "Quand j'aurai fini, je t'appellerai.",
  "zh": "等我做完了，我就给你打电话。",
  "en": "When I've finished, I'll call you.",
  "noteZh": "aurai 是 avoir 的简单将来；appellerai 也是简单将来。两个都在将来，先完成的用 futur antérieur。",
  "noteEn": "aurai and appellerai are both future. The one that finishes first takes the futur antérieur.",
  "listen": {
   "answer": "compare_fut",
   "options": [
    {
     "id": "compare_fut",
     "zh": "做完以后我会打电话（将来完成 + 简单将来）",
     "en": "I'll call after it is finished"
    },
    {
     "id": "cond",
     "zh": "我本来会打",
     "en": "I would have called"
    },
    {
     "id": "pc",
     "zh": "我打过了",
     "en": "I called"
    }
   ]
  },
  "produce": {
   "accept": [
    "Quand j'aurai fini, je t'appellerai"
   ]
  }
 },
 {
  "id": "si_pqp",
  "grammar": "cond-passe",
  "band": "B1",
  "speaker": "noe",
  "fr": "Si j'avais su, je serais venu.",
  "zh": "如果我当时知道，我就会来了。",
  "en": "If I had known, I would have come.",
  "noteZh": "si + plus-que-parfait，结果用条件式过去。venu 配合说话人，女性是 venue。",
  "noteEn": "si + plus-que-parfait, result in the conditional past. venue if the speaker is a woman.",
  "listen": {
   "answer": "cond_past2",
   "options": [
    {
     "id": "cond_past2",
     "zh": "如果我知道，我就会来了",
     "en": "if I had known, I would have come"
    },
    {
     "id": "si_pres",
     "zh": "如果我知道（现在）",
     "en": "if I know (now)"
    },
    {
     "id": "pc",
     "zh": "我知道了所以我来了",
     "en": "I knew so I came"
    }
   ]
  },
  "produce": {
   "accept": [
    "Si j'avais su, je serais venu",
    "Si j'avais su, je serais venue"
   ]
  }
 },
 {
  "id": "je_suis_etudiant",
  "grammar": "articles",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je suis étudiant.",
  "zh": "我是学生。（说话人是男性）",
  "en": "I'm a student. (male speaker)",
  "noteZh": "职业、身份在 être 后面常常不加 un/une。女性：étudiante。",
  "noteEn": "After être, a profession often has no article. A woman: étudiante.",
  "listen": {
   "answer": "articles",
   "options": [
    {
     "id": "articles",
     "zh": "我是学生（职业不用冠词）",
     "en": "I'm a student (no article for a profession)"
    },
    {
     "id": "un",
     "zh": "un étudiant 也可以但这里职业介绍常省略",
     "en": "with un"
    },
    {
     "id": "le",
     "zh": "le étudiant",
     "en": "le étudiant"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je suis étudiant",
    "Je suis étudiante"
   ]
  }
 },
 {
  "id": "nous_finissons",
  "grammar": "present",
  "band": "A2",
  "speaker": "camille",
  "fr": "Nous finissons à six heures.",
  "zh": "我们六点结束。",
  "en": "We finish at six.",
  "noteZh": "nous 的现在时结尾 -ons。finir 要双 s：finissons。",
  "noteEn": "nous present ends in -ons. finir doubles the s.",
  "listen": {
   "answer": "present_end",
   "options": [
    {
     "id": "present_end",
     "zh": "我们完成（-ons）",
     "en": "we finish (-ons)"
    },
    {
     "id": "je",
     "zh": "我完成（-e）",
     "en": "I finish"
    },
    {
     "id": "ils",
     "zh": "他们完成（-ent）",
     "en": "they finish"
    }
   ]
  },
  "produce": {
   "accept": [
    "Nous finissons à six heures"
   ]
  }
 },
 {
  "id": "ils_habitent",
  "grammar": "present",
  "band": "A2",
  "speaker": "noe",
  "fr": "Ils habitent ici.",
  "zh": "他们住在这里。",
  "en": "They live here.",
  "noteZh": "-ent 通常不发音。别因为写了 ent 就多读一个音节。",
  "noteEn": "-ent is usually silent.",
  "listen": {
   "answer": "present_ils",
   "options": [
    {
     "id": "present_ils",
     "zh": "他们住在这里（-ent 不发音）",
     "en": "they live here"
    },
    {
     "id": "il",
     "zh": "他住",
     "en": "he lives"
    },
    {
     "id": "nous",
     "zh": "我们住",
     "en": "we live"
    }
   ]
  },
  "produce": {
   "accept": [
    "Ils habitent ici"
   ]
  }
 },
 {
  "id": "tu_es_nouveau",
  "grammar": "present",
  "band": "A2",
  "speaker": "camille",
  "fr": "Tu es nouveau ici ?",
  "zh": "你是新来的吗？",
  "en": "Are you new here?",
  "noteZh": "être 的 tu 是 es。女性：nouvelle。",
  "noteEn": "tu of être is es. A woman: nouvelle.",
  "listen": {
   "answer": "tu_es",
   "options": [
    {
     "id": "tu_es",
     "zh": "你是新来的",
     "en": "you're new"
    },
    {
     "id": "tu_as",
     "zh": "你有",
     "en": "you have"
    },
    {
     "id": "tu_vas",
     "zh": "你去",
     "en": "you go"
    }
   ]
  },
  "produce": {
   "accept": [
    "Tu es nouveau ici",
    "Tu es nouveau ici ?",
    "Tu es nouvelle ici",
    "Tu es nouvelle ici ?"
   ]
  }
 },
 {
  "id": "jai_pas_compris",
  "grammar": "negation",
  "band": "A2",
  "speaker": "noe",
  "fr": "Je n'ai pas compris.",
  "zh": "我没听懂。",
  "en": "I didn't understand.",
  "noteZh": "passé composé 的否定把 ne…pas 放在助动词两边：n'ai pas compris。不是 ne pas compris。",
  "noteEn": "ne…pas wraps the auxiliary: n'ai pas compris. Not ne pas compris.",
  "listen": {
   "answer": "neg_pc",
   "options": [
    {
     "id": "neg_pc",
     "zh": "我没听懂",
     "en": "I didn't understand"
    },
    {
     "id": "pc",
     "zh": "我听懂了",
     "en": "I understood"
    },
    {
     "id": "neg_inf",
     "zh": "不去理解",
     "en": "not to understand"
    }
   ]
  },
  "produce": {
   "accept": [
    "Je n'ai pas compris"
   ]
  }
 },
 {
  "id": "pouvez_mindiquer",
  "grammar": "directions",
  "band": "B1",
  "speaker": "neutral",
  "fr": "Vous pouvez m'indiquer la station ?",
  "zh": "您能告诉我地铁站在哪吗？",
  "en": "Could you show me the station?",
  "noteZh": "m' 在原形 indiquer 前面。对路人用 vous。",
  "noteEn": "m' before the infinitive. vous for a stranger.",
  "listen": {
   "answer": "polite_dir",
   "options": [
    {
     "id": "polite_dir",
     "zh": "请问地铁站往哪边",
     "en": "which way is the metro, politely"
    },
    {
     "id": "tu",
     "zh": "对朋友的问法",
     "en": "the tu version"
    },
    {
     "id": "where_key",
     "zh": "钥匙在哪",
     "en": "where are the keys"
    }
   ]
  },
  "produce": {
   "accept": [
    "Vous pouvez m'indiquer la station",
    "Vous pouvez m'indiquer la station ?"
   ]
  }
 }
];
  var byId = {};
  ITEMS.forEach(function (it) { byId[it.id] = it; });
  function modalities(it) {
    var m = ['listening'];
    m.push(it.cloze ? 'reading' : 'reading');
    if ((it.produce && it.produce.accept && it.produce.accept.length) || (it.cloze && it.cloze.accept && it.cloze.accept.length)) m.push('production');
    return m;
  }
  var api = { ITEMS: ITEMS, byId: byId, modalities: modalities, version: 'deck-2026-10-08' };
  root.A411 = root.A411 || {};
  root.A411.Deck = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
