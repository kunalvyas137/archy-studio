import { simpleGit } from 'simple-git';
import { existsSync } from 'node:fs';

function getGit(workspaceDir) {
  if (!existsSync(workspaceDir)) throw new Error(`Workspace directory not found: ${workspaceDir}`);
  return simpleGit(workspaceDir);
}

export async function gitStatus(workspaceDir) {
  const git = getGit(workspaceDir);
  return await git.status();
}

export async function gitLog(workspaceDir, maxCount = 20) {
  const git = getGit(workspaceDir);
  return await git.log({ maxCount, '--oneline': null });
}

export async function gitDiff(workspaceDir, file = null) {
  const git = getGit(workspaceDir);
  if (file) return await git.diff([file]);
  return await git.diff();
}

export async function gitDiffCached(workspaceDir) {
  const git = getGit(workspaceDir);
  return await git.diff(['--cached']);
}

export async function gitAdd(workspaceDir, files) {
  const git = getGit(workspaceDir);
  if (Array.isArray(files) && files.length > 0) {
    await git.add(files);
  } else {
    await git.add('.');
  }
}

export async function gitCommit(workspaceDir, message, authorName, authorEmail) {
  const git = getGit(workspaceDir);
  const opts = {};
  if (authorName && authorEmail) {
    opts['--author'] = `${authorName} <${authorEmail}>`;
  }
  return await git.commit(message, opts);
}

export async function gitPush(workspaceDir, remote = 'origin', branch = 'main') {
  const git = getGit(workspaceDir);
  return await git.push(remote, branch);
}

export async function gitGetConfig(workspaceDir) {
  try {
    const git = getGit(workspaceDir);
    const remotes = await git.getRemotes(true);
    const branch = (await git.branch()).current;
    return { remotes, branch };
  } catch {
    return { remotes: [], branch: 'main' };
  }
}

export async function gitSetRemote(workspaceDir, url, remoteName = 'origin') {
  const git = getGit(workspaceDir);
  const remotes = await git.getRemotes();
  const exists = remotes.find(r => r.name === remoteName);
  if (exists) {
    await git.remote(['set-url', remoteName, url]);
  } else {
    await git.addRemote(remoteName, url);
  }
}

export async function gitInit(workspaceDir) {
  const git = simpleGit(workspaceDir);
  return await git.init();
}
