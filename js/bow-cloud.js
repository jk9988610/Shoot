/**
 * 弓身云端存储 — 参照 Card-World art-storage / HarmonyForge cloud-publish
 *
 * Storage: shoot 桶 / bow-store/{id}/meta.json + bow.json
 * DB: shoot_bow_works 表（草稿 draft / 游戏中 active / 发布 published）
 */
import { BOW_BUCKET, BOW_STORE_PREFIX, isCloudEnabled } from './cloud-config.js';
import { shouldUseCloud, ensureCloudForUpload } from './net-policy.js';
import { getSupabaseClient, invalidateSupabaseClient } from './supabase-client.js';
import { formatSupabaseError } from './supabase-error.js';
import { BOW_SCENE_KIND, bowSceneToApply, validateBowScene } from './bow-scene.js';

const LS_SESSION = 'shoot-cloud-session';

function assertCloudReady() {
  if (!isCloudEnabled()) throw new Error('云端未开启，请在编辑器中启用云同步');
  if (!shouldUseCloud()) throw new Error('需要网络连接才能使用云端');
}

export function loadCloudSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.authorLabel) return parsed;
  } catch { /* ignore */ }
  return null;
}

export function saveCloudSession({ authorLabel }) {
  const label = (authorLabel || '').trim();
  if (!label) return null;
  const session = { authorLabel: label, savedAt: Date.now() };
  localStorage.setItem(LS_SESSION, JSON.stringify(session));
  return session;
}

export async function ensureAuthorLabel(promptIfMissing = true) {
  let session = loadCloudSession();
  if (session?.authorLabel) return session.authorLabel;

  if (!promptIfMissing) return null;
  const name = window.prompt('输入昵称（用于云端保存弓身）', session?.authorLabel || '');
  if (!name?.trim()) return null;
  saveCloudSession({ authorLabel: name.trim() });
  return name.trim();
}

function wrapBowPayload(bowScene, extra = {}) {
  return {
    kind: BOW_SCENE_KIND,
    savedAt: new Date().toISOString(),
    bow: bowScene,
    ...extra,
  };
}

/**
 * 保存草稿到云端（按作者 upsert 单条 draft）
 */
export async function saveBowDraftToCloud(bowScene, { viewport, title = '编辑器草稿' } = {}) {
  assertCloudReady();
  const authorLabel = await ensureAuthorLabel(true);
  if (!authorLabel) throw new Error('需要昵称才能保存到云端');

  const sb = await getSupabaseClient();
  if (!sb) throw new Error('云客户端加载失败');

  const workId = `draft_${authorLabel.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40)}`;
  const base = `${BOW_STORE_PREFIX}/${workId}`;
  const metaPath = `${base}/meta.json`;
  const bowPath = `${base}/bow.json`;

  const meta = wrapBowPayload(bowScene, { title, authorLabel, viewport, kind: 'draft' });
  const metaBlob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const bowBlob = new Blob([JSON.stringify(bowScene)], { type: 'application/json' });

  let { error: e1 } = await sb.storage.from(BOW_BUCKET).upload(metaPath, metaBlob, {
    contentType: 'application/json',
    upsert: true,
  });
  if (e1) throw new Error(formatSupabaseError(e1, BOW_BUCKET));

  let { error: e2 } = await sb.storage.from(BOW_BUCKET).upload(bowPath, bowBlob, {
    contentType: 'application/json',
    upsert: true,
  });
  if (e2) throw new Error(formatSupabaseError(e2, BOW_BUCKET));

  const row = {
    id: workId,
    title,
    author_label: authorLabel,
    bow_json: bowScene,
    kind: 'draft',
    meta_path: metaPath,
    storage_path: bowPath,
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  };
  const { error: dbErr } = await sb.from('shoot_bow_works').upsert(row, { onConflict: 'id' });
  if (dbErr) console.warn('shoot_bow_works upsert:', dbErr.message);

  return { id: workId, authorLabel, metaPath, bowPath };
}

/**
 * 发布弓身到云端并标记为 active（游戏可拉取）
 */
