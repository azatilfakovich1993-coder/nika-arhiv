"use strict";

/* Считает разбор и складывает готовый результат в файл, который читает страница.
   Страница сама ничего не считает: она показывает уже посчитанное.

   Запуск: node dannye.js
   Читает всё из папки syrye, пишет stranica/razbor.json */

var fs = require("fs");
var path = require("path");
var cp = require("child_process");
var P = require("./pravila.js");

/* Какие файлы к какому товару относятся. Когда появятся отзывы на другие
   товары — дописать сюда строку, остальное подстроится само. */
var TOVARY = [
  {
    id: "sb1m",
    name: "Сушилка напольная для белья Nika СБ1М/1 177 см х 53,5 см, серебристая",
    artikul: "СБ1М/1",
    files: ["obrazec-1.txt", "obrazec-2.txt"]
  },
  {
    id: "stella2",
    name: "Гладильная доска Nika Stella-classy 2 (СТК2МП/Ш)",
    artikul: "СТК2МП/Ш",
    files: ["obrazec-3-doska.txt", "obrazec-4-doska.txt"]
  },
  {
    id: "dzm1",
    name: "Доска знаний — мольберт детский двусторонний Nika ДЗМ1/БЖ",
    artikul: "ДЗМ1/БЖ",
    files: ["obrazec-5-molbert.txt", "obrazec-6-molbert.txt"]
  }
];

/* Слова, после которых отзыв поднимается наверх независимо от всего остального.
   Речь о вреде человеку, а не о неудобстве.

   Осторожно с общими оборотами: было слово «чуть не», и похвала
   «и не чуть не пожалела» получала высший приоритет как травма.
   Поэтому только конкретные сочетания. */
var OPASNO = ["порезал","порезал","резал руку","поранил","прищемил","прищемило",
              "травмир","травму","получил травму","ожог","обжег","обожг",
              "чуть не упал","чуть не уронил","чуть не порезал","чуть не обжег",
              "острые края","заусенец на","упала на ногу","упала на ребенка",
              "придавил","защемил"];

/* Ответы нейросети по тем отзывам, что не дались правилам. Файл может
   и отсутствовать — тогда работает только слой правил. */
var AI = {};
var AI_FILE = path.join(__dirname, "stranica", "ai.json");
if(fs.existsSync(AI_FILE)){
  try { AI = JSON.parse(fs.readFileSync(AI_FILE, "utf8")); } catch(e){ AI = {}; }
}

function den(d){ return d ? new Date(d + "T00:00:00Z").getTime() / 86400000 : 0; }

