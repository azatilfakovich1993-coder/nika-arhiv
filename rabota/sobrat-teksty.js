"use strict";

/* Собирает все тексты отчётов в один файл для бота, живущего на сайте.
   PHP не умеет запускать наш разбор, поэтому тексты готовим заранее здесь,
   а он просто их отдаёт.

   Запуск: node sobrat-teksty.js
   Пишет: server/bot-texts.txt

   Порядок работы такой:
     node dannye.js        — пересчитать разбор
     node razobrat-ai.js   — если просит
     node sobrat-teksty.js — обновить тексты для сайта
     залить server/bot-texts.txt на сайт */

var fs = require("fs");
var path = require("path");
var S = require("./svodka.js");

var tovary = S.tovary();

var PRIVET =
  "Здравствуйте! Я разбираю отзывы с Озона на товары Ники.\n" +
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

var kuski = [];

function dobavit(imya, text){
  kuski.push("[" + imya + "]");
  kuski.push(text);
  kuski.push("");
}

kuski.push("Тексты отчётов для бота на сайте. Собраны node sobrat-teksty.js");
kuski.push("Правятся не здесь, а пересборкой: цифры считаются из разбора.");
kuski.push("");

dobavit("start", PRIVET);
dobavit("help", PODSKAZKA);
dobavit("otchet", S.svodka());
dobavit("ochered", S.ochered());
dobavit("srochno", S.srochno());
dobavit("tovary", "Выберите товар:");

/* Названия товаров для кнопок: имя и на какой кусок ведёт. */
var knopki = tovary.map(function(t){
  var imya = t.name.length > 38 ? t.name.slice(0, 38) + "…" : t.name;
  return imya + "  · " + t.vsego + " | t" + t.i;
});
dobavit("knopki", knopki.join("\n"));

tovary.forEach(function(t){
  dobavit("t" + t.i, S.poTovaru(t.i));
});

var dst = path.join(__dirname, "server", "bot-texts.txt");
fs.writeFileSync(dst, kuski.join("\n"), "utf8");

/* Те же тексты — для бота на Supabase. Там нет файлов рядом с программой,
   поэтому кладём их прямо в код: выкладывается одной командой вместе
   с функцией. */
var dlyaSupabase = {};
var imya = null, buf = [];
kuski.join("\n").split("\n").forEach(function(line){
  var m = line.match(/^\[([a-zA-Z0-9_]+)\]$/);
  if(m){
    if(imya) dlyaSupabase[imya] = buf.join("\n").trim();
    imya = m[1];
    buf = [];
    return;
  }
  if(imya) buf.push(line);
});
if(imya) dlyaSupabase[imya] = buf.join("\n").trim();

var ts = path.join(__dirname, "supabase", "functions", "bot", "teksty.ts");
if(fs.existsSync(path.dirname(ts))){
  fs.writeFileSync(ts,
    "// Собрано командой node sobrat-teksty.js. Руками не править.\n" +
    "export const TEKSTY: Record<string, string> = " +
    JSON.stringify(dlyaSupabase, null, 1) + ";\n", "utf8");
  console.log("Тексты для Supabase: supabase/functions/bot/teksty.ts");
}

console.log("Собрано кусков: " + (6 + tovary.length));
console.log("Товаров: " + tovary.length);
console.log("Записано в server/bot-texts.txt (" + Math.round(fs.statSync(dst).size / 1024) + " КБ)");
console.log("");
console.log("Теперь залейте этот файл на сайт, туда же где bot.php.");
