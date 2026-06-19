'use strict';
const fs = require('fs');
const debugFile = '/tmp/hexo-mermaid-debug.txt';
fs.writeFileSync(debugFile, 'script loaded\n');

let callCount = 0;
hexo.extend.filter.register('after_post_render', function(data) {
  callCount++;
  if (callCount === 1) {
    fs.appendFileSync(debugFile, 'after_post_render called! post: ' + (data.path||'?') + '\n');
  }
  return data;
});

// 也试试 after_render
hexo.extend.filter.register('after_render:html', function(str) {
  fs.appendFileSync(debugFile, 'after_render:html called (len=' + str.length + ')\n');
  return str;
});

process.on('exit', function() {
  fs.appendFileSync(debugFile, 'total after_post_render calls: ' + callCount + '\n');
});
