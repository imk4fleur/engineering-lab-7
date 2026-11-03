const http = require('http');
http.createServer((req, res) => {
  if (req.url === '/load') {
    const end = Date.now() + 250;
    while (Date.now() < end) Math.sqrt(Math.random());
  }
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
  res.end('Практическая 7: Kubernetes работает\n');
}).listen(8080, '0.0.0.0');
