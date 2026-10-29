// Keep cards, controls and focused nodes alive across online snapshots.
const key = (node: Node): string => {
  if (!(node instanceof Element)) return node.nodeName;
  for (const name of ['data-action','data-chip','data-seat','data-hand']) {
    if (node.hasAttribute(name)) return `${node.tagName}:${name}:${node.getAttribute(name)}`;
  }
  return `${node.tagName}:${node.getAttribute('class')?.split(' ')[0] || ''}`;
};
function reconcile(parent: Node, desired: Node) {
  const remaining = [...parent.childNodes];
  let cursor = parent.firstChild;
  for (const next of [...desired.childNodes]) {
    const index = remaining.findIndex(node => key(node) === key(next));
    const current: Node = index < 0 ? next.cloneNode(true) : remaining.splice(index, 1)[0];
    if (index < 0) {
      parent.insertBefore(current, cursor);
    } else {
      if (current !== cursor) parent.insertBefore(current, cursor);
      if (current instanceof Element && next instanceof Element) {
        for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
        for (const attr of [...next.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
        reconcile(current, next);
      } else if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    }
    cursor = current.nextSibling;
  }
  for (const node of remaining) parent.removeChild(node);
}
export function patchHTML(parent: HTMLElement, html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  reconcile(parent, template.content);
}
