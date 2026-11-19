import './theme';

/* ==========================================================================
   类型与状态
   ========================================================================== */

interface Auth {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

interface Post {
  path: string;
  sha: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedDate?: string;
  tags: string[];
  draft: boolean;
  cover: string;
  body: string;
  raw: string;
}

interface FormDoc {
  title: string;
  slug: string;
  description: string;
  date: string;
  tags: string[];
  draft: boolean;
  cover: string;
  body: string;
}

interface GitHubEntry {
  name: string;
  path: string;
  sha: string;
  type: string;
  url: string;
}

const AUTH_KEY = 'blog-admin-auth-v1';

const root = document.querySelector<HTMLElement>('#admin-root')!;
const env = {
  owner: root.dataset.owner ?? '',
  repo: root.dataset.repo ?? '',
  branch: root.dataset.branch || 'main',
  base: root.dataset.base || '/',
  site: root.dataset.site || '博客',
};

const state = {
  auth: null as Auth | null,
  posts: [] as Post[],
  active: null as Post | null,
  isNew: false,
  dirty: false,
  saving: false,
  connecting: false,
  baseline: '',
  updatedDate: undefined as string | undefined,
  slugTouched: false,
};

/* ==========================================================================
   DOM
   ========================================================================== */

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`缺少元素 #${id}`);
  return element as T;
};

const loginView = byId<HTMLElement>('login-view');
const editorView = byId<HTMLElement>('editor-view');
const loginForm = byId<HTMLFormElement>('login-form');
const ownerInput = byId<HTMLInputElement>('owner-input');
const repoInput = byId<HTMLInputElement>('repo-input');
const branchInput = byId<HTMLInputElement>('branch-input');
const tokenInput = byId<HTMLInputElement>('token-input');
const rememberInput = byId<HTMLInputElement>('remember-input');
const loginError = byId<HTMLElement>('login-error');
const loginBtn = byId<HTMLButtonElement>('login-btn');

const sidebar = byId<HTMLElement>('admin-sidebar');
const sidebarOpen = byId<HTMLButtonElement>('sidebar-open');
const sidebarClose = byId<HTMLButtonElement>('sidebar-close');
const sidebarBackdrop = byId<HTMLElement>('sidebar-backdrop');
const repoLabel = byId<HTMLElement>('repo-label');
const branchLabel = byId<HTMLElement>('branch-label');
const postTotal = byId<HTMLElement>('post-total');
const postFilter = byId<HTMLInputElement>('post-filter');
const postList = byId<HTMLElement>('admin-post-list');
const newPostBtn = byId<HTMLButtonElement>('new-post');
const newPostEmptyBtn = byId<HTMLButtonElement>('new-post-empty');
const siteLink = byId<HTMLAnchorElement>('site-link');
const actionsLink = byId<HTMLAnchorElement>('actions-link');
const logoutBtn = byId<HTMLButtonElement>('logout');

const crumbTitle = byId<HTMLElement>('crumb-title');
const saveState = byId<HTMLElement>('save-state');
const saveBtn = byId<HTMLButtonElement>('save-post');
const deleteBtn = byId<HTMLButtonElement>('delete-post');
const previewLink = byId<HTMLAnchorElement>('preview-link');

const emptyState = byId<HTMLElement>('admin-empty');
const form = byId<HTMLFormElement>('post-form');
const titleInput = byId<HTMLInputElement>('field-title');
const slugInput = byId<HTMLInputElement>('field-slug');
const dateInput = byId<HTMLInputElement>('field-date');
const descriptionInput = byId<HTMLTextAreaElement>('field-description');
const tagsInput = byId<HTMLInputElement>('field-tags');
const draftInput = byId<HTMLInputElement>('field-draft');
const coverInput = byId<HTMLInputElement>('field-cover');
const uploadCoverBtn = byId<HTMLButtonElement>('upload-cover');
const bodyInput = byId<HTMLTextAreaElement>('field-body');
const imageInput = byId<HTMLInputElement>('image-input');
const wordCount = byId<HTMLElement>('word-count');
const writePane = byId<HTMLElement>('write-pane');
const previewPane = byId<HTMLElement>('preview-pane');
const preview = byId<HTMLElement>('preview');
const tabWrite = byId<HTMLButtonElement>('tab-write');
const tabPreview = byId<HTMLButtonElement>('tab-preview');
const editorScroll = byId<HTMLElement>('admin-scroll');
const toasts = byId<HTMLElement>('toasts');

