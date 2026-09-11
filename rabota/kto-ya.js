"use strict";

/* Узнаёт ваш номер в Телеграме и записывает его в .env.
   Перед запуском напишите своему боту любое слово — иначе ему не с чего
   вас узнать: боту нельзя писать первым, пока человек не начал разговор. */

var env = require("./env.js");
var cfg = env.read();

if(!cfg.BOT_TOKEN){
  console.log("В файле .env пусто в строке BOT_TOKEN. Вставьте токен от BotFather.");
  process.exit(1);
}

fetch("https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/getUpdates")
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(!d.ok){
      console.log("Телеграм отказал: " + (d.description || "причина не названа"));
      console.log("Скорее всего токен скопирован не полностью.");
      return;
    }
    var found = null;
    (d.result || []).forEach(function(u){
      var m = u.message || u.edited_message || u.channel_post;
      if(m && m.chat) found = m.chat;
    });
    if(!found){
      console.log("Сообщений от вас нет.");
      console.log("Откройте своего бота в Телеграме, напишите ему любое слово и запустите ещё раз.");
      return;
    }
    env.save("CHAT_ID", String(found.id));
    var name = [found.first_name, found.last_name].filter(Boolean).join(" ");
    console.log("Нашёл: " + (name || found.title || "без имени") +
                (found.username ? " (@" + found.username + ")" : ""));
    console.log("Номер записан в .env. Теперь запускайте: node otchet.js");
  })
  .catch(function(e){
    console.log("Не получилось достучаться до Телеграма: " + e.message);
    console.log("Если сеть закрыта — включите VPN и попробуйте снова.");
  });
