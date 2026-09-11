"use strict";

/* Прогоняет отзывы из файла через правила и показывает, что получилось.
   Запуск: node proverit.js syrye/obrazec-1.txt */

var fs = require("fs");
var path = require("path");
var P = require("./pravila.js");

var file = process.argv[2] || "syrye/obrazec-1.txt";
var syroe = fs.readFileSync(path.resolve(file), "utf8");

// Разбор копипасты — тот же код, что и в razobrat.js, вызываем его.
var { execSync } = require("child_process");
var json = path.join(__dirname, "syrye", "_vremenno.json");
execSync("node " + JSON.stringify(path.join(__dirname, "razobrat.js")) + " " +
         JSON.stringify(path.resolve(file)) + " " + JSON.stringify(json),
         {stdio:"ignore"});
var OTZYVY = JSON.parse(fs.readFileSync(json, "utf8"));

var res = OTZYVY.map(function(o){ return {o:o, r:P.classify(o)}; });

var code = res.filter(function(x){ return x.r.layer === "code"; }).length;
var ai = res.length - code;

console.log("Отзывов: " + res.length);
console.log("Разобрали правила: " + code + " (" + Math.round(code / res.length * 100) + "%)");
console.log("Нужна нейросеть:   " + ai + " (" + Math.round(ai / res.length * 100) + "%)");
console.log("");

var po = {};
res.forEach(function(x){ var k = x.r.main || "_ai"; po[k] = (po[k] || 0) + 1; });
P.CATS.forEach(function(c){
  if(po[c.id]) console.log("  " + String(po[c.id]).padStart(3) + "  " + c.name +
                           (c.bad ? "  → " + c.owner : ""));
});
if(po._ai) console.log("  " + String(po._ai).padStart(3) + "  ждут нейросеть");

console.log("");
console.log("=== ПРЕТЕНЗИИ, разобранные правилами ===");
res.filter(function(x){ return x.r.layer === "code" && P.catById(x.r.main) && P.catById(x.r.main).bad; })
   .forEach(function(x){
     console.log("[" + P.catById(x.r.main).name + "] " + x.o.text.slice(0, 110));
     console.log("     " + x.r.why);
   });

console.log("");
console.log("=== УШЛО БЫ В НЕЙРОСЕТЬ ===");
res.filter(function(x){ return x.r.layer === "ai"; }).forEach(function(x){
  console.log("• " + x.o.text.slice(0, 130));
  console.log("     причина: " + x.r.why);
});

fs.unlinkSync(json);
