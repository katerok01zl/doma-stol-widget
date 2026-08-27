(function boot(attempt){
const DB=window.DS_RELATED_DB;
if(!DB){
 document.documentElement.setAttribute('data-ds-related-status','waiting-for-data');
 if(attempt<100)setTimeout(()=>boot(attempt+1),100);
 return;
}
document.documentElement.setAttribute('data-ds-related-status','running');
const ROOTS='.t-store__product-popup,.t-store__prod-popup__container,.t-catalog__product-snippet,.t-catalog__product-popup,.t-catalog__prod-popup__container';
const UID_INDEX={};Object.keys(DB.index||{}).forEach(p=>{const m=p.match(/^\/tproduct\/(\d+)/);if(m)UID_INDEX[m[1]]=p});
const normTitle=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^0-9a-zа-я]+/g,' ').trim().replace(/\s+/g,' ');
const EXCLUDED_TITLES=new Set([
 'стол марко 130 пластик азул оникс каркас цвет орех',
 'стол марко 120 шпон орех каркас орех',
 'стол марко 130 шпон орех каркас орех'
]);
const isExcluded=v=>EXCLUDED_TITLES.has(normTitle(v?.title));
const normanLength=v=>{const m=normTitle(v?.title).match(/^стол(?: кухонный)? норман (\d{2,3})\b/);return m?m[1]:''};
const norm=p=>{try{const raw=String(p||'').replace(/^#!?/,'');const m=raw.match(/\/tproduct\/[^/?#]+/);if(m)return m[0].replace(/\/$/,"");const u=new URL(raw,location.origin);const n=u.pathname.match(/\/tproduct\/[^/?#]+/);return n?n[0].replace(/\/$/,""):""}catch(e){return""}};
function mappedPath(value){const p=norm(value);if(!p)return'';if(DB.index[p])return p;const m=p.match(/^\/tproduct\/(\d+)/);return m&&UID_INDEX[m[1]]?UID_INDEX[m[1]]:''}
function currentPath(root){
 const hashPath=mappedPath(location.hash);if(hashPath)return hashPath;
 const values=[root?.getAttribute?.('data-product-url'),root?.querySelector?.('[data-product-url]')?.getAttribute('data-product-url'),root?.querySelector?.('a[href*="/tproduct/"]')?.getAttribute('href')];
 for(const v of values){const p=mappedPath(v);if(p)return p}
 const uid=root?.getAttribute?.('data-product-uid')||root?.getAttribute?.('data-product-lid')||root?.querySelector?.('[data-product-uid]')?.getAttribute('data-product-uid')||root?.querySelector?.('[data-product-lid]')?.getAttribute('data-product-lid');
 if(uid&&UID_INDEX[String(uid)])return UID_INDEX[String(uid)];
 return mappedPath(location.pathname);
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mount(root){
 if(!root)return;
 const existing=root.querySelector?.('.ds-related');
 const path=currentPath(root);
 if(existing&&path&&existing.dataset.dsPath===path)return;
 if(existing)existing.remove();
 if(!path)return;
 const group=DB.index[path],allVariants=group&&DB.groups[group],current=allVariants?.find(v=>v.path===path);
 let variants=allVariants?.filter(v=>!isExcluded(v));
 const length=normanLength(current);if(length)variants=variants?.filter(v=>normanLength(v)===length);
 if(isExcluded(current)||!variants||variants.length<2)return;
 const info=root.matches?.('.t-store__prod-popup__info,.t-catalog__prod-popup__info')?root:root.querySelector?.('.t-store__prod-popup__info,.t-catalog__prod-popup__info,.t-store__product-snippet,.t-catalog__product-snippet')||root;
 const anchor=info.querySelector?.('.t-store__prod-popup__price-wrapper,.t-catalog__prod-popup__price-wrapper,.js-product-controls-wrapper,.t-product__option')||info.firstElementChild;
 const box=document.createElement('div');box.className='ds-related';box.dataset.dsPath=path;box.innerHTML='<div class="ds-related__title">Другие цвета и варианты</div><div class="ds-related__list"></div>';
 const list=box.lastElementChild;variants.forEach(v=>{if(!v.path)return;const a=document.createElement('a');a.className='ds-related__item'+(v.path===path?' is-active':'');a.href=v.url||v.path;a.title=v.title;a.innerHTML=(v.image?'<img class="ds-related__img" loading="lazy" decoding="async" alt="'+esc(v.label)+'" src="'+esc(v.image)+'">':'<span class="ds-related__img ds-related__img--empty"></span>')+'<span class="ds-related__label">'+esc(v.label)+'</span>';list.appendChild(a)});
 if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else info.appendChild(box);
}
function scan(scope=document){scope.querySelectorAll?.(ROOTS).forEach(mount);if(scope.matches?.(ROOTS))mount(scope)}
let queued=false,pending=[];const queue=nodes=>{pending.push(...nodes);if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const nodes=pending.splice(0);nodes.forEach(scan);scan()})};
function start(){scan();document.documentElement.setAttribute('data-ds-related-status',document.querySelector('.ds-related')?'mounted':'watching');new MutationObserver(()=>queue([document])).observe(document.body,{childList:true,subtree:true,attributes:true,characterData:true});window.addEventListener('popstate',()=>setTimeout(scan,100));window.addEventListener('hashchange',()=>{setTimeout(scan,50);setTimeout(scan,300)});document.addEventListener('click',()=>{setTimeout(scan,80);setTimeout(scan,300);setTimeout(scan,700)},true);setInterval(scan,500)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})(0);
