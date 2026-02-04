#!/usr/bin/env node
'use strict';

/**
 * Ensures @aitytech/agentkits-memory is installed before hooks run.
 * Runs on SessionStart — uses a version marker to avoid re-checking every session.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACKAGE = '@aitytech/agentkits-memory';
const MARKER_DIR = path.join(os.homedir(), '.agentkits-memory');
const MARKER_FILE = path.join(MARKER_DIR, '.install-version');

function getInstalledVersion() {
  try {
    const result = execSync(`npm list -g ${PACKAGE} --json 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const parsed = JSON.parse(result);
    const deps = parsed.dependencies || {};
    const pkg = deps[PACKAGE] || deps['agentkits-memory'];
    return pkg ? pkg.version : null;
  } catch {
    return null;
  }
}

function getMarkerVersion() {
  try {
    return fs.readFileSync(MARKER_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function writeMarker(version) {
  try {
    fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(MARKER_FILE, version);
  } catch {
    // Non-critical — just skip marker
  }
}

function main() {
  const installed = getInstalledVersion();
  const marker = getMarkerVersion();

  if (installed && marker === installed) {
    console.log(JSON.stringify({ result: 'already-installed', version: installed }));
    return;
  }

  if (installed) {
    writeMarker(installed);
    console.log(JSON.stringify({ result: 'already-installed', version: installed }));
    return;
  }

  // Not installed — install globally
  try {
    execSync(`npm install -g ${PACKAGE}`, {
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const newVersion = getInstalledVersion() || 'unknown';
    writeMarker(newVersion);
    console.log(JSON.stringify({ result: 'installed', version: newVersion }));
  } catch (err) {
    console.log(JSON.stringify({ result: 'install-failed', error: err.message }));
    process.exit(1);
  }
}

main();
