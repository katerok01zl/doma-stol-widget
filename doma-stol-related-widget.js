(function boot(attempt){
const DB=window.DS_RELATED_DB;
if(!DB){
 document.documentElement.setAttribute('data-ds-related-status','waiting-for-data');
 if(attempt<100)setTimeout(()=>boot(attempt+1),100);
 return;
}
document.documentElement.setAttribute('data-ds-related-status','running');
const ROOTS='.t-store__product-snippet,.t-store__product-popup,.t-store__prod-popup__container,.t-catalog__product-snippet,.t-catalog__product-popup,.t-catalog__prod-popup__container,.js-product[data-product-uid]';
const UID_INDEX={};Object.keys(DB.index||{}).forEach(p=>{const m=p.match(/^\/tproduct\/(\d+)/);if(m)UID_INDEX[m[1]]=p});
const norm=p=>{try{const raw=String(p||'').replace(/^#!?/,'');const m=raw.match(/\/tproduct\/[^/?#]+/);if(m)return m[0].replace(/\/$/,"");const u=new URL(raw,location.origin);const n=u.pathname.match(/\/tproduct\/[^/?#]+/);return n?n[0].replace(/\/$/,""):""}catch(e){return""}};
function currentPath(root){
 const values=[root?.getAttribute?.('data-product-url'),root?.querySelector?.('[data-product-url]')?.getAttribute('data-product-url'),root?.querySelector?.('a[href*="/tproduct/"]')?.getAttribute('href'),location.pathname,location.hash];
 for(const v of values){const p=norm(v);if(p&&DB.index[p])return p}
 const uid=root?.getAttribute?.('data-product-uid')||root?.getAttribute?.('data-product-lid')||root?.querySelector?.('[data-product-uid]')?.getAttribute('data-product-uid')||root?.querySelector?.('[data-product-lid]')?.getAttribute('data-product-lid');
 return uid&&UID_INDEX[String(uid)]?UID_INDEX[String(uid)]:'';
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mount(root){
 if(!root||root.querySelector?.('.ds-related'))return;
 const path=currentPath(root),group=path&&DB.index[path],variants=group&&DB.groups[group];if(!variants||variants.length<2)return;
 const info=root.matches?.('.t-store__prod-popup__info,.t-catalog__prod-popup__info')?root:root.querySelector?.('.t-store__prod-popup__info,.t-catalog__prod-popup__info,.t-store__product-snippet,.t-catalog__product-snippet')||root;
 const anchor=info.querySelector?.('.t-store__prod-popup__price-wrapper,.t-catalog__prod-popup__price-wrapper,.js-product-controls-wrapper,.t-product__option')||info.firstElementChild;
 const box=document.createElement('div');box.className='ds-related';box.innerHTML='<div class="ds-related__title">Другие цвета и варианты</div><div class="ds-related__list"></div>';
 const list=box.lastElementChild;variants.forEach(v=>{if(!v.path)return;const a=document.createElement('a');a.className='ds-related__item'+(v.path===path?' is-active':'');a.href=v.url||v.path;a.title=v.title;a.innerHTML=(v.image?'<img class="ds-related__img" loading="lazy" decoding="async" alt="'+esc(v.label)+'" src="'+esc(v.image)+'">':'<span class="ds-related__img ds-related__img--empty"></span>')+'<span class="ds-related__label">'+esc(v.label)+'</span>';list.appendChild(a)});
 if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else info.appendChild(box);
}
function scan(scope=document){scope.querySelectorAll?.(ROOTS).forEach(mount);if(scope.matches?.(ROOTS))mount(scope)}
let queued=false,pending=[];const queue=nodes=>{pending.push(...nodes);if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const nodes=pending.splice(0);nodes.forEach(scan);scan()})};
function start(){scan();document.documentElement.setAttribute('data-ds-related-status',document.querySelector('.ds-related')?'mounted':'watching');new MutationObserver(ms=>queue(ms.flatMap(m=>[...m.addedNodes]).filter(n=>n.nodeType===1))).observe(document.body,{childList:true,subtree:true});window.addEventListener('popstate',()=>setTimeout(scan,100));window.addEventListener('hashchange',()=>setTimeout(scan,100));document.addEventListener('click',e=>{if(e.target.closest?.('a[href*="/tproduct/"]'))setTimeout(scan,450)})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})(0);
