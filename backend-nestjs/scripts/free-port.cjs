const { execFileSync } = require('node:child_process');

const port = Number(process.argv[2] || 3000);

if (process.platform !== 'win32') {
  process.exit(0);
}

try {
  const output = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
  const processIds = new Set();

  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns[0] !== 'TCP' || columns[1]?.split(':').pop() !== String(port) || columns[3] !== 'LISTENING') {
      continue;
    }
    processIds.add(columns[4]);
  }

  for (const processId of processIds) {
    if (processId && processId !== '0') {
      try {
        execFileSync('taskkill', ['/PID', processId, '/T', '/F'], { stdio: 'ignore' });
        console.log(`Stopped existing process ${processId} on port ${port}.`);
      } catch {
        // The process may have exited between netstat and taskkill.
      }
    }
  }
} catch {
  // Leave startup to report the original port error if inspection is unavailable.
}
