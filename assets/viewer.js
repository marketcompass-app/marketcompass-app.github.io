'use strict';
(() => {
  const dialog = document.getElementById('image-viewer');
  if (!dialog) return;
  const stage = dialog.querySelector('.viewer-stage');
  const canvas = dialog.querySelector('.viewer-canvas');
  const picture = dialog.querySelector('.viewer-image');
  const title = dialog.querySelector('#viewer-title');
  const status = dialog.querySelector('#viewer-zoom-status');
  const closeButton = dialog.querySelector('[data-viewer-action="close"]');
  const minus = dialog.querySelector('[data-viewer-action="out"]');
  const plus = dialog.querySelector('[data-viewer-action="in"]');
  let opener = null, fit = 1, zoom = 1, actualMode = false, drag = null, resizeDrag = null, suppressClick = false;
  const resizeHandle = dialog.querySelector('.viewer-resize');
  let oldBodyOverflow = '', oldHtmlOverflow = '', oldPadding = '', scrollX = 0, scrollY = 0;

  function sizeImage(next = zoom, reset = false) {
    if (!dialog.open || !picture.naturalWidth) return;
    const oldW = picture.getBoundingClientRect().width || 1;
    const oldH = picture.getBoundingClientRect().height || 1;
    const oldX = Math.max(0, (canvas.clientWidth - oldW) / 2);
    const oldY = Math.max(0, (canvas.clientHeight - oldH) / 2);
    const anchorX = (stage.scrollLeft + stage.clientWidth / 2 - oldX) / oldW;
    const anchorY = (stage.scrollTop + stage.clientHeight / 2 - oldY) / oldH;
    fit = Math.min((stage.clientWidth - 32) / picture.naturalWidth, (stage.clientHeight - 32) / picture.naturalHeight, 1);
    fit = Math.max(0.02, fit);
    zoom = actualMode ? 1 / fit : Math.min(Math.max(next, 1), Math.max(8, 1 / fit));
    const width = Math.round(picture.naturalWidth * fit * zoom);
    const height = Math.round(picture.naturalHeight * fit * zoom);
    picture.style.width = width + 'px';
    picture.style.height = height + 'px';
    canvas.style.width = Math.max(stage.clientWidth, width + 32) + 'px';
    canvas.style.height = Math.max(stage.clientHeight, height + 32) + 'px';
    if (reset || zoom === 1) {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    } else {
      stage.scrollLeft = anchorX * width + Math.max(0, (canvas.clientWidth - width) / 2) - stage.clientWidth / 2;
      stage.scrollTop = anchorY * height + Math.max(0, (canvas.clientHeight - height) / 2) - stage.clientHeight / 2;
    }
    status.textContent = Math.round(fit * zoom * 100) + '%';
    minus.disabled = zoom <= 1.001;
    plus.disabled = zoom >= Math.max(8, 1 / fit) - 0.001;
    stage.classList.toggle('is-zoomed', zoom > 1.001);
  }

  function closeViewer() {
    if (dialog.open) dialog.close();
  }

  function openViewer(button) {
    const src = button.dataset.imageSrc;
    if (!src || !src.startsWith('assets/')) return;
    opener = button;
    suppressClick = false;
    scrollX = window.scrollX;
    scrollY = window.scrollY;
    oldBodyOverflow = document.body.style.overflow;
    oldHtmlOverflow = document.documentElement.style.overflow;
    oldPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    title.textContent = button.dataset.imageTitle || 'Image detail';
    picture.alt = button.dataset.imageAlt || button.querySelector('img')?.alt || title.textContent;
    status.textContent = 'Loading';
    picture.style.width = '1px';
    picture.style.height = '1px';
    zoom = 1;
    actualMode = false;
    dialog.style.width = '';
    dialog.style.height = '';
    dialog.showModal();
    closeButton.focus();
    picture.onload = () => sizeImage(1, true);
    picture.onerror = () => { status.textContent = 'Image unavailable'; };
    picture.src = src;
    if (picture.complete && picture.naturalWidth) sizeImage(1, true);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-image-src]');
    if (button) openViewer(button);
  });

  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-viewer-action]')?.dataset.viewerAction;
    if (action === 'close') closeViewer();
    if (action === 'in') { actualMode = false; sizeImage(zoom * 1.4); }
    if (action === 'out') { actualMode = false; sizeImage(zoom / 1.4); }
    if (action === 'fit') { actualMode = false; sizeImage(1, true); }
    if (action === 'actual') { actualMode = true; sizeImage(1 / fit); }
    if (action === 'smaller' || action === 'larger') {
      const r = dialog.getBoundingClientRect(), factor = action === 'larger' ? 1.15 : 1 / 1.15;
      resizePopup(r.width * factor, r.height * factor);
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = oldBodyOverflow;
    document.documentElement.style.overflow = oldHtmlOverflow;
    document.body.style.paddingRight = oldPadding;
    drag = null;
    resizeDrag = null;
    stage.classList.remove('is-dragging');
    window.scrollTo(scrollX, scrollY);
    opener?.focus({preventScroll:true});
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeViewer(); return; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); actualMode = false; sizeImage(zoom * 1.4); }
    if (event.key === '-') { event.preventDefault(); actualMode = false; sizeImage(zoom / 1.4); }
    if (event.key === '0') { event.preventDefault(); actualMode = false; sizeImage(1, true); }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled]),[tabindex="0"]')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  stage.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    if (event.target === stage || event.target === canvas) closeViewer();
  });
  stage.addEventListener('dblclick', event => { if (event.target === picture) { actualMode = zoom <= 1.01; sizeImage(actualMode ? 1 / fit : 1, !actualMode); } });
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || zoom <= 1.001) return;
    drag = {x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop,moved:false};
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
  });
  function finishDrag() { if (drag?.moved) suppressClick = true; drag = null; stage.classList.remove('is-dragging'); }
  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', finishDrag);
  function resizePopup(width, height) {
    const mobile = window.innerWidth <= 600;
    const maxWidth = window.innerWidth * (mobile ? .94 : .92);
    const maxHeight = window.innerHeight * .88;
    dialog.style.width = Math.round(Math.min(maxWidth, Math.max(Math.min(300, maxWidth), width))) + 'px';
    dialog.style.height = Math.round(Math.min(maxHeight, Math.max(Math.min(320, maxHeight), height))) + 'px';
  }
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const r = dialog.getBoundingClientRect();
    resizeDrag = {x:event.clientX, y:event.clientY, width:r.width, height:r.height};
    resizeHandle.setPointerCapture(event.pointerId);
    resizeHandle.focus();
  });
  resizeHandle.addEventListener('pointermove', event => {
    if (!resizeDrag) return;
    // The popup stays centered, so a corner movement changes both edges equally.
    resizePopup(resizeDrag.width + 2 * (event.clientX - resizeDrag.x), resizeDrag.height + 2 * (event.clientY - resizeDrag.y));
  });
  resizeHandle.addEventListener('pointerup', () => { resizeDrag = null; });
  resizeHandle.addEventListener('pointercancel', () => { resizeDrag = null; });
  resizeHandle.addEventListener('keydown', event => {
    const r = dialog.getBoundingClientRect();
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      resizePopup(r.width + (event.key === 'ArrowLeft' ? -40 : event.key === 'ArrowRight' ? 40 : 0), r.height + (event.key === 'ArrowUp' ? -40 : event.key === 'ArrowDown' ? 40 : 0));
    }
  });
  new ResizeObserver(() => { if (dialog.open) sizeImage(zoom, zoom === 1); }).observe(stage);
  picture.addEventListener('dragstart', event => event.preventDefault());
  window.addEventListener('resize', () => { if (dialog.open) sizeImage(zoom, zoom === 1); });
})();
