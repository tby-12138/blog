/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** GitHub 用户名，例如 octocat（构建时注入，用于预填管理台） */
  readonly PUBLIC_REPO_OWNER?: string;
  /** 仓库名，例如 my-blog */
  readonly PUBLIC_REPO_NAME?: string;
  /** 分支名，默认 main */
  readonly PUBLIC_REPO_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
