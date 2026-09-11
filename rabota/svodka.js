"use strict";

/* Собирает тексты отчётов из настоящего разбора (stranica/razbor.js).
   Ничего не выдумывает: все числа и цитаты — из разобранных отзывов.

   Отсюда берут тексты и бот, и отправка одним разом. */

var fs = require("fs");
var path = require("path");
var P = require("./pravila.js");

function dannye(){
  var f = path.join(__dirname, "stranica", "razbor.js");
  if(!fs.existsSync(f)) return null;
  var src = fs.readFileSync(f, "utf8");
  return JSON.parse(src.replace(/^var RAZBOR = /, "").replace(/;$/, ""));
}

function den(d){ return d ? new Date(d + "T00:00:00Z").getTime() / 86400000 : 0; }
function skl(n, a, b, c){
  var x = Math.abs(n) % 100, y = x % 10;
  if(x > 10 && x < 20) return c;
  if(y > 1 && y < 5) return b;
  if(y === 1) return a;
  return c;
}
function beda(o){
  var c = P.catById(o.cat);
  if(c && c.chuzhoe) return false;    // акции и пункт выдачи — не к «Нике»
  return !(c && !c.bad);
}
function korotko(s, n){
  s = s.replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n).replace(/[\s,.;:—-]+$/, "") + "…" : s;
}
/* Телеграм разбирает разметку, поэтому угловые скобки из отзыва надо обезвредить,
   иначе сообщение просто не отправится. */
function bez(s){
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function data(d){
  var m = ["января","февраля","марта","апреля","мая","июня",
           "июля","августа","сентября","октября","ноября","декабря"];
  var p = String(d).split("-");
  return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10) - 1];
}

/* ---------- общая сводка ---------- */
function svodka(){
  var D = dannye();
  if(!D) return "Разбора пока нет. Сначала запустите: node dannye.js";

  var vsego = 0, bed = 0, kodom = 0, ai = 0;
  var own = {};

  D.tovary.forEach(function(t){
    t.otzyvy.forEach(function(o){
      vsego++;
      if(o.layer === "code") kodom++; else ai++;
      if(!beda(o)) return;
      bed++;
      var c = P.catById(o.cat);
      if(c) own[c.owner] = (own[c.owner] || 0) + 1;
    });
  });

  var out = ["📊 <b>Отзывы на " + data(D.sobrano) + "</b>"];
  out.push("Разобрано " + vsego);
  out.push("🟠 с претензией — " + bed + " (" + Math.round(bed / vsego * 100) + "%)");
  out.push("🟢 довольны — " + (vsego - bed) + " (" + Math.round((vsego - bed) / vsego * 100) + "%)");
  out.push("");
  out.push("<b>Кто чинит</b>");
  Object.keys(own).sort(function(a, b){ return own[b] - own[a]; })
        .forEach(function(k){ out.push(k + " — " + own[k]); });

  D.tovary.forEach(function(t){
    var bedy = t.otzyvy.filter(beda);
    var po = {};
    bedy.forEach(function(o){ if(o.cat) po[o.cat] = (po[o.cat] || 0) + 1; });
    var top = Object.keys(po).sort(function(a, b){ return po[b] - po[a]; })[0];

    out.push("");
    out.push("<b>" + bez(t.name) + "</b>");
    out.push(t.otzyvy.length + " " + skl(t.otzyvy.length, "отзыв", "отзыва", "отзывов") +
             ": 🟠 " + bedy.length + " с претензией, 🟢 " +
             (t.otzyvy.length - bedy.length) + " довольны");
    if(top){
      var c = P.catById(top);
      out.push("Чаще всего: " + c.name.toLowerCase() + " — " + po[top] +
               ", чинит " + c.owner);
      var primer = bedy.filter(function(o){ return o.cat === top; })[0];
      if(primer) out.push("<i>«" + bez(korotko(primer.text, 110)) + "»</i>");
    }
  });

  out.push("");
  out.push("<b>Чем разобрано</b>");
  out.push("правилами " + kodom + ", нейросетью " + ai);
  return out.join("\n");
}

