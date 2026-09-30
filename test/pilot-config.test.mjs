import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const applications = [
  { directory: 'frontend', port: 5174 },
  { directory: 'pos_frontend', port: 5173 },
];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

for (const application of applications) {
  test(`${application.directory} is reachable on the LAN and proxies backend traffic`, async () => {
    const configUrl = pathToFileURL(
      path.join(repositoryRoot, application.directory, 'vite.config.js'),
    );
    const { default: config } = await import(`${configUrl.href}?test=${Date.now()}`);

    assert.equal(config.server.host, '0.0.0.0');
    assert.equal(config.server.port, application.port);
    assert.equal(config.server.strictPort, true);
    assert.equal(config.server.proxy['/api'].target, 'http://127.0.0.1:5000');
    assert.equal(config.server.proxy['/uploads'].target, 'http://127.0.0.1:5000');
  });

  test(`${application.directory} bundle uses same-origin API requests`, () => {
    const cwd = path.join(repositoryRoot, application.directory);
    execFileSync(process.env.ComSpec, ['/d', '/s', '/c', 'npm run build'], {
      cwd,
      stdio: 'pipe',
    });

    const bundle = filesUnder(path.join(cwd, 'dist'))
      .filter((file) => /\.(?:js|css|html)$/.test(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    assert.doesNotMatch(bundle, /http:\/\/localhost:5000/);
  });
}
