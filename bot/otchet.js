"use strict";

/* Отправляет отчёт себе в Телеграм — быстрый способ посмотреть, как выглядит.
   Запуск:
     node otchet.js            — дневная сводка
     node otchet.js srochno    — срочный сигнал про партию
     node otchet.js nedelya    — недельный отчёт

   Сами тексты лежат в файле texts.txt — правьте их там.
   ЦИФРЫ ТАМ ВЫДУМАНЫ: это макет формата. Настоящие встанут после разбора. */

var env = require("./env.js");
var TEXTS = require("./texty.js")();

var cfg = env.read();
if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }
if(!cfg.CHAT_ID){ console.log("В .env пусто в строке CHAT_ID. Запустите сначала: node kto-ya.js"); process.exit(1); }

var vid = (process.argv[2] || "den").toLowerCase();
var text = TEXTS[vid];
if(!text){
  console.log("Не знаю такой отчёт. В texts.txt есть: " + Object.keys(TEXTS).join(", "));
  process.exit(1);
}

fetch("https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/sendMessage", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    chat_id: cfg.CHAT_ID,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  })
})
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok) console.log("Отправлено. Смотрите Телеграм.");
    else console.log("Телеграм отказал: " + (d.description || "причина не названа"));
  })
  .catch(function(e){
    console.log("Не получилось достучаться до Телеграма: " + e.message);
    console.log("Если сеть закрыта — включите VPN и попробуйте снова.");
  });
