"use strict";

/* Показывает, как Телеграм видит вашего бота: куда он стучится, доходит ли,
   и не жалуется ли на ошибки. Первое, что стоит запустить, если бот молчит. */

var env = require("./env.js");
var cfg = env.read();
if(!cfg.BOT_TOKEN){ console.log("В .env пусто в строке BOT_TOKEN."); process.exit(1); }

var API = "https://api.telegram.org/bot" + cfg.BOT_TOKEN + "/";

fetch(API + "getMe")
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(d.ok) console.log("Бот: @" + d.result.username + " (" + d.result.first_name + ")");
    else console.log("Телеграм не признал токен: " + d.description);
    return fetch(API + "getWebhookInfo");
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(!d.ok){ console.log("Не смог узнать про подключение: " + d.description); return; }
    var w = d.result;
    console.log("");
    if(!w.url){
      console.log("Постоянное подключение НЕ настроено.");
      console.log("Бот отвечает только когда у вас запущен node bot.js.");
      return;
    }
    console.log("Телеграм стучится сюда: " + w.url);
    console.log("Ждут ответа сообщений: " + (w.pending_update_count || 0));
    if(w.last_error_message){
      console.log("");
      console.log("ПОСЛЕДНЯЯ ОШИБКА: " + w.last_error_message);
      console.log("Когда: " + new Date(w.last_error_date * 1000).toLocaleString("ru-RU"));
      console.log("Обычно это значит, что файл на сайте не найден или отвечает не то.");
    } else {
      console.log("Ошибок нет.");
    }
  })
  .catch(function(e){
    console.log("Не получилось достучаться до Телеграма: " + e.message);
  });
