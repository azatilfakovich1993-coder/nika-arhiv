"use strict";

/* Слушающий бот. Работает, пока открыт терминал: закрыли окно — бот замолчал.
   Так и должно быть на время отладки. Чтобы он жил постоянно, его ставят
   на сервер.

   Остановить: Ctrl+C в терминале.

   Тексты отчётов берутся из otchet.js — правьте их там же, где правили. */

var env = require("./env.js");
var TEXTS = require("./texty.js")();

var cfg = env.read();
if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }

var API = "https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/";

var PODSKAZKA = TEXTS.help;

/* Какая команда какой текст открывает. Добавить свою команду — допишите
   строку сюда и такой же кусок в texts.txt. */
var KOMANDY = {
  "/start":   TEXTS.start,
  "/help":    TEXTS.help,
  "/otchet":  TEXTS.den,
  "/nedelya": TEXTS.nedelya,
  "/srochno": TEXTS.srochno
};

function poslat(chatId, text){
  return fetch(API + "sendMessage", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  }).then(function(r){ return r.json(); });
}

/* Телеграм отдаёт новые сообщения по запросу. Просим его подождать до 30
   секунд, если сообщений нет, — так не приходится дёргать его без конца.
   offset — с какого сообщения продолжать: без него одно и то же придёт снова. */
var offset = 0;
var zhiv = true;

function slushat(){
  if(!zhiv) return;
  fetch(API + "getUpdates?timeout=30&offset=" + offset)
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(!d.ok){
        console.log("Телеграм отказал: " + (d.description || "причина не названа"));
        return;
      }
      (d.result || []).forEach(function(u){
        offset = u.update_id + 1;
        var m = u.message;
        if(!m || !m.text) return;

        // Команда может прийти с именем бота: /otchet@moy_bot
        var cmd = m.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
        var kto = [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(" ");
        var otvet = KOMANDY[cmd] || PODSKAZKA;

        console.log(new Date().toLocaleTimeString("ru-RU") + "  " + (kto || m.chat.id) + ": " + m.text);
        poslat(m.chat.id, otvet).catch(function(e){
          console.log("Не смог ответить: " + e.message);
        });
      });
    })
    .catch(function(e){
      console.log("Связь пропала: " + e.message + ". Пробую снова через 5 секунд.");
      return new Promise(function(res){ setTimeout(res, 5000); });
    })
    .then(slushat);
}

process.on("SIGINT", function(){
  zhiv = false;
  console.log("\nБот остановлен.");
  process.exit(0);
});

console.log("Бот слушает. Пишите ему в Телеграме.");
console.log("Остановить — Ctrl+C.");
slushat();