/* Что именно повторяется в пачке жалоб. Считаем приметы, по которым их
   и отнесли к категории, и показываем самые частые с числами. Это отвечает
   на вопрос «в 20 жалобах — про что?», а один пример на него не отвечает. */
function chtoPovtoryaetsya(spisok, skolko){
  var schet = {};
  spisok.forEach(function(o){
    var bylo = {};
    P.primety(o.text).forEach(function(w){
      if(bylo[w]) return;          // одно слово в одном отзыве считаем один раз
      bylo[w] = 1;
      schet[w] = (schet[w] || 0) + 1;
    });
  });
  // «не держ» и «не держат» — одно и то же. Если одно слово содержится
  // в другом, оставляем только то, что встретилось чаще.
  var vzyato = [];
  Object.keys(schet)
    .filter(function(w){ return schet[w] >= 2; })
    .sort(function(a, b){ return schet[b] - schet[a] || b.length - a.length; })
    .forEach(function(w){
      var est = vzyato.some(function(k){
        return k.indexOf(w) === 0 || w.indexOf(k) === 0;
      });
      if(!est) vzyato.push(w);
    });
  return vzyato.slice(0, skolko || 4).map(function(w){ return {slovo: w, n: schet[w]}; });
}

/* ---------- срочное: что повторяется в свежих отзывах ---------- */
function srochno(){
  var D = dannye();
  if(!D) return "Разбора пока нет.";

  var segodnya = den(D.sobrano);
  var signaly = [];

  D.tovary.forEach(function(t){
    var svezhie = t.otzyvy.filter(function(o){
      // o.cat пуст у отзывов, которые ещё не разобрала нейросеть: категории
      // у них нет, и в подсчёт самой частой беды они попасть не должны.
      return beda(o) && o.cat && (segodnya - den(o.date)) <= 7;
    });
    if(svezhie.length < 3) return;

    var po = {};
    svezhie.forEach(function(o){ po[o.cat] = (po[o.cat] || 0) + 1; });

    var top = Object.keys(po).sort(function(a, b){ return po[b] - po[a]; })[0];
    if(!top || po[top] < 3) return;

    var gruppa = svezhie.filter(function(o){ return o.cat === top; });
    signaly.push({
      tovar: t.name,
      cat: P.catById(top),
      stalo: po[top],
      vse: gruppa,
      primery: gruppa.slice(0, 1)
    });
  });

  if(!signaly.length){
    return "⚠️ <b>Срочного нет</b>\n\nЗа последнюю неделю ни по одному товару " +
           "не набралось череды одинаковых жалоб.";
  }

  var out = ["⚠️ <b>Повторяется одно и то же</b>"];
  signaly.forEach(function(s){
    out.push("");
    out.push("<b>" + bez(s.tovar) + "</b>");
    out.push(s.stalo + " " + skl(s.stalo, "жалоба", "жалобы", "жалоб") +
             " одного вида за последние 7 дней: " + s.cat.name.toLowerCase());
    out.push("Чинит: " + s.cat.owner);
    var slova = chtoPovtoryaetsya(s.vse, 4);
    if(slova.length){
      out.push("");
      out.push("<b>Про что именно</b>");
      slova.forEach(function(x){
        out.push("«" + x.slovo + "» — в " + x.n + " " +
                 skl(x.n, "отзыве", "отзывах", "отзывах"));
      });
    }
    if(s.primery[0]){
      out.push("");
      out.push("<i>«" + bez(korotko(s.primery[0].text, 95)) + "»</i>");
    }
  });
  // Сравнения «стало против было» здесь нарочно нет. Отзывы собраны со страниц
  // вручную и вразнобой по датам, поэтому «неделей раньше было 0» означало бы
  // не спад жалоб, а то, что мы столько не скопировали.
  out.push("");
  out.push("<i>Отзывы собраны вручную, это не полная выгрузка. Сравнение недели " +
           "с неделей появится, когда пойдёт выгрузка из базы.</i>");
  return out.join("\n");
}