const confirmDialogEl = byId<HTMLDialogElement>('confirm-dialog');
const confirmTitle = byId<HTMLElement>('confirm-title');
const confirmText = byId<HTMLElement>('confirm-text');
const confirmOk = byId<HTMLButtonElement>('confirm-ok');

/* ==========================================================================
   通用工具
   ========================================================================== */

const pad = (value: number) => String(value).padStart(2, '0');

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function normalizeDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return todayISO();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function defaultSlug(): string {
  return `post-${(dateInput.value || todayISO()).replace(/-/g, '')}`;
}

function splitTags(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value.split(/[,，\n]/)) {
    const tag = item.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function toBase64(value: string): string {
  return arrayBufferToBase64(new TextEncoder().encode(value).buffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function safeFileName(name: string): string {
  const extension =
    name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'png';
  const stem =
    name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9\u3400-\u9fff-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'image';
  return `${stem}.${extension}`;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/* ==========================================================================
   GitHub API
   ========================================================================== */

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeaders(auth: Auth, accept = 'application/vnd.github+json'): Record<string, string> {
  return {
    Accept: accept,
    Authorization: `Bearer ${auth.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function github(
  path: string,
  init: { method?: string; body?: string } = {},
  auth: Auth | null = state.auth,
): Promise<Response> {
  if (!auth) throw new ApiError(401, '未登录');

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(auth.owner)}/${encodeURIComponent(auth.repo)}${path}`,
    {
      method: init.method ?? 'GET',
      body: init.body,
      headers: {
        ...authHeaders(auth),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    },
  );

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* 忽略非 JSON 错误 */
    }
    throw new ApiError(response.status, message);
  }

  return response;
}

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Token 无效或已过期，请重新生成一个 Token。';
    if (error.status === 403) {
      return `权限不足或触发了 GitHub 限流：${error.message}。请确认 Token 对该仓库拥有 Contents 读写权限。`;
    }
    if (error.status === 404) {
      return '找不到仓库或分支。请检查用户名、仓库名、分支，以及 Token 是否授权了该仓库。';
    }
    if (error.status === 409) return '远端文件已更新，可能是另一处修改造成的冲突。请刷新页面后重试。';
    return `GitHub 返回 ${error.status}：${error.message}`;
  }
  if (error instanceof TypeError) return '网络请求失败，请检查网络、代理或 GitHub 是否可访问。';
  return error instanceof Error ? error.message : '发生未知错误';
}

/* ==========================================================================
   登录状态
   ========================================================================== */

function readSavedAuth(): { auth: Auth; remember: boolean } | null {
  const stores: Array<[Storage, boolean]> = [];
  try {
    stores.push([localStorage, true]);
  } catch {
    /* 忽略 */
  }
  try {
    stores.push([sessionStorage, false]);
  } catch {
    /* 忽略 */
  }

  for (const [store, remember] of stores) {
    try {
      const raw = store.getItem(AUTH_KEY);
      if (!raw) continue;
      const data = JSON.parse(raw) as Partial<Auth>;
      if (data.token && data.owner && data.repo) {
        return {
          auth: {
            owner: data.owner,
            repo: data.repo,
            branch: data.branch || 'main',
            token: data.token,
          },
          remember,
        };
      }
    } catch {
      /* 忽略损坏的记录 */
    }
  }
  return null;
}

function saveAuth(auth: Auth, remember: boolean): void {
  clearAuth();
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {
    /* 隐私模式下可能失败，不影响本次会话 */
  }
}

function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* 忽略 */
  }
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* 忽略 */
  }
}

/* ==========================================================================
   Markdown frontmatter
   ========================================================================== */

function parseYamlLite(source: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = source.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const rest = match[2].trim();

    if (!rest) {
      const items: unknown[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^\s*-\s+/.test(lines[cursor])) {
        items.push(parseScalar(lines[cursor].replace(/^\s*-\s+/, '')));
        cursor += 1;
      }
      if (items.length > 0) {
        data[key] = items;
        index = cursor - 1;
      } else {
        data[key] = '';
      }
      continue;
    }

    data[key] = parseScalar(rest);
  }

  return data;
}

