(() => {
'use strict';
const links = [...document.querySelectorAll('a[data-lightbox]')];
if (!links.length || typeof HTMLDialogElement === 'undefined') return;
const dialog = document.createElement('dialog');
dialog.className = 'image-dialog';
dialog.setAttribute('aria-labelledby', 'image-viewer-title');
dialog.innerHTML = '<div class="viewer-header"><h2 id="image-viewer-title"></h2><button class="viewer-close" type="button" autofocus>Close ×</button></div><div class="viewer-body"></div>';
document.body.append(dialog);
let opener = null;
const close = () => dialog.close();
dialog.querySelector('button').addEventListener('click', close);
dialog.addEventListener('keydown', e => { if(e.key === 'Tab'){e.preventDefault();dialog.querySelector('button').focus();} });
dialog.addEventListener('click', e => { if(e.target === dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();} });
dialog.addEventListener('close', () => { document.body.classList.remove('viewer-open'); if(opener)opener.focus(); });
links.forEach(link => link.addEventListener('click', e => {
if(e.button!==0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
e.preventDefault(); opener=link;
const original=link.querySelector('img');
dialog.querySelector('h2').textContent=link.dataset.lightbox || original.alt;
const frame=link.querySelector('.screenshot-frame');
let content;
if(frame){content=frame.cloneNode(true);const im=content.querySelector('img');content.style.setProperty('--viewer-width', `min(${im.width}px, ${Number(im.getAttribute('width'))/Number(im.getAttribute('height'))*76}vh)`);im.loading='eager';}
else {content=document.createElement('img');content.src=link.href;content.alt=original.alt;}
dialog.querySelector('.viewer-body').replaceChildren(content);
dialog.showModal();document.body.classList.add('viewer-open');
}));
})();