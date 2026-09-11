"use strict";

/* Догоняет нейросетью то, что не осилили правила.
   Берёт только отзывы с пометкой «нужна нейросеть», шлёт их пачками
   и складывает ответы в ai.json. Уже разобранное второй раз не считается —
   поэтому повторный запуск почти бесплатен.

   Запуск: node razobrat-ai.js
           node razobrat-ai.js 5     — разобрать только пять штук, на пробу */

var fs = require("fs");
var path = require("path");
var G = require("./gigachat.js");
var P = require("./pravila.js");

var FILE = path.join(__dirname, "stranica", "ai.json");
var V_PACHKE = 15;          // столько отзывов в одном запросе

/* В список для модели добавлена «musor». Без неё на невнятных отзывах вроде
   «забирала дочка, дома досмотрела» модель возвращала пустой код, и такие
   отзывы зависали неразобранными. Пусть честно говорит, что непонятно. */
var KATALOG = P.CATS.filter(function(c){ return c.bad; })
                    .map(function(c){ return c.id + " — " + c.name + " (чинит: " + c.owner + ")"; })
                    .concat(["horosh — претензий нет, человек доволен",
                             "musor — из отзыва невозможно понять, что именно не так"])
                    .join("\n");

function zagruzit(){
  if(!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch(e){ return {}; }
}

function dannye(){
  var src = fs.readFileSync(path.join(__dirname, "stranica", "razbor.js"), "utf8");
  return JSON.parse(src.replace(/^var RAZBOR = /, "").replace(/;$/, ""));
}

function vopros(pachka){
  /* Если правила уже нашли несколько примет, модель должна выбрать главную
     ИЗ НИХ, а не придумывать свою. Иначе бывает так: правила нашли брак,
     упаковку и цену, а модель отвечает «заказ и доставка» — про которую
     в отзыве вообще ни слова. */
  var spisok = pachka.map(function(o, i){
    var spis = P.glavnye(o.cats);
    var varianty = (spis && spis.length > 1)
      ? " [выбирай только из: " + spis.join(", ") + "]"
      : "";
    return (i + 1) + "." + varianty + " " + o.text.replace(/\s+/g, " ").slice(0, 600);
  }).join("\n");

  return "Ниже отзывы покупателей на товар для дома. В каждом претензий несколько " +
    "или они непонятны по отдельным словам.\n\n" +
    "Для каждого отзыва выбери ГЛАВНУЮ претензию — ту, из-за которой человек " +
    "в основном недоволен. Если претензий нет и человек доволен — ставь horosh, " +
    "не придумывай проблему. Только один код, из этого списка:\n\n" + KATALOG + "\n\n" +
    "Важно: если вещь повреждена и рядом сказано, что упаковки не было или она " +
    "порвана, — это upak, а не brak: изделие пострадало в дороге, а не на заводе.\n\n" +
    "Если у отзыва в квадратных скобках указаны варианты — выбирай строго один " +
    "из них. Другие коды для этого отзыва запрещены.\n\n" +
    "Когда с самим товаром что-то не так — сломан, кривой, не держится — это " +
    "важнее жалобы на цену или на заказ. Цену и заказ выбирай главными только " +
    "если к товару претензий нет.\n\n" +
    "Ответь строго списком, по строке на отзыв, в виде:\n" +
    "номер|код|объяснение\n\n" +
    "В объяснении НЕ повторяй название категории. Напиши своими словами, что " +
    "именно не так, опираясь на слова покупателя, 5–12 слов. Если претензий " +
    "несколько, скажи, почему главной выбрана эта.\n\n" +
    "Пример правильной строки:\n" +
    "3|upak|Прутья погнуты, а упаковкой был только порванный пакет\n\n" +
    "Пример НЕПРАВИЛЬНОЙ строки (так не надо):\n" +
    "3|upak|Упаковка\n\n" +
    "Код обязателен в каждой строке. Если из отзыва не понять, что именно не так, " +
    "ставь musor и напиши в объяснении, чего в отзыве не хватает. " +
    "Пустых кодов быть не должно.\n\n" +
    "Без заголовков, без markdown, без пустых строк.\n\n" +
    "ОТЗЫВЫ:\n" + spisok;
}

function razobrat(otvet, pachka, kuda){
  var strok = 0;
  otvet.split(/\r?\n/).forEach(function(line){
    var m = line.trim().match(/^(\d+)\s*[|.)]\s*([a-z_]+)\s*\|\s*(.+)$/i);
    if(!m) return;
    var i = parseInt(m[1], 10) - 1;
    var cat = m[2].toLowerCase();
    if(!pachka[i]) return;
    if(!P.catById(cat)) return;                 // модель придумала свою категорию — не берём
    kuda[pachka[i].text.slice(0, 80)] = {cat: cat, why: m[3].trim()};
    strok++;
  });
  return strok;
}

function main(){
  var D = dannye();
  var gotovo = zagruzit();
  var predel = parseInt(process.argv[2], 10);

  var zhdut = [];
  D.tovary.forEach(function(t){
    t.otzyvy.forEach(function(o){
      if(o.layer !== "ai") return;
      var est = gotovo[o.text.slice(0, 80)];
      /* Ответ, который спорит с правилами, за готовый не считаем: спросим
         заново. Иначе один неверный ответ залипает в файле навсегда. */
      if(est){
        var dop = P.glavnye(o.cats);
        var soglasen = !dop || !dop.length ||
                       dop.indexOf(est.cat) >= 0 ||
                       est.cat === "horosh" || est.cat === "musor";
        if(soglasen) return;
      }
      zhdut.push(o);
    });
  });

  if(!isNaN(predel)) zhdut = zhdut.slice(0, predel);

  if(!zhdut.length){
    console.log("Всё уже разобрано, платить не за что.");
    return;
  }

  var pachki = [];
  for(var i = 0; i < zhdut.length; i += V_PACHKE) pachki.push(zhdut.slice(i, i + V_PACHKE));

  console.log("Ждут разбора: " + zhdut.length + " отзывов, это " + pachki.length +
              " " + (pachki.length === 1 ? "запрос" : "запроса") + " к модели.");

  var tokenov = 0;
  var razobrano = 0;

  function shag(n){
    if(n >= pachki.length){
      fs.writeFileSync(FILE, JSON.stringify(gotovo, null, 1), "utf8");
      console.log("");
      console.log("Разобрано: " + razobrano + " из " + zhdut.length);
      console.log("Потрачено токенов: " + tokenov);
      console.log("Записано в stranica/ai.json. Теперь запустите: node dannye.js");
      return;
    }
    var p = pachki[n];
    process.stdout.write("Пачка " + (n + 1) + " из " + pachki.length + " (" + p.length + " отзывов)… ");

    return G.sprosit(vopros(p), {max_tokens: 1200})
      .then(function(r){
        tokenov += r.tokenov;
        var vzyato = razobrat(r.text, p, gotovo);
        razobrano += vzyato;
        console.log("разобрано " + vzyato + ", токенов " + r.tokenov);
        // Сохраняем после каждой пачки: если оборвётся, продолжим с этого места.
        fs.writeFileSync(FILE, JSON.stringify(gotovo, null, 1), "utf8");
        return shag(n + 1);
      })
      .catch(function(e){
        console.log("");
        console.log("Сорвалось: " + e.message);
        fs.writeFileSync(FILE, JSON.stringify(gotovo, null, 1), "utf8");
        console.log("То, что успели, сохранено. Запустите ещё раз — продолжит с этого места.");
      });
  }

  shag(0);
}

main();