function parseScalar(raw: string): unknown {
  const value = raw.trim();
  if (!value) return '';

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];

    // 同时兼容 ["技术"]、['技术'] 和 [技术, 随笔] 三种写法
    const items: string[] = [];
    const pattern = /'(?:[^']|'')*'|"(?:\\.|[^"])*"|[^,]+/g;
    for (const match of inner.matchAll(pattern)) {
      const parsed = parseScalar(match[0].trim());
      if (parsed !== '' && parsed !== null && parsed !== undefined) {
        items.push(String(parsed));
      }
    }
    return items;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;

  return value;
}

function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { data: {}, body: normalized };

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: normalized };

  const matter = normalized.slice(4, end);
  let body = normalized.slice(end + 4);
  if (body.startsWith('\n')) body = body.slice(1);

  return { data: parseYamlLite(matter), body };
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function makePost(raw: string, entry: GitHubEntry): Post {
  const { data, body } = splitFrontmatter(raw);
  const slug = entry.name.replace(/\.md$/i, '');
  const title = typeof data.title === 'string' && data.title.trim() ? data.title : slug;

  return {
    path: entry.path,
    sha: entry.sha,
    slug,
    title,
    description: typeof data.description === 'string' ? data.description : '',
    date: normalizeDate(data.pubDate),
    updatedDate: data.updatedDate ? normalizeDate(data.updatedDate) : undefined,
    tags: normalizeTags(data.tags),
    draft: data.draft === true || data.draft === 'true',
    cover: typeof data.cover === 'string' ? data.cover : '',
    body: body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n',
    raw,
  };
}

function buildContent(doc: FormDoc): string {
  const lines = [
    '---',
    `title: ${JSON.stringify(doc.title)}`,
    `description: ${JSON.stringify(doc.description)}`,
    `pubDate: ${doc.date}`,
    ...(state.updatedDate ? [`updatedDate: ${state.updatedDate}`] : []),
    `tags: ${JSON.stringify(doc.tags)}`,
    `draft: ${doc.draft ? 'true' : 'false'}`,
    ...(doc.cover ? [`cover: ${JSON.stringify(doc.cover)}`] : []),
    '---',
    '',
  ];

  return `${lines.join('\n')}${doc.body.replace(/^\n+/, '').replace(/\s+$/, '')}\n`;
}

/* ==========================================================================
   表单
   ========================================================================== */

function readForm(): FormDoc {
  const title = titleInput.value.trim();
  // 已有文章沿用仓库里的文件名，避免历史文件中的大小写/下划线被规范化后无法保存
  const slug =
    state.isNew || !state.active ? slugify(slugInput.value) || defaultSlug() : state.active.slug;

  return {
    title,
    slug,
    description: descriptionInput.value.trim(),
    date: dateInput.value || todayISO(),
    tags: splitTags(tagsInput.value),
    draft: draftInput.checked,
    cover: coverInput.value.trim(),
    body: bodyInput.value,
  };
}

function currentContent(): string {
  return buildContent(readForm());
}

function updateWordCount(): void {
  const count = bodyInput.value.replace(/\s/g, '').length;
  wordCount.textContent = `${count} 字`;
}

function updateSaveUi(): void {
  const hasEditor = state.isNew || state.active !== null;
  saveBtn.disabled = !state.dirty || state.saving;
  saveBtn.textContent = state.saving ? '提交中…' : '保存';
  saveState.textContent = state.saving
    ? '正在提交…'
    : state.dirty
      ? '有未保存的修改'
      : hasEditor
        ? state.isNew
          ? '新文章'
          : '已同步'
        : '';
  saveState.className = `save-state${state.saving ? ' saving' : state.dirty ? ' dirty' : ''}`;
}

function markDirty(): void {
  if (!state.isNew && !state.active) return;
  state.dirty = currentContent() !== state.baseline;
  updateSaveUi();
}

