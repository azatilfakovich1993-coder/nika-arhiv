"use strict";

/* Говорит Телеграму: «пиши боту вот на этот адрес».
   После этого бот работает всегда, компьютер держать включённым не нужно.

   Запуск:  node podklyuchit.js
   Отменить: node podklyuchit.js otmenit   (вернётся к работе через node bot.js)

   Перед запуском файлы bot.php, bot-config.php и bot-texts.txt должны уже
   лежать на сайте — иначе Телеграм будет стучаться в пустоту. */

var env = require("./env.js");
var cfg = env.read();

if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }
if(!cfg.WEBHOOK_URL || !cfg.WEBHOOK_SECRET){
  console.log("В .env должны быть заполнены WEBHOOK_URL и WEBHOOK_SECRET.");
  process.exit(1);
}

var API = "https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/";
var otmena = (process.argv[2] || "").toLowerCase() === "otmenit";

var adres = otmena
  ? API + "deleteWebhook?drop_pending_updates=false"
  : API + "setWebhook?url=" + encodeURIComponent(cfg.WEBHOOK_URL) +
    "&secret_token=" + encodeURIComponent(cfg.WEBHOOK_SECRET) +
    "&allowed_updates=" + encodeURIComponent('["message"]');

fetch(adres)
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(!d.ok){
      console.log("Телеграм отказал: " + (d.description || "причина не названа"));
      return;
    }
    if(otmena){
      console.log("Отключено. Теперь бот отвечает только когда запущен node bot.js.");
      return;
    }
    console.log("Подключено. Телеграм будет стучаться сюда:");
    console.log("  " + cfg.WEBHOOK_URL);
    console.log("Бот работает всегда, компьютер можно выключать.");
    console.log("");
    console.log("Проверить, как идут дела: node kak-dela.js");
  })
  .catch(function(e){
    console.log("Не получилось достучаться до Телеграма: " + e.message);
  });
