"use strict";

/* Отправляет отчёт себе в Телеграм одним разом — быстрый способ посмотреть,
   как он выглядит на телефоне, не запуская бота.

   Запуск:
     node otchet.js            — что нашлось в отзывах
     node otchet.js ochered    — чем заняться первым
     node otchet.js srochno    — что повторяется в свежих отзывах
     node otchet.js vse        — все три подряд

   Числа берутся из настоящего разбора: stranica/razbor.js.
   Сначала должен быть запущен node dannye.js. */

var env = require("./env.js");
var S = require("./svodka.js");

var cfg = env.read();
if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }
if(!cfg.CHAT_ID){ console.log("В .env пусто в строке CHAT_ID. Запустите сначала: node kto-ya.js"); process.exit(1); }

var VIDY = {
  svodka:  S.svodka,
  ochered: S.ochered,
  srochno: S.srochno
};

var vid = (process.argv[2] || "svodka").toLowerCase();
var ochered = vid === "vse" ? ["svodka", "ochered", "srochno"] : [vid];

if(ochered.some(function(v){ return !VIDY[v]; })){
  console.log("Не знаю такой отчёт. Бывают: svodka, ochered, srochno, vse");
  process.exit(1);
}

function poslat(text){
  return fetch("https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      chat_id: cfg.CHAT_ID,
      text: text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  }).then(function(r){ return r.json(); });
}

function shag(i){
  if(i >= ochered.length){ console.log("Готово. Смотрите Телеграм."); return; }
  var v = ochered[i];
  return poslat(VIDY[v]())
    .then(function(d){
      if(d.ok) console.log("Отправлено: " + v);
      else console.log("Телеграм отказал на «" + v + "»: " + (d.description || "причина не названа"));
      return shag(i + 1);
    })
    .catch(function(e){
      console.log("Не получилось достучаться до Телеграма: " + e.message);
      console.log("Если сеть закрыта — включите VPN и попробуйте снова.");
    });
}

shag(0);