function fillForm(doc: FormDoc, options: { editing: boolean; title: string }): void {
  titleInput.value = doc.title;
  slugInput.value = doc.slug;
  slugInput.readOnly = options.editing;
  dateInput.value = doc.date;
  descriptionInput.value = doc.description;
  tagsInput.value = doc.tags.join(', ');
  draftInput.checked = doc.draft;
  coverInput.value = doc.cover;
  bodyInput.value = doc.body;
  crumbTitle.textContent = options.title;
  form.hidden = false;
  emptyState.hidden = true;
  deleteBtn.hidden = !options.editing;
  previewLink.hidden = !options.editing;

  if (options.editing && state.active) {
    previewLink.href = `${env.base}posts/${encodeURIComponent(state.active.slug)}/`;
  }

  updateWordCount();
  updateSaveUi();
  void renderPreview();
}

function resetPreview(): void {
  preview.replaceChildren();
}

function clearEditor(): void {
  state.active = null;
  state.isNew = false;
  state.dirty = false;
  state.saving = false;
  state.baseline = '';
  state.updatedDate = undefined;
  state.slugTouched = false;
  form.hidden = true;
  emptyState.hidden = false;
  crumbTitle.textContent = '未选择';
  saveBtn.disabled = true;
  deleteBtn.hidden = true;
  previewLink.hidden = true;
  resetPreview();
  updateSaveUi();
  renderPostList();
}

/* ==========================================================================
   文章列表
   ========================================================================== */

function sortPosts(a: Post, b: Post): number {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN');
}

function renderPostList(): void {
  const query = postFilter.value.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    if (!query) return true;
    return [post.title, post.description, post.slug, ...post.tags]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  postList.replaceChildren();
  postTotal.textContent = `${state.posts.length} 篇`;

  if (posts.length === 0) {
    const message = document.createElement('p');
    message.className = 'list-empty';
    message.textContent = state.posts.length === 0 ? '仓库里还没有文章，点击上方按钮写第一篇。' : '没有匹配的文章。';
    postList.appendChild(message);
    return;
  }

  for (const post of posts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'post-item';
    if (state.active?.path === post.path) button.classList.add('active');

    const title = document.createElement('span');
    title.className = 'post-item-title';
    title.textContent = post.title;

    const meta = document.createElement('span');
    meta.className = 'post-item-meta';
    const date = document.createElement('span');
    date.textContent = post.date;
    meta.appendChild(date);
    if (post.draft) {
      const draft = document.createElement('span');
      draft.className = 'post-item-draft';
      draft.textContent = '草稿';
      meta.appendChild(draft);
    }

    button.append(title, meta);
    button.addEventListener('click', () => {
      void selectPost(post);
    });
    postList.appendChild(button);
  }
}

/* ==========================================================================
   打开 / 新建
   ========================================================================== */

function newDoc(): FormDoc {
  return {
    title: '',
    slug: '',
    description: '',
    date: todayISO(),
    tags: [],
    draft: false,
    cover: '',
    body: '',
  };
}

async function maybeDiscard(): Promise<boolean> {
  if (!state.dirty) return true;
  return confirmDialog({
    title: '放弃未保存的修改？',
    text: '当前编辑的内容还没有提交到 GitHub，离开后会丢失。',
    okText: '放弃修改',
  });
}

async function selectPost(post: Post): Promise<void> {
  if (state.saving) return;
  if (!(await maybeDiscard())) return;

  state.active = post;
  state.isNew = false;
  state.slugTouched = true;
  state.updatedDate = post.updatedDate;

  fillForm(
    {
      title: post.title,
      slug: post.slug,
      description: post.description,
      date: post.date,
      tags: post.tags,
      draft: post.draft,
      cover: post.cover,
      body: post.body,
    },
    { editing: true, title: post.title },
  );

  state.baseline = currentContent();
  state.dirty = false;
  updateSaveUi();
  renderPostList();
  editorScroll.scrollTop = 0;
  closeSidebarOnMobile();
}

async function startNew(): Promise<void> {
  if (state.saving) return;
  if (!(await maybeDiscard())) return;

  state.active = null;
  state.isNew = true;
  state.slugTouched = false;
  state.updatedDate = undefined;

  fillForm(newDoc(), { editing: false, title: '新文章' });
  state.baseline = currentContent();
  state.dirty = false;
  updateSaveUi();
  renderPostList();
  editorScroll.scrollTop = 0;
  closeSidebarOnMobile();
  titleInput.focus();
}

