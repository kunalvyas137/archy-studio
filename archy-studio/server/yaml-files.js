import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const DEFAULT_WORKSPACE = join(process.cwd(), 'workspace');

function getWorkspace(dir) {
  const d = dir || DEFAULT_WORKSPACE;
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

export function listYamlFiles(workspaceDir) {
  const dir = getWorkspace(workspaceDir);
  return readdirSync(dir)
    .filter(f => ['.yaml', '.yml'].includes(extname(f)))
    .map(f => {
      const fp = join(dir, f);
      const stat = statSync(fp);
      return { name: f, path: fp, size: stat.size, modified: stat.mtime };
    });
}

export function readYamlFile(workspaceDir, filename) {
  const dir = getWorkspace(workspaceDir);
  const fp = join(dir, basename(filename));
  if (!existsSync(fp)) throw new Error(`File not found: ${filename}`);
  return readFileSync(fp, 'utf8');
}

export function writeYamlFile(workspaceDir, filename, content) {
  const dir = getWorkspace(workspaceDir);
  const fp = join(dir, basename(filename));
  writeFileSync(fp, content, 'utf8');
  return fp;
}

export function deleteYamlFile(workspaceDir, filename) {
  const dir = getWorkspace(workspaceDir);
  const fp = join(dir, basename(filename));
  if (existsSync(fp)) unlinkSync(fp);
}
