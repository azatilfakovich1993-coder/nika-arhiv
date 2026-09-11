"use strict";

/* Достаёт отзывы из того, что скопировано со страницы Озона прямо мышкой.
   Вместе с отзывами туда попадает реклама «Рекомендуем также», кнопки
   «Вам помог этот отзыв?» и прочий мусор площадки — всё это выбрасываем.

   Запуск: node razobrat.js syrye/obrazec-1.txt          — показать разбор
           node razobrat.js syrye/obrazec-1.txt otzyvy.json — ещё и сохранить */

var fs = require("fs");
var path = require("path");

var MESYACY = ["января","февраля","марта","апреля","мая","июня",
               "июля","августа","сентября","октября","ноября","декабря"];

var RE_DATA = /^(?:изменен\s+)?(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s*$/i;
// У сушилок характеристики начинаются с «Длина, см:», у гладильных досок —
// с «Название цвета:». Оба вида должны опознаваться.
var RE_PARAM = /^(Длина|Ширина|Высота|Количество|Цвет|Название|Объём|Размер|Материал)[^:]*:/i;
/* Оценки по пунктам Озон выводит без пробела после двоеточия:
   «Устойчивость:Средняя», «Дизайн:Плохой». Перечислять их поимённо
   бессмысленно — у каждой категории товаров свои. Ловим по виду строки. */
var RE_OCENKA = /^[А-ЯЁ][а-яё]+(?:\s[а-яё]+)?:[А-ЯЁа-яё]+$/;
/* Мусор площадки: кнопки, счётчики комментариев, а ещё длительность
   приложенных видео («00:30») и отметка «+1» под фотографиями — они идут
   отдельными строками и без этого влипают в текст отзыва. */
var RE_MUSOR = /^(Да|Нет)\s+\d+\s*$|^\d+\s+комментари|^Вам помог|^Рекомендуем также|^Читать полностью|^\d{1,2}:\d{2}$|^\+\d+$|^Отзыв на доставку$/i;

function razobrat(text){
  var chunks = text.split(/Вам помог этот отзыв\?/);
  var otzyvy = [];

  chunks.forEach(function(chunk){
    var lines = chunk.split(/\r?\n/).map(function(s){ return s.trim(); });

    // Последняя строка с характеристиками — начало настоящего отзыва.
    // Всё, что выше неё, — хвост предыдущего отзыва и реклама.
    var iParam = -1;
    for(var i = lines.length - 1; i >= 0; i--){
      if(RE_PARAM.test(lines[i])){ iParam = i; break; }
    }
    if(iParam < 0) return;

    // Дата — ближайшая строка-дата выше характеристик.
    var data = null, iData = -1;
    for(var j = iParam - 1; j >= 0 && j >= iParam - 3; j--){
      var m = lines[j].match(RE_DATA);
      if(m){
        var mes = MESYACY.indexOf(m[2].toLowerCase().replace("ё","е").replace("е","е"));
        if(mes < 0) mes = MESYACY.findIndex(function(x){ return x.indexOf(m[2].toLowerCase().slice(0,4)) === 0; });
        if(mes >= 0){
          data = m[3] + "-" + String(mes + 1).padStart(2, "0") + "-" + m[1].padStart(2, "0");
          iData = j;
        }
        break;
      }
    }

    // Характеристики товара — по ним потом видно, какая это модификация.
    var param = lines[iParam];

    // Текст: всё после характеристик и после строк с оценками по пунктам.
    var telo = [];
    for(var k = iParam + 1; k < lines.length; k++){
      var s = lines[k];
      if(!s) continue;
      if(RE_OCENKA.test(s)) continue;
      if(RE_MUSOR.test(s)) continue;
      telo.push(s);
    }
    var txt = telo.join(" ").replace(/\s*\.\.\.\s*$/, "").trim();
    if(!txt) return;

    otzyvy.push({
      date: data,
      param: param,
      text: txt
    });
  });

  return otzyvy;
}

var file = process.argv[2];
if(!file){ console.log("Укажите файл: node razobrat.js syrye/obrazec-1.txt"); process.exit(1); }

var syroe = fs.readFileSync(path.resolve(file), "utf8");
var otzyvy = razobrat(syroe);

console.log("Из файла " + path.basename(file) + " достал отзывов: " + otzyvy.length);
console.log("");
otzyvy.forEach(function(o, i){
  var korotko = o.text.length > 96 ? o.text.slice(0, 96) + "…" : o.text;
  console.log(String(i + 1).padStart(3) + ". " + (o.date || "без даты") + "  " + korotko);
});

if(process.argv[3]){
  fs.writeFileSync(path.resolve(process.argv[3]), JSON.stringify(otzyvy, null, 1), "utf8");
  console.log("");
  console.log("Сохранено в " + process.argv[3]);
}