/* ==========================================================================
   保存 / 删除
   ========================================================================== */

async function savePost(): Promise<void> {
  if (!state.auth || state.saving) return;
  if (!state.isNew && !state.active) return;

  const doc = readForm();
  if (!doc.title) {
    toast('请先填写标题。', 'error');
    titleInput.focus();
    return;
  }
  if (!doc.slug) {
    toast('请填写链接别名（slug）。', 'error');
    slugInput.focus();
    return;
  }
  if (state.isNew && state.posts.some((post) => post.slug === doc.slug)) {
    toast('这个 slug 已经被占用了，换一个吧。', 'error');
    slugInput.focus();
    return;
  }
  if (!state.isNew && state.active && doc.slug !== state.active.slug) {
    toast('slug 创建后不可修改。', 'error');
    return;
  }
  if (currentContent() === state.baseline) {
    toast('没有需要保存的修改。');
    return;
  }

  state.saving = true;
  updateSaveUi();

  try {
    if (!state.isNew) state.updatedDate = todayISO();
    const content = currentContent();
    const path = `src/content/posts/${doc.slug}.md`;
    const payload: Record<string, unknown> = {
      message: `${state.isNew ? '新增' : '更新'}文章：${doc.title}`,
      content: toBase64(content),
      branch: state.auth.branch,
    };
    if (!state.isNew && state.active?.sha) payload.sha = state.active.sha;

    const response = await github(`/contents/${encodePath(path)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { content?: { sha?: string } };

    const post: Post = {
      path,
      sha: result.content?.sha ?? '',
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      date: doc.date,
      updatedDate: state.updatedDate,
      tags: doc.tags,
      draft: doc.draft,
      cover: doc.cover,
      body: doc.body.replace(/^\n+/, '').replace(/\s+$/, '') + '\n',
      raw: content,
    };

    state.active = post;
    state.isNew = false;
    state.baseline = content;
    state.dirty = false;
    state.slugTouched = true;
    slugInput.value = doc.slug;
    slugInput.readOnly = true;
    crumbTitle.textContent = doc.title;
    deleteBtn.hidden = false;
    previewLink.hidden = false;
    previewLink.href = `${env.base}posts/${encodeURIComponent(doc.slug)}/`;

    const index = state.posts.findIndex((item) => item.path === path);
    if (index >= 0) state.posts[index] = post;
    else state.posts.push(post);
    state.posts.sort(sortPosts);
    renderPostList();

    toast('已提交到 GitHub，Actions 正在部署。', 'success', {
      href: actionsLink.href,
      label: '查看进度',
    });
  } catch (error) {
    toast(friendlyError(error), 'error');
  } finally {
    state.saving = false;
    updateSaveUi();
  }
}

async function deletePost(): Promise<void> {
  if (!state.auth || !state.active || state.isNew || state.saving) return;

  const post = state.active;
  const confirmed = await confirmDialog({
    title: '删除这篇文章？',
    text: `「${post.title}」会从仓库中删除并触发重新部署。Git 历史里仍然可以找回。`,
    okText: '删除',
  });
  if (!confirmed) return;

  state.saving = true;
  updateSaveUi();

  try {
    await github(`/contents/${encodePath(post.path)}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `删除文章：${post.title}`,
        sha: post.sha,
        branch: state.auth.branch,
      }),
    });

    state.posts = state.posts.filter((item) => item.path !== post.path);
    clearEditor();
    toast('文章已删除，正在重新部署。');
  } catch (error) {
    toast(friendlyError(error), 'error');
  } finally {
    state.saving = false;
    updateSaveUi();
  }
}

/* ==========================================================================
   Markdown 预览
   ========================================================================== */

type MarkedModule = typeof import('marked');
type PurifyModule = {
  sanitize: (html: string, options?: Record<string, unknown>) => string;
};

let markedModule: MarkedModule | null = null;
let purifyModule: PurifyModule | null = null;
let previewTimer: number | undefined;

