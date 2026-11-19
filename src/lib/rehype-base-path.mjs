/**
 * 给 Markdown 里的站内绝对路径补上 GitHub Pages 的 base 前缀。
 * 例如 base=/my-blog 时：![](/images/a.png) -> ![](/my-blog/images/a.png)
 */
export default function rehypeBasePath(options = {}) {
  const base = (options.base || '/').replace(/\/$/, '');
  if (!base) return () => {};

  return (tree) => {
    walk(tree);
  };

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'element') {
      const props = node.properties || (node.properties = {});
      if (node.tagName === 'img' && typeof props.src === 'string') {
        props.src = prefix(props.src);
      }
      if (node.tagName === 'a' && typeof props.href === 'string') {
        props.href = prefix(props.href);
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }

  function prefix(value) {
    if (!value.startsWith('/') || value.startsWith('//')) return value;
    return base + value;
  }
}
