import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const worker = readFileSync(new URL('../workers/notes-recovery/index.js', import.meta.url), 'utf8');
const marker = worker.indexOf(';\nconst headers=');
assert(worker.startsWith('const page=') && marker > 0, 'Worker uses expected page source');
const page = JSON.parse(worker.slice('const page='.length, marker));
const client = page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(client, 'Expected an embedded client-side script');

test('inline browser JavaScript compiles without execution', () => {
  assert.doesNotThrow(() => new vm.Script(client));
});
test('save, unlock, test individual and all provider controls are wired', () => {
  for (const action of ['saveKeys()', 'loadKeys()', 'testProvider()', 'testAllProviders()', 'clearKeys()'])
    assert(page.includes('onclick="'+action+'"'), action+' button missing');
});
test('persisted API keys are encrypted, not saved as plain browser data', () => {
  assert(client.includes('crypto.subtle.encrypt'));
  assert(client.includes('crypto.subtle.decrypt'));
  assert(client.includes('PBKDF2'));
  assert(client.includes('AES-GCM'));
  assert(client.includes('localStorage.setItem(vaultName'));
  assert(!client.includes('localStorage.setItem(vaultName,JSON.stringify(keys))'));
});
test('provider list and API endpoint are retained', () => {
  for (const name of ['openai','openrouter','groq','mistral']) assert(client.includes(name));
  assert(worker.includes("'/api/test'"));
});