async function renderPreview(): Promise<void> {
  if (!markedModule || !purifyModule) {
    const [markedImport, purifyImport] = await Promise.all([import('marked'), import('dompurify')]);
    markedModule = markedImport;
    purifyModule = purifyImport.default;
  }

  const html = markedModule.marked.parse(bodyInput.value, {
    gfm: true,
    breaks: false,
  }) as string;

  let clean = purifyModule.sanitize(html, { USE_PROFILES: { html: true } });
  const base = env.base.replace(/\/$/, '');
  if (base) {
    clean = clean.replace(/(src|href)="\/(?!\/)/g, `$1="${base}/`);
  }
  preview.innerHTML = clean;
}

function schedulePreview(): void {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    void renderPreview();
  }, 180);
}

function onBodyInput(): void {
  updateWordCount();
  markDirty();
  schedulePreview();
}

/* ==========================================================================
   Markdown 工具栏
   ========================================================================== */

function surround(before: string, after = before, placeholder = '文字'): void {
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const selected = bodyInput.value.slice(start, end) || placeholder;
  bodyInput.setRangeText(`${before}${selected}${after}`, start, end, 'end');
  bodyInput.selectionStart = start + before.length;
  bodyInput.selectionEnd = start + before.length + selected.length;
  bodyInput.focus();
  onBodyInput();
}

function prefixLines(prefix: string): void {
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const value = bodyInput.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end);
  const chunk = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
  const next = chunk
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');

  bodyInput.setRangeText(next, lineStart, lineEnd === -1 ? value.length : lineEnd, 'select');
  bodyInput.focus();
  onBodyInput();
}

function insertBlock(text: string): void {
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const before = bodyInput.value.slice(0, start);
  const prefix = before && !before.endsWith('\n') ? '\n\n' : '';
  bodyInput.setRangeText(`${prefix}${text}\n`, start, end, 'end');
  bodyInput.focus();
  onBodyInput();
}

function applyInsert(kind: string): void {
  switch (kind) {
    case 'h2':
      prefixLines('## ');
      break;
    case 'h3':
      prefixLines('### ');
      break;
    case 'bold':
      surround('**', '**', '加粗文字');
      break;
    case 'italic':
      surround('*', '*', '斜体文字');
      break;
    case 'quote':
      prefixLines('> ');
      break;
    case 'inline-code':
      surround('`', '`', 'code');
      break;
    case 'code-block':
      surround('\n```\n', '\n```\n', '// 在这里写代码');
      break;
    case 'link':
      surround('[', '](https://)', '链接文字');
      break;
    case 'list':
      prefixLines('- ');
      break;
    case 'ordered':
      prefixLines('1. ');
      break;
    case 'table':
      insertBlock('| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |');
      break;
    case 'hr':
      insertBlock('---');
      break;
    case 'image':
      imageInput.click();
      break;
    default:
      break;
  }
}

/* ==========================================================================
   图片上传
   ========================================================================== */

async function uploadFiles(files: File[], target: 'body' | 'cover'): Promise<void> {
  if (!state.auth) return;

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      toast(`${file.name} 不是图片文件。`, 'error');
      continue;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast(`${file.name} 超过 8MB，请压缩后再上传。`, 'error');
      continue;
    }

    try {
      const fileName = `${Date.now().toString(36)}-${safeFileName(file.name)}`;
      const path = `public/images/${fileName}`;
      const content = arrayBufferToBase64(await file.arrayBuffer());

      await github(`/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `上传图片：${file.name}`,
          content,
          branch: state.auth.branch,
        }),
      });

      const url = `/images/${fileName}`;
      if (target === 'cover') {
        coverInput.value = url;
        markDirty();
      } else {
        insertBlock(`![${file.name.replace(/\.[^.]+$/, '')}](${url})`);
      }
      toast(`图片 ${file.name} 已上传。`);
    } catch (error) {
      toast(friendlyError(error), 'error');
    }
  }
}

/* ==========================================================================
   连接与视图
   ========================================================================== */

function showLoginError(message: string): void {
  loginError.textContent = message;
  loginError.hidden = !message;
}

function setLoginBusy(busy: boolean): void {
  loginBtn.disabled = busy;
  loginBtn.textContent = busy ? '连接中…' : '连接仓库';
}

function setRepoUi(auth: Auth): void {
  repoLabel.textContent = `${auth.owner}/${auth.repo} · ${auth.branch}`;
  branchLabel.textContent = auth.branch;
  siteLink.href = env.base;
  actionsLink.href = `https://github.com/${auth.owner}/${auth.repo}/actions`;
}

