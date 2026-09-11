"use strict";

/* Слушающий бот. Работает, пока открыт терминал: закрыли окно — бот замолчал.
   Так и должно быть на время отладки. Чтобы он жил постоянно, его ставят
   на сервер.

   Остановить: Ctrl+C в терминале.

   Тексты отчётов берутся из otchet.js — правьте их там же, где правили. */

var env = require("./env.js");
var TEXTS = require("./texty.js")();
var S = require("./svodka.js");

var cfg = env.read();
if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }

var API = "https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/";

var PRIVET =
  "Здравствуйте! Я разбираю отзывы с Озона.\n" +
  "\n" +
  "<b>Что умею</b>\n" +
  "/tovary — выбрать товар: что срочно, что важно\n" +
  "/otchet — общая сводка по всем товарам\n" +
  "/ochered — чем заняться первым\n" +
  "/srochno — что повторяется в свежих отзывах";

var PODSKAZKA =
  "Я понимаю такие команды:\n" +
  "/tovary — выбрать товар\n" +
  "/otchet — общая сводка\n" +
  "/ochered — чем заняться первым\n" +
  "/srochno — что повторяется";

/* Тексты собираются из настоящего разбора в момент запроса, а не хранятся
   готовыми: перезапустили разбор — бот сразу отвечает новыми числами.
   Поэтому здесь функции, а не строки. */
var KOMANDY = {
  "/start":   function(){ return PRIVET; },
  "/help":    function(){ return PODSKAZKA; },
  "/otchet":  S.svodka,
  "/ochered": S.ochered,
  "/srochno": S.srochno,
  "/tovary":  function(){ return "Выберите товар:"; }
};

/* Кнопки с товарами. Нажатие приходит от Телеграма отдельным видом сообщения,
   поэтому его обрабатываем наравне с командами. */
function knopkiTovarov(){
  return {
    inline_keyboard: S.tovary().map(function(t){
      var imya = t.name.length > 38 ? t.name.slice(0, 38) + "…" : t.name;
      return [{text: imya + "  · " + t.vsego, callback_data: "t" + t.i}];
    })
  };
}

function poslat(chatId, text, knopki){
  var telo = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if(knopki) telo.reply_markup = knopki;
  return fetch(API + "sendMessage", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(telo)
  }).then(function(r){ return r.json(); });
}

/* На нажатие кнопки Телеграм ждёт ответ, иначе у человека на кнопке
   бесконечно крутятся часики. */
function knopkaPrinyata(id){
  return fetch(API + "answerCallbackQuery", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({callback_query_id: id})
  }).catch(function(){});
}

/* Телеграм отдаёт новые сообщения по запросу. Просим его подождать до 30
   секунд, если сообщений нет, — так не приходится дёргать его без конца.
   offset — с какого сообщения продолжать: без него одно и то же придёт снова. */
var offset = 0;
var zhiv = true;

function chas(){ return new Date().toLocaleTimeString("ru-RU"); }

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

        // Нажали кнопку с товаром.
        if(u.callback_query){
          var q = u.callback_query;
          knopkaPrinyata(q.id);
          var nomer = parseInt(String(q.data).replace(/^t/, ""), 10);
          var kto2 = q.from && q.from.first_name;
          console.log(chas() + "  " + (kto2 || "?") + ": кнопка товара " + nomer);
          var text2;
          try { text2 = S.poTovaru(nomer); }
          catch(e){ text2 = "Не смог собрать отчёт: " + e.message; }
          poslat(q.message.chat.id, text2, knopkiTovarov()).catch(function(e){
            console.log("Не смог ответить: " + e.message);
          });
          return;
        }

        var m = u.message;
        if(!m || !m.text) return;

        // Команда может прийти с именем бота: /otchet@moy_bot
        var cmd = m.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
        var kto = [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(" ");
        var otvet;
        try {
          otvet = KOMANDY[cmd] ? KOMANDY[cmd]() : PODSKAZKA;
        } catch(e){
          otvet = "Не смог собрать отчёт: " + e.message;
          console.log("Ошибка при сборке отчёта: " + e.message);
        }

        console.log(chas() + "  " + (kto || m.chat.id) + ": " + m.text);
        // Кнопки показываем там, где они к месту: выбор товара и приветствие.
        var knopki = (cmd === "/tovary" || cmd === "/start") ? knopkiTovarov() : null;
        poslat(m.chat.id, otvet, knopki).catch(function(e){
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
