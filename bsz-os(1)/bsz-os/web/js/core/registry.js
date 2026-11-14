// Plugin points. Applets are full-screen mini apps launched from Home. Parts (old widgets) are reusable blocks applets can embed.
export const widgets = new Map();   // parts: small reusable blocks, composed inside applets
export const pages = new Map();     // applets (kept under the old name so core code still works)
export const defineWidget = d => widgets.set(d.id, { size: 'm', group: 'Tools', icon: '◇', desc: '', ...d });
// defineApplet({id,title,icon,group,desc,render(view) -> optional cleanup})
export const defineApplet = d => pages.set(d.id, { group: 'Tools', desc: '', ...d });
export const definePage = defineApplet;