function showEditor(): void {
  loginView.hidden = true;
  editorView.hidden = false;
  document.title = `文章管理 · ${env.site}`;
}

function showLogin(): void {
  editorView.hidden = true;
  loginView.hidden = false;
  document.title = `登录 · ${env.site}`;
}

async function connect(
  auth: Auth,
  options: { silent?: boolean; remember?: boolean } = {},
): Promise<void> {
  if (state.connecting) return;
  state.connecting = true;
  setLoginBusy(true);
  showLoginError('');

  try {
    const response = await github('', {}, auth);
    const repoInfo = (await response.json()) as { default_branch?: string };
    const finalAuth: Auth = {
      ...auth,
      branch: auth.branch || repoInfo.default_branch || 'main',
    };

    state.auth = finalAuth;
    setRepoUi(finalAuth);
    await loadPosts();

    saveAuth(finalAuth, options.remember ?? rememberInput.checked);
    showEditor();
    updateSaveUi();

    if (options.silent) toast('已用保存的令牌连接仓库。');
  } catch (error) {
    state.auth = null;
    state.posts = [];
    state.active = null;
    showLogin();
    showLoginError(
      options.silent
        ? `保存的登录已失效，请重新输入 Token。${friendlyError(error)}`
        : friendlyError(error),
    );
  } finally {
    state.connecting = false;
    setLoginBusy(false);
  }
}

async function loadPosts(): Promise<void> {
  if (!state.auth) return;

  setListMessage('正在读取文章…');

  try {
    const response = await github(
      `/contents/src/content/posts?ref=${encodeURIComponent(state.auth.branch)}`,
    );
    const entries = (await response.json()) as GitHubEntry[];
    const files = entries.filter((entry) => entry.type === 'file' && /\.md$/i.test(entry.name));

    const posts = await mapLimit(files, 6, async (entry) => {
      const fileResponse = await fetch(entry.url, {
        headers: authHeaders(state.auth!, 'application/vnd.github.raw'),
      });
      if (!fileResponse.ok) {
        throw new ApiError(fileResponse.status, `读取 ${entry.name} 失败`);
      }
      return makePost(await fileResponse.text(), entry);
    });

    state.posts = posts.sort(sortPosts);
    renderPostList();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      state.posts = [];
      renderPostList();
      return;
    }
    throw error;
  }
}

function setListMessage(message: string): void {
  postList.replaceChildren();
  const paragraph = document.createElement('p');
  paragraph.className = 'list-empty';
  paragraph.textContent = message;
  postList.appendChild(paragraph);
}

/* ==========================================================================
   侧栏 / 对话框 / Toast
   ========================================================================== */

function openSidebar(): void {
  editorView.classList.add('sidebar-open');
  sidebarBackdrop.hidden = false;
}

function closeSidebar(): void {
  editorView.classList.remove('sidebar-open');
  sidebarBackdrop.hidden = true;
}

function closeSidebarOnMobile(): void {
  if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
}

function confirmDialog(options: {
  title: string;
  text: string;
  okText?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    confirmTitle.textContent = options.title;
    confirmText.textContent = options.text;
    confirmOk.textContent = options.okText ?? '确认';

    if (confirmDialogEl.open) confirmDialogEl.close();
    confirmDialogEl.returnValue = '';

    const onClose = () => {
      confirmDialogEl.removeEventListener('close', onClose);
      resolve(confirmDialogEl.returnValue === 'ok');
    };

    confirmDialogEl.addEventListener('close', onClose);
    confirmDialogEl.showModal();
  });
}

function toast(
  message: string,
  type: 'success' | 'error' = 'success',
  link?: { href: string; label: string },
): void {
  const node = document.createElement('div');
  node.className = `toast${type === 'error' ? ' toast-error' : ''}`;

  const text = document.createElement('span');
  text.textContent = message;
  node.appendChild(text);

  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    node.appendChild(anchor);
  }

  toasts.appendChild(node);
  while (toasts.children.length > 3) toasts.firstElementChild?.remove();
  window.setTimeout(() => node.remove(), 6000);
}

/* ==========================================================================
   标签页 / 事件绑定
   ========================================================================== */

