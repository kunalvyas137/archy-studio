import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const PROFILES_DIR = join(homedir(), '.archy-studio', 'profiles');
const KEY_FILE = join(homedir(), '.archy-studio', '.key');
const ALG = 'aes-256-gcm';

function ensureDirs() {
  const base = join(homedir(), '.archy-studio');
  if (!existsSync(base)) mkdirSync(base, { recursive: true, mode: 0o700 });
  if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR, { recursive: true, mode: 0o700 });
}

function getMachineKey() {
  ensureDirs();
  if (existsSync(KEY_FILE)) {
    return readFileSync(KEY_FILE);
  }
  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key, { mode: 0o600 });
  return key;
}

function encrypt(plaintext) {
  const key = getMachineKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  });
}

function decrypt(ciphertext) {
  const key = getMachineKey();
  const { iv, tag, data } = JSON.parse(ciphertext);
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

function profilePath(id) {
  return join(PROFILES_DIR, `${id}.json`);
}

function readProfile(id) {
  const raw = JSON.parse(readFileSync(profilePath(id), 'utf8'));
  if (raw.clientSecret) {
    try { raw.clientSecret = decrypt(raw.clientSecret); } catch { raw.clientSecret = ''; }
  }
  return raw;
}

export function listProfiles() {
  ensureDirs();
  if (!existsSync(PROFILES_DIR)) return [];
  return readdirSync(PROFILES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const id = f.replace('.json', '');
      try {
        const p = readProfile(id);
        return { ...p, clientSecret: '***' };
      } catch { return null; }
    })
    .filter(Boolean);
}

export function getProfile(id) {
  return readProfile(id);
}

export function saveProfile(data) {
  ensureDirs();
  const id = data.id || randomUUID();
  const toStore = {
    ...data,
    id,
    clientSecret: data.clientSecret && data.clientSecret !== '***'
      ? encrypt(data.clientSecret)
      : data.clientSecret,
  };
  writeFileSync(profilePath(id), JSON.stringify(toStore, null, 2), { mode: 0o600 });
  return { ...toStore, clientSecret: '***' };
}

export function deleteProfile(id) {
  const p = profilePath(id);
  if (existsSync(p)) unlinkSync(p);
}
