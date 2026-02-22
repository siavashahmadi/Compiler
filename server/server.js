'use strict';

const http = require('http');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3001;


function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJSON(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function executeCode(language, code, callback) {
  const tmpDir = os.tmpdir();
  let filePath, command, args;

  if (language === 'python') {
    filePath = path.join(tmpDir, 'cf_solution.py');
    fs.writeFileSync(filePath, code, 'utf8');
    command = 'python3';
    args = [filePath];
  } else if (language === 'typescript') {
    filePath = path.join(tmpDir, 'cf_solution.ts');
    fs.writeFileSync(filePath, code, 'utf8');
    command = 'tsx';
    args = [filePath];
  } else {
    return callback(null, {
      run: { stdout: '', stderr: `Unsupported language: ${language}`, code: 1 },
    });
  }

  execFile(command, args, { timeout: 10000 }, (err, stdout, stderr) => {
    const exitCode = err ? (err.code ?? 1) : 0;
    callback(null, {
      run: {
        stdout: stdout || '',
        stderr: stderr || (err && !stderr ? err.message : '') || '',
        code: exitCode,
      },
    });
  });
}

const server = http.createServer((req, res) => {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/api/v2/piston/runtimes') {
    sendJSON(res, 200, []);
    return;
  }

  if (req.method === 'POST' && url === '/api/v2/piston/execute') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        sendJSON(res, 400, { message: 'Invalid JSON' });
        return;
      }

      const language = parsed.language || '';
      const code = (parsed.files && parsed.files[0] && parsed.files[0].content) || '';

      executeCode(language, code, (err, pistonResponse) => {
        if (err) {
          sendJSON(res, 500, { message: err.message });
          return;
        }
        sendJSON(res, 200, pistonResponse);
      });
    });
    return;
  }

  if (req.method === 'GET' && url === '/health') {
    sendJSON(res, 200, { ok: true });
    return;
  }

  sendJSON(res, 404, { message: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  const { address, port } = server.address();
  console.log(`Server running on http://${address}:${port}`);
});