function setTab(tab: 'write' | 'preview'): void {
  const isWrite = tab === 'write';
  writePane.classList.toggle('active', isWrite);
  previewPane.classList.toggle('active', !isWrite);
  tabWrite.classList.toggle('active', isWrite);
  tabPreview.classList.toggle('active', !isWrite);
  tabWrite.setAttribute('aria-selected', String(isWrite));
  tabPreview.setAttribute('aria-selected', String(!isWrite));
  if (!isWrite) void renderPreview();
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.connecting) return;

  const auth: Auth = {
    owner: ownerInput.value.trim(),
    repo: repoInput.value.trim(),
    branch: branchInput.value.trim() || 'main',
    token: tokenInput.value.trim(),
  };

  if (!auth.owner || !auth.repo || !auth.token) {
    showLoginError('请填写 GitHub 用户名、仓库名和 Token。');
    return;
  }

  void connect(auth, { remember: rememberInput.checked });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void savePost();
});

titleInput.addEventListener('input', () => {
  if (state.isNew && !state.slugTouched) {
    const generated = slugify(titleInput.value);
    slugInput.value = generated || defaultSlug();
  }
  if (state.active || state.isNew) {
    crumbTitle.textContent = titleInput.value.trim() || (state.isNew ? '新文章' : '未命名');
  }
  markDirty();
});

slugInput.addEventListener('input', () => {
  state.slugTouched = true;
  markDirty();
});

dateInput.addEventListener('input', () => {
  if (state.isNew && !state.slugTouched && !slugInput.value) {
    slugInput.value = defaultSlug();
  }
  markDirty();
});

descriptionInput.addEventListener('input', markDirty);
tagsInput.addEventListener('input', markDirty);
coverInput.addEventListener('input', markDirty);
draftInput.addEventListener('change', markDirty);
bodyInput.addEventListener('input', onBodyInput);

document.querySelectorAll<HTMLButtonElement>('[data-insert]').forEach((button) => {
  button.addEventListener('click', () => applyInsert(button.dataset.insert ?? ''));
});

tabWrite.addEventListener('click', () => setTab('write'));
tabPreview.addEventListener('click', () => setTab('preview'));

imageInput.addEventListener('change', () => {
  const files = Array.from(imageInput.files ?? []);
  imageInput.value = '';
  void uploadFiles(files, 'body');
});

uploadCoverBtn.addEventListener('click', () => {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/*';
  picker.addEventListener('change', () => {
    const files = Array.from(picker.files ?? []);
    void uploadFiles(files, 'cover');
  });
  picker.click();
});

newPostBtn.addEventListener('click', () => void startNew());
newPostEmptyBtn.addEventListener('click', () => void startNew());
saveBtn.addEventListener('click', () => void savePost());
deleteBtn.addEventListener('click', () => void deletePost());

postFilter.addEventListener('input', renderPostList);

sidebarOpen.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);

logoutBtn.addEventListener('click', async () => {
  if (!(await maybeDiscard())) return;
  clearAuth();
  state.auth = null;
  state.posts = [];
  state.active = null;
  state.isNew = false;
  state.dirty = false;
  tokenInput.value = '';
  postList.replaceChildren();
  clearEditor();
  showLoginError('');
  showLogin();
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    if (!editorView.hidden) {
      event.preventDefault();
      void savePost();
    }
  }
});

window.addEventListener('beforeunload', (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});

/* ==========================================================================
   初始化
   ========================================================================== */

const saved = readSavedAuth();
const initialOwner = env.owner || saved?.auth.owner || '';
const initialRepo = env.repo || saved?.auth.repo || '';
const initialBranch = env.branch || saved?.auth.branch || 'main';

ownerInput.value = initialOwner;
repoInput.value = initialRepo;
branchInput.value = initialBranch;
siteLink.href = env.base;
rememberInput.checked = saved?.remember ?? true;

if (saved?.auth.token && initialOwner && initialRepo) {
  tokenInput.value = saved.auth.token;
  void connect(
    {
      owner: initialOwner,
      repo: initialRepo,
      branch: initialBranch,
      token: saved.auth.token,
    },
    { silent: true, remember: saved.remember },
  );
} else {
  showLogin();
}
