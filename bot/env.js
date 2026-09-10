"use strict";

/* Читает .env. Токен живёт только здесь и в переписку не попадает. */
var fs = require("fs");
var path = require("path");

function read(){
  var file = path.join(__dirname, ".env");
  if(!fs.existsSync(file)){
    console.log("Нет файла .env рядом с программой.");
    process.exit(1);
  }
  var out = {};
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function(line){
    var s = line.trim();
    if(!s || s.charAt(0) === "#") return;
    var i = s.indexOf("=");
    if(i < 0) return;
    out[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  });
  return out;
}

/* Пишем значение обратно в .env, чтобы номер получателя не искать каждый раз. */
function save(key, value){
  var file = path.join(__dirname, ".env");
  var text = fs.readFileSync(file, "utf8");
  var re = new RegExp("^" + key + "=.*$", "m");
  text = re.test(text) ? text.replace(re, key + "=" + value) : text.trim() + "\n" + key + "=" + value + "\n";
  fs.writeFileSync(file, text, "utf8");
}

module.exports = {read:read, save:save};