/* ---------- очередь: чем заняться первым ---------- */
function ochered(){
  var D = dannye();
  if(!D) return "Разбора пока нет.";

  var vse = [];
  D.tovary.forEach(function(t){
    t.otzyvy.filter(beda).forEach(function(o){
      vse.push({o: o, tovar: t.name});
    });
  });
  // Свежие первыми — так же, как на странице. При одной дате выше та жалоба,
  // что тяжелее: опасность, несколько претензий разом, повторяемость.
  vse.sort(function(a, b){
    return den(b.o.date) - den(a.o.date) || b.o.ves - a.o.ves;
  });
  var vsegoBed = vse.length;

  // Не больше двух строк на товар: иначе один плохой товар занимает весь
  // список, и про остальные в отчёте не видно ничего.
  var skolkoPoTovaru = {};
  vse = vse.filter(function(x){
    skolkoPoTovaru[x.tovar] = (skolkoPoTovaru[x.tovar] || 0) + 1;
    return skolkoPoTovaru[x.tovar] <= 2;
  });

  var out = ["<b>Чем заняться первым</b>", ""];
  vse.slice(0, 5).forEach(function(x, i){
    var c = P.catById(x.o.cat);
    out.push("<b>" + (i + 1) + ". " + (c ? c.name : "—") + "</b> · чинит " +
             (c ? c.owner : "—"));
    out.push(bez(korotko(x.tovar, 46)) + " · " + data(x.o.date));
    out.push("<i>«" + bez(korotko(x.o.text, 120)) + "»</i>");
    out.push("");
  });
  // vse уже обрезан по два на товар, поэтому общее число считаем отдельно.
  out.push("Всего с претензией: " + vsegoBed);
  return out.join("\n");
}


/* ---------- список товаров для кнопок ---------- */
function tovary(){
  var D = dannye();
  return D ? D.tovary.map(function(t, i){ return {i: i, name: t.name, vsego: t.otzyvy.length}; }) : [];
}

/* ---------- отчёт по одному товару ----------
   Срочное и важное разведены нарочно. Срочное — то, что происходит сейчас:
   свежие жалобы одного вида. Важное — то, что накопилось за всё время.
   Это разные вопросы и разные решения. */