export async function publishBowToCloud(bowScene, { title = '我的弓' } = {}) {
  ensureCloudForUpload();
  assertCloudReady();
  const check = validateBowScene(bowScene);
  if (!check.ok) throw new Error(check.reason);

  const authorLabel = await ensureAuthorLabel(true);
  if (!authorLabel) throw new Error('需要昵称才能发布');

  const sb = await getSupabaseClient();
  if (!sb) throw new Error('云客户端加载失败');

  const workId = crypto.randomUUID();
  const base = `${BOW_STORE_PREFIX}/${workId}`;
  const metaPath = `${base}/meta.json`;
  const bowPath = `${base}/bow.json`;
  const titleTrim = title.trim() || '我的弓';
  const publishedAt = new Date().toISOString();

  const meta = wrapBowPayload(bowScene, { title: titleTrim, authorLabel, kind: 'active' });
  const metaBlob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const bowBlob = new Blob([JSON.stringify(bowScene)], { type: 'application/json' });

  for (const [path, blob] of [[metaPath, metaBlob], [bowPath, bowBlob]]) {
    const { error } = await sb.storage.from(BOW_BUCKET).upload(path, blob, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) throw new Error(formatSupabaseError(error, BOW_BUCKET));
  }

  await sb.from('shoot_bow_works')
    .update({ kind: 'published' })
    .eq('author_label', authorLabel)
    .eq('kind', 'active');

  const row = {
    id: workId,
    title: titleTrim,
    author_label: authorLabel,
    bow_json: bowScene,
    kind: 'active',
    meta_path: metaPath,
    storage_path: bowPath,
    published_at: publishedAt,
    updated_at: publishedAt,
  };
  const { error: dbErr } = await sb.from('shoot_bow_works').upsert(row, { onConflict: 'id' });
  if (dbErr) throw new Error(formatSupabaseError(dbErr, BOW_BUCKET));

  localStorage.setItem('shoot_active_bow_id', workId);
  return { id: workId, title: titleTrim, authorLabel, publishedAt };
}

/** 加载当前作者的云端草稿 */
export async function loadBowDraftFromCloud(authorLabel) {
  if (!isCloudEnabled() || !shouldUseCloud()) return null;
  const label = authorLabel || loadCloudSession()?.authorLabel;
  if (!label) return null;

  const sb = await getSupabaseClient();
  if (!sb) return null;

  const workId = `draft_${label.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40)}`;

  const { data: row } = await sb
    .from('shoot_bow_works')
    .select('bow_json,meta_path,updated_at,title')
    .eq('id', workId)
    .eq('kind', 'draft')
    .maybeSingle();

  if (row?.bow_json) {
    return {
      bow: row.bow_json,
      viewport: null,
      savedAt: row.updated_at,
      title: row.title,
      source: 'cloud-db',
    };
  }

  const metaPath = `${BOW_STORE_PREFIX}/${workId}/meta.json`;
  try {
    const { data, error } = await sb.storage.from(BOW_BUCKET).download(metaPath);
    if (error) return null;
    const meta = JSON.parse(await data.text());
    return {
      bow: meta.bow,
      viewport: meta.viewport,
      savedAt: meta.savedAt,
      title: meta.title,
      source: 'cloud-storage',
    };
  } catch {
    return null;
  }
}

/** 加载当前作者 active 弓身，或本地记录的 active id */
export async function loadActiveBowFromCloud() {
  if (!isCloudEnabled() || !shouldUseCloud()) return null;

  const sb = await getSupabaseClient();
  if (!sb) return null;

  const session = loadCloudSession();
  const activeId = localStorage.getItem('shoot_active_bow_id');

  if (activeId) {
    const { data } = await sb
      .from('shoot_bow_works')
      .select('id,title,author_label,bow_json,published_at,kind')
      .eq('id', activeId)
      .maybeSingle();
    if (data?.bow_json && data.kind === 'active') {
      return mapBowRow(data);
    }
  }

  if (session?.authorLabel) {
    const { data } = await sb
      .from('shoot_bow_works')
      .select('id,title,author_label,bow_json,published_at,kind')
      .eq('author_label', session.authorLabel)
      .eq('kind', 'active')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.bow_json) return mapBowRow(data);
  }

  return null;
}

/** 列出已发布弓身（公共画廊） */
export async function listPublishedBows(limit = 50) {
  if (!isCloudEnabled() || !shouldUseCloud()) return [];
  const sb = await getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('shoot_bow_works')
    .select('id,title,author_label,bow_json,published_at,kind')
    .in('kind', ['active', 'published'])
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('listPublishedBows:', error.message);
    return [];
  }
  return (data || []).map(mapBowRow);
}

export async function downloadBowWork(workId) {
  assertCloudReady();
  const sb = await getSupabaseClient();
  if (!sb) throw new Error('云客户端加载失败');

  const { data: row, error } = await sb
    .from('shoot_bow_works')
    .select('id,title,author_label,bow_json,published_at,kind')
    .eq('id', workId)
    .maybeSingle();

  if (!error && row?.bow_json) return mapBowRow(row);

  const bowPath = `${BOW_STORE_PREFIX}/${workId}/bow.json`;
  const { data, error: dlErr } = await sb.storage.from(BOW_BUCKET).download(bowPath);
  if (dlErr) throw new Error(formatSupabaseError(dlErr, BOW_BUCKET));
  const bow = JSON.parse(await data.text());
  return { id: workId, bow, apply: bowSceneToApply(bow) };
}

function mapBowRow(row) {
  return {
    id: row.id,
    title: row.title,
    authorLabel: row.author_label,
    bow: row.bow_json,
    apply: bowSceneToApply(row.bow_json),
    publishedAt: row.published_at,
    kind: row.kind,
  };
}

export function onCloudOptInChanged() {
  invalidateSupabaseClient();
}
