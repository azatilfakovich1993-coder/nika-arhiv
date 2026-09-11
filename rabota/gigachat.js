"use strict";

/* Разговор с GigaChat.

   Два шага: сначала меняем ключ авторизации на временный пропуск (он живёт
   полчаса), потом уже шлём вопросы. Пропуск держим в памяти и заново не просим,
   пока не истёк.

   Про сертификат: сервер Сбера подписан корневым сертификатом Минцифры,
   которого Node не знает, и обычный запрос обрывается. Поэтому берём
   сертификат из папки sert и передаём его прямо в запрос. Ничего прописывать
   перед запуском не нужно. Файл скачан с gu-st.ru, выдан Минцифры,
   годен до 2032 года. */

var https = require("https");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var env = require("./env.js");

var SERT = path.join(__dirname, "sert", "russian_trusted_root_ca.cer");
var ca = fs.existsSync(SERT) ? fs.readFileSync(SERT) : undefined;

var propusk = null;
var godenDo = 0;

function cfg(){
  var c = env.read();
  if(!c.GIGACHAT_KEY){
    console.log("В файле .env пусто в строке GIGACHAT_KEY.");
    console.log("Возьмите «Ключ авторизации» в личном кабинете GigaChat и вставьте туда.");
    process.exit(1);
  }
  return c;
}

/* Обычный запрос по сети, но со своим сертификатом. */
function zapros(adres, opts, telo){
  return new Promise(function(ok, plohо){
    var u = new URL(adres);
    var r = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
      ca: ca,
      timeout: 120000
    }, function(res){
      var kuski = [];
      res.on("data", function(d){ kuski.push(d); });
      res.on("end", function(){
        var text = Buffer.concat(kuski).toString("utf8");
        var body;
        try { body = JSON.parse(text); } catch(e){ body = {raw: text}; }
        ok({status: res.statusCode, body: body});
      });
    });
    r.on("timeout", function(){ r.destroy(new Error("сервер не ответил за две минуты")); });
    r.on("error", function(e){
      if(e.code === "SELF_SIGNED_CERT_IN_CHAIN" || e.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"){
        plohо(new Error("не принят сертификат. Проверьте, что файл " +
                        "sert/russian_trusted_root_ca.cer на месте"));
      } else {
        plohо(e);
      }
    });
    if(telo) r.write(telo);
    r.end();
  });
}

function poluchitPropusk(){
  if(propusk && Date.now() < godenDo - 60000) return Promise.resolve(propusk);

  var c = cfg();
  var telo = "scope=" + (c.GIGACHAT_SCOPE || "GIGACHAT_API_PERS");

  return zapros("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": crypto.randomUUID(),
      "Authorization": "Basic " + c.GIGACHAT_KEY,
      "Content-Length": Buffer.byteLength(telo)
    }
  }, telo).then(function(r){
    if(r.status !== 200 || !r.body.access_token){
      throw new Error("Сбер не выдал пропуск (" + r.status + "): " +
                      (r.body.message || r.body.error_description || JSON.stringify(r.body).slice(0, 160)));
    }
    propusk = r.body.access_token;
    godenDo = r.body.expires_at || (Date.now() + 25 * 60000);
    return propusk;
  });
}

/* Один вопрос модели. Возвращает текст ответа и сколько потрачено токенов.
   GigaChat — самая простая и дешёвая, её бесплатная квота самая большая. */
function sprosit(vopros, opts){
  opts = opts || {};
  return poluchitPropusk().then(function(p){
    var telo = JSON.stringify({
      model: opts.model || "GigaChat",
      temperature: opts.temperature != null ? opts.temperature : 0.1,
      max_tokens: opts.max_tokens || 1500,
      messages: [
        {role: "system", content: opts.rol ||
          "Ты разбираешь отзывы покупателей. Отвечай строго тем, о чём просят, без вступлений и пояснений."},
        {role: "user", content: vopros}
      ]
    });

    return zapros("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Bearer " + p,
        "Content-Length": Buffer.byteLength(telo)
      }
    }, telo);
  }).then(function(r){
    if(r.status !== 200){
      throw new Error("GigaChat отказал (" + r.status + "): " +
                      (r.body.message || JSON.stringify(r.body).slice(0, 200)));
    }
    var d = r.body;
    var t = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return {
      text: t || "",
      tokenov: (d.usage && d.usage.total_tokens) || 0
    };
  });
}

module.exports = {sprosit: sprosit, poluchitPropusk: poluchitPropusk};
