const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const server = spawn(process.execPath, ['server.js']);
setTimeout(async () => {
  try {
    for (const path of ['/', '/load']) {
      const res = await fetch('http://127.0.0.1:8080' + path);
      assert.equal(res.status, 200);
      assert.match(await res.text(), /Kubernetes/);
    }
    console.log('HTTP OK');
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { server.kill(); }
}, 400);