function sobrat(){
  var vse = [];

  TOVARY.forEach(function(t){
    var otzyvy = [];
    t.files.forEach(function(f){
      var src = path.join(__dirname, "syrye", f);
      if(!fs.existsSync(src)) return;
      var tmp = path.join(__dirname, "syrye", "_tmp.json");
      cp.execSync("node " + JSON.stringify(path.join(__dirname, "razobrat.js")) + " " +
                  JSON.stringify(src) + " " + JSON.stringify(tmp), {stdio:"ignore"});
      JSON.parse(fs.readFileSync(tmp, "utf8")).forEach(function(o){ otzyvy.push(o); });
      fs.unlinkSync(tmp);
    });

    // Одинаковый отзыв может попасть из двух кусков — оставляем один.
    var bylo = {};
    otzyvy = otzyvy.filter(function(o){
      var k = o.text.slice(0, 60);
      if(bylo[k]) return false;
      bylo[k] = 1;
      return true;
    });

    // Размер изделия — по нему видно, все модификации или одна.
    otzyvy.forEach(function(o){
      // Модификация товара. У сушилок это длина, у гладильных досок длины
      // нет — тогда берём цвет. Число выхватываем аккуратно: жадный шаблон
      // прихватывал запятую и печатал «164. см».
      var m = o.param.match(/Длина, см:\s*(\d+(?:[.,]\d+)?)/);
      if(m){
        o.razmer = m[1].replace(",", ".") + " см";
      } else {
        var c = o.param.match(/Цвет товара:\s*([^,]+)/);
        o.razmer = c ? c[1].trim() : "не указан";
      }
      var r = P.classify(o);
      o.cat = r.main;
      o.layer = r.layer;
      o.why = r.why;
      o.cats = r.cats;

      // Если этот отзыв уже разобрала нейросеть — берём её ответ.
      // Пометку «разобрала нейросеть» оставляем: видно, за что платили.
      var ai = AI[o.text.slice(0, 80)];
      /* Ответ модели берём, только если он не спорит с правилами. Если правила
         нашли брак, упаковку и цену, а модель отвечает «заказ и доставка» —
         это выдумка. Такой ответ отбрасываем, и отзыв уходит на разбор заново. */
      if(o.layer === "ai" && ai){
        var dopustimo = P.glavnye(o.cats);
        var soglasen = !dopustimo || !dopustimo.length ||
                       dopustimo.indexOf(ai.cat) >= 0 ||
                       ai.cat === "horosh" || ai.cat === "musor";
        if(soglasen){
          o.cat = ai.cat;
          o.aiWhy = ai.why;
          o.razobran = true;
        }
      }
    });

    // Повторяемость: сколько ещё отзывов той же категории по этому товару.
    var skolko = {};
    otzyvy.forEach(function(o){ if(o.cat) skolko[o.cat] = (skolko[o.cat] || 0) + 1; });

    var svezh = Math.max.apply(null, otzyvy.map(function(o){ return den(o.date); }));

    otzyvy.forEach(function(o){
      var t2 = o.text.toLowerCase();
      o.opasno = OPASNO.some(function(w){ return P.hasWord(P.low(t2), w); });

      var c = P.catById(o.cat);
      // Чужая зона (акции, пункт выдачи) в очередь дел не попадает.
      var problema = (o.layer === "ai" && !o.razobran) || (c && c.bad && !c.chuzhoe);

      // Важность. Считается правилами, без нейросети:
      // вред человеку → сколько претензий разом → повторяемость → свежесть.
      var ves = 0;
      if(o.opasno) ves += 1000;
      if(problema) ves += 100;

      // Отзыв, где претензий сразу несколько, — тяжелее одиночной жалобы.
      // Раньше такие падали в хвост: у них нет одной категории, и надбавка
      // за повторяемость до них не доходила.
      var skolkoPretenziy = (o.cats && o.cats.length) ? o.cats.length : (o.cat ? 1 : 0);
      if(problema) ves += skolkoPretenziy * 8;

      // Повторяемость: если про то же самое пишут многие, это уже не случай.
      // Только для претензий: иначе тридцать похвал накручивают вес друг другу
      // и всплывают выше настоящих жалоб.
      if(problema){
        var povtor = 0;
        (o.cats && o.cats.length ? o.cats : [o.cat]).forEach(function(c){
          povtor = Math.max(povtor, skolko[c] || 0);
        });
        ves += povtor * 3;
      }

      var dney = svezh - den(o.date);
      ves += Math.max(0, 14 - dney);
      o.ves = Math.round(ves);
      o.beda = !!problema;
    });

    /* Порядок в очереди.
       1. Сначала претензии, потом похвалы. Иначе вчерашнее «отлично» встанет
          над позавчерашним «пришло сломанным».
       2. Внутри — по дате, свежие первыми. Свежая жалоба важнее старой:
          по ней ещё можно что-то успеть, партия ещё едет.
       3. При одной дате — по важности: опасность, сколько претензий разом,
          повторяемость. */
    otzyvy.sort(function(a, b){
      if(a.beda !== b.beda) return a.beda ? -1 : 1;
      return den(b.date) - den(a.date) || b.ves - a.ves;
    });

    vse.push({
      id: t.id,
      name: t.name,
      artikul: t.artikul,
      vsego: otzyvy.length,
      otzyvy: otzyvy
    });
  });

  return vse;
}

var tovary = sobrat();

var out = {
  sobrano: new Date().toISOString().slice(0, 10),
  cats: P.CATS,
  tovary: tovary
};

var dst = path.join(__dirname, "stranica");
if(!fs.existsSync(dst)) fs.mkdirSync(dst);

/* Пишем данные не отдельным файлом, а куском кода. Так страница открывается
   и с диска двойным щелчком, и с сайта: браузер не пускает файл к файлу,
   если просто положить рядом .json. */
fs.writeFileSync(path.join(dst, "razbor.js"),
                 "var RAZBOR = " + JSON.stringify(out) + ";", "utf8");

var zhdut = 0;
tovary.forEach(function(t){
  var code = t.otzyvy.filter(function(o){ return o.layer === "code"; }).length;
  t.otzyvy.forEach(function(o){ if(o.layer === "ai" && !o.razobran) zhdut++; });
  console.log(t.name + ": " + t.vsego + " отзывов, правилами " + code +
              ", нейросети " + (t.vsego - code));
});
console.log("Записано в stranica/razbor.js");

/* Правил коснулись — и часть отзывов может стать спорной заново. Без этого
   напоминания они молча висят неразобранными и вылезают уже на странице. */
if(zhdut){
  console.log("");
  console.log("ВНИМАНИЕ: " + zhdut + " отзывов ждут нейросеть.");
  console.log("Запустите: node razobrat-ai.js   — и потом node dannye.js ещё раз.");
}
