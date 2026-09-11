"use strict";

/* Складывает разбор для браузера: ту же самую программу, что работает
   у нас, но в виде одного файла для страницы.

   Зачем: чтобы человек мог вставить СВОИ отзывы прямо на странице и увидеть
   разбор за секунду, никому не отдавая ни ключей, ни данных. Всё считается
   у него в браузере и никуда не уходит.

   Нейросетевой слой сюда не входит намеренно: обратиться к GigaChat из
   браузера нельзя, Сбер такие запросы не принимает. Да и не нужно — правила
   разбирают большую часть, а спорное честно помечается.

   Запуск: node sobrat-brauzer.js
   Пишет:  stranica/razbor-brauzer.js */

var fs = require("fs");
var path = require("path");

function vzyat(imya){
  var s = fs.readFileSync(path.join(__dirname, imya), "utf8");
  // Убираем строки вида module.exports — в браузере их нет.
  return s.replace(/^\s*if\s*\(typeof module[^\n]*\n/gm, "")
          .replace(/^\s*module\.exports\s*=[\s\S]*?;\s*$/gm, "");
}

var vyhod =
  "/* Собрано командой node sobrat-brauzer.js. Руками не править.\n" +
  "   Здесь та же программа разбора, что работает у нас, но для браузера:\n" +
  "   человек вставляет свои отзывы и видит разбор, ничего никуда не отправляя. */\n" +
  "(function(){\n" +
  "\"use strict\";\n\n" +
  "/* ===== вытаскивание отзывов из копипасты со страницы Озона ===== */\n" +
  vzyat("razobrat.js")
    .replace(/^var fs = require[^\n]*\n/m, "")
    .replace(/^var path = require[^\n]*\n/m, "")
    // хвост с чтением файла и печатью в консоль браузеру не нужен
    .replace(/var file = process\.argv[\s\S]*$/m, "") +
  "\n/* ===== правила разбора ===== */\n" +
  vzyat("pravila.js") +
  "\n" +
  "window.RAZBOR_BRAUZER = {\n" +
  "  razobrat: razobrat,\n" +
  "  classify: classify,\n" +
  "  CATS: CATS,\n" +
  "  catById: catById,\n" +
  "  primety: primety,\n" +
  "  glavnye: glavnye\n" +
  "};\n" +
  "})();\n";

var dst = path.join(__dirname, "stranica", "razbor-brauzer.js");
fs.writeFileSync(dst, vyhod, "utf8");
console.log("Записано в stranica/razbor-brauzer.js (" +
            Math.round(fs.statSync(dst).size / 1024) + " КБ)");