function poTovaru(i){
  var D = dannye();
  if(!D || !D.tovary[i]) return "Такого товара нет.";
  var t = D.tovary[i];
  var segodnya = den(D.sobrano);

  var bedy = t.otzyvy.filter(beda);
  var out = ["<b>" + bez(t.name) + "</b>"];

  // Чтобы один и тот же отзыв не цитировался в трёх местах подряд.
  var pokazany = {};
  function primer(spisok){
    for(var k = 0; k < spisok.length; k++){
      var kl = spisok[k].text.slice(0, 40);
      if(!pokazany[kl]){ pokazany[kl] = 1; return spisok[k]; }
    }
    return null;
  }
  out.push(t.otzyvy.length + " " + skl(t.otzyvy.length, "отзыв", "отзыва", "отзывов"));
  out.push("🟠 с претензией — " + bedy.length +
           " (" + Math.round(bedy.length / t.otzyvy.length * 100) + "%)");
  out.push("🟢 довольны — " + (t.otzyvy.length - bedy.length) +
           " (" + Math.round((t.otzyvy.length - bedy.length) / t.otzyvy.length * 100) + "%)");

  // ---- по свежести ----
  function za(dney){
    return bedy.filter(function(o){ return (segodnya - den(o.date)) <= dney; }).length;
  }
  out.push("");
  out.push("<b>Когда жаловались</b>");
  out.push("за 7 дней — " + za(7));
  out.push("за 30 дней — " + za(30));
  out.push("всего — " + bedy.length);

  // ---- СРОЧНО ----
  var svezhie = bedy.filter(function(o){ return (segodnya - den(o.date)) <= 7; });
  var poSvezh = {};
  svezhie.forEach(function(o){ if(o.cat) poSvezh[o.cat] = (poSvezh[o.cat] || 0) + 1; });
  var topSvezh = Object.keys(poSvezh).sort(function(a, b){ return poSvezh[b] - poSvezh[a]; })[0];

  out.push("");
  if(topSvezh && poSvezh[topSvezh] >= 3){
    var cs = P.catById(topSvezh);
    out.push("🔴 <b>СРОЧНО</b>");
    out.push("За последние 7 дней " + poSvezh[topSvezh] + " " +
             skl(poSvezh[topSvezh], "жалоба", "жалобы", "жалоб") +
             " одного вида: " + cs.name.toLowerCase());
    out.push("Чинит: " + cs.owner);
    var slovaS = chtoPovtoryaetsya(svezhie.filter(function(o){ return o.cat === topSvezh; }), 5);
    if(slovaS.length){
      out.push("Про что именно: " + slovaS.map(function(x){
        return "«" + x.slovo + "» " + x.n;
      }).join(", "));
    }
    var p1 = primer(svezhie.filter(function(o){ return o.cat === topSvezh; }));
    if(p1) out.push("<i>«" + bez(korotko(p1.text, 100)) + "»</i>");
  } else {
    out.push("🟢 <b>Срочного нет</b>");
    out.push("За последние 7 дней череды одинаковых жалоб не набралось.");
  }

  // ---- ВАЖНО ----
  var poVsem = {};
  bedy.forEach(function(o){ if(o.cat) poVsem[o.cat] = (poVsem[o.cat] || 0) + 1; });
  var topVsem = Object.keys(poVsem).sort(function(a, b){ return poVsem[b] - poVsem[a]; })[0];

  out.push("");
  out.push("🟠 <b>ВАЖНО</b>");
  if(topVsem){
    var cv = P.catById(topVsem);
    out.push("Главная беда за всё время: " + cv.name.toLowerCase() +
             " — " + poVsem[topVsem] + " из " + bedy.length);
    out.push("Чинит: " + cv.owner);
    var slovaV = chtoPovtoryaetsya(bedy.filter(function(o){ return o.cat === topVsem; }), 5);
    if(slovaV.length){
      out.push("Про что именно: " + slovaV.map(function(x){
        return "«" + x.slovo + "» " + x.n;
      }).join(", "));
    }
    var p2 = primer(bedy.filter(function(o){ return o.cat === topVsem; }));
    if(p2) out.push("<i>«" + bez(korotko(p2.text, 100)) + "»</i>");
  }

  // ---- все категории ----
  out.push("");
  out.push("<b>Всё по типам</b>");
  P.CATS.forEach(function(c){
    if(!poVsem[c.id]) return;
    out.push(c.name + " — " + poVsem[c.id] + " · " + c.owner);
  });

  // ---- верх очереди ----
  out.push("");
  out.push("<b>Смотреть первым</b>");
  var n = 0;
  bedy.forEach(function(o){
    if(n >= 3) return;
    if(pokazany[o.text.slice(0, 40)]) return;   // уже показывали выше
    pokazany[o.text.slice(0, 40)] = 1;
    n++;
    var c = P.catById(o.cat);
    out.push(n + ". " + (c ? c.name : "—") + " · " + data(o.date));
    out.push("<i>«" + bez(korotko(o.text, 90)) + "»</i>");
  });

  return out.join("\n");
}

module.exports = {svodka: svodka, srochno: srochno, ochered: ochered, tovary: tovary, poTovaru: poTovaru, est: function(){ return !!dannye(); }};
