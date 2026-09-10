"use strict";

/* Читает texts.txt и раскладывает по названиям в квадратных скобках.
   Всё, что стоит до первой такой скобки, — подсказка для человека,
   она отбрасывается. */

var fs = require("fs");
var path = require("path");

function read(){
  var file = path.join(__dirname, "texts.txt");
  var out = {};
  var name = null;
  var buf = [];

  function zakryt(){
    if(name) out[name] = buf.join("\n").trim();
    buf = [];
  }

  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function(line){
    var m = line.match(/^\s*\[([a-zA-Z0-9_]+)\]\s*$/);
    if(m){ zakryt(); name = m[1]; return; }
    if(name) buf.push(line);
  });
  zakryt();
  return out;
}

module.exports = read;
