(function () {
  'use strict';

  if (!/^\/catalog-stoly(?:\/|$)/.test(window.location.pathname)) return;

  var FILTER_LABELS = ['длина', 'ширина'];
  var STYLE_ID = 'ds-catalog-range-filter-style';
  var APPLY_DELAY = 120;
  var observer;
  var observerRoot;
  var mountTimer;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ds-range-filter .ds-range-filter__native{display:none!important}',
      '.ds-range-filter .t-catalog__filter__btn-expand{display:none!important}',
      '.ds-range-filter__ui{padding:3px 0 4px;font-family:Inter,Arial,sans-serif}',
      '.ds-range-filter__sliders{position:relative;height:26px;margin:0 10px 5px}',
      '.ds-range-filter__rail,.ds-range-filter__fill{position:absolute;top:12px;height:2px;border-radius:2px}',
      '.ds-range-filter__rail{left:0;right:0;background:#d9d9d9}',
      '.ds-range-filter__fill{background:#5d7ba1}',
      '.ds-range-filter__range{position:absolute;left:0;top:2px;width:100%;height:22px;margin:0;padding:0;background:transparent;pointer-events:none;-webkit-appearance:none;appearance:none}',
      '.ds-range-filter__range::-webkit-slider-runnable-track{height:2px;background:transparent;border:0}',
      '.ds-range-filter__range::-webkit-slider-thumb{width:20px;height:20px;margin-top:-9px;border:2px solid #cfcfcf;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);pointer-events:auto;cursor:pointer;-webkit-appearance:none;appearance:none}',
      '.ds-range-filter__range::-moz-range-track{height:2px;background:transparent;border:0}',
      '.ds-range-filter__range::-moz-range-thumb{width:16px;height:16px;border:2px solid #cfcfcf;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);pointer-events:auto;cursor:pointer}',
      '.ds-range-filter__range:focus{outline:none}',
      '.ds-range-filter__range:focus-visible::-webkit-slider-thumb{outline:2px solid #5d7ba1;outline-offset:2px}',
      '.ds-range-filter__range:focus-visible::-moz-range-thumb{outline:2px solid #5d7ba1;outline-offset:2px}',
      '.ds-range-filter__inputs{display:flex;align-items:center;gap:9px}',
      '.ds-range-filter__input{box-sizing:border-box;width:calc(50% - 14px);height:36px;padding:0 10px;border:1px solid #d9d9d9;border-radius:3px;background:#fff;color:#222;font:14px/36px Inter,Arial,sans-serif}',
      '.ds-range-filter__input:focus{border-color:#5d7ba1;outline:none}',
      '.ds-range-filter__delimiter{flex:0 0 auto;color:#777}',
      '@media(max-width:640px){.ds-range-filter__ui{padding-bottom:7px}.ds-range-filter__input{height:40px;font-size:16px;line-height:40px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function normalizeLabel(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function getTitle(item) {
    return item.querySelector('.js-catalog-filter-item-title[data-filter-label]');
  }

  function getNativeContainer(item) {
    return item.querySelector('.t-catalog__filter__item-controls-container');
  }

  function getBoxes(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll('input.js-catalog-filter-opt-chb[data-filter-value]')
    );
  }

  function getValues(boxes) {
    var seen = {};
    return boxes
      .map(function (box) {
        return Number(String(box.getAttribute('data-filter-value') || '').replace(',', '.'));
      })
      .filter(function (value) {
        if (!Number.isFinite(value) || seen[value]) return false;
        seen[value] = true;
        return true;
      })
      .sort(function (a, b) { return a - b; });
  }

  function nearestIndex(values, number, side) {
    if (!Number.isFinite(number)) return side === 'min' ? 0 : values.length - 1;

    if (side === 'min') {
      for (var i = 0; i < values.length; i += 1) {
        if (values[i] >= number) return i;
      }
      return values.length - 1;
    }

    for (var j = values.length - 1; j >= 0; j -= 1) {
      if (values[j] <= number) return j;
    }
    return 0;
  }

  function checkedRange(state) {
    var selected = state.boxes
      .filter(function (box) { return box.checked; })
      .map(function (box) {
        return Number(String(box.getAttribute('data-filter-value') || '').replace(',', '.'));
      })
      .filter(Number.isFinite);

    if (!selected.length) return [0, state.values.length - 1];

    return [
      nearestIndex(state.values, Math.min.apply(Math, selected), 'min'),
      nearestIndex(state.values, Math.max.apply(Math, selected), 'max')
    ];
  }

  function render(state) {
    var maxIndex = state.values.length - 1;
    var low = Number(state.low.value);
    var high = Number(state.high.value);

    if (low > high) low = high;
    if (high < low) high = low;

    state.low.value = String(low);
    state.high.value = String(high);
    state.from.value = String(state.values[low]);
    state.to.value = String(state.values[high]);

    var left = maxIndex ? (low / maxIndex) * 100 : 0;
    var right = maxIndex ? 100 - (high / maxIndex) * 100 : 0;
    state.fill.style.left = left + '%';
    state.fill.style.right = right + '%';

    state.low.style.zIndex = low >= high - 1 ? '4' : '3';
    state.high.style.zIndex = '3';
  }

  function applyNative(state) {
    var low = Number(state.low.value);
    var high = Number(state.high.value);
    var isFullRange = low === 0 && high === state.values.length - 1;
    var allowed = {};

    if (!isFullRange) {
      state.values.slice(low, high + 1).forEach(function (value) {
        allowed[value] = true;
      });
    }

    var changed = [];

    state.boxes.forEach(function (box) {
      var value = Number(String(box.getAttribute('data-filter-value') || '').replace(',', '.'));
      var shouldBeChecked = !isFullRange && Boolean(allowed[value]);
      if (box.checked !== shouldBeChecked) {
        changed.push({ box: box, checked: shouldBeChecked });
      }
    });

    if (!changed.length) return;

    /*
     * Tilda keeps its own list of selected filter values. Updating every DOM
     * checkbox and clicking only one of them leaves old values in that list
     * when the interval becomes narrower (for example 120–140 can still keep
     * 100 and 110). Click every changed native checkbox so Tilda removes and
     * adds each value in its internal filter state as well.
     */
    state.applying = true;
    changed.forEach(function (change) {
      if (change.box.checked !== change.checked) change.box.click();
    });
    state.applying = false;

    window.setTimeout(function () { syncFromNative(state); }, APPLY_DELAY);
  }

  function syncFromNative(state) {
    if (!state || state.applying || !state.item.isConnected) return;
    var range = checkedRange(state);
    state.low.value = String(range[0]);
    state.high.value = String(range[1]);
    render(state);
  }

  function commitTextInput(state, side) {
    var input = side === 'min' ? state.from : state.to;
    var index = nearestIndex(
      state.values,
      Number(String(input.value || '').replace(',', '.').replace(/[^0-9.]/g, '')),
      side
    );

    if (side === 'min') {
      state.low.value = String(Math.min(index, Number(state.high.value)));
    } else {
      state.high.value = String(Math.max(index, Number(state.low.value)));
    }

    render(state);
    applyNative(state);
  }

  function makeRangeInput(className, max, value, ariaLabel) {
    var input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.step = '1';
    input.value = String(value);
    input.className = 'ds-range-filter__range ' + className;
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }

  function makeTextInput(className, value, ariaLabel) {
    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.value = String(value);
    input.className = 'ds-range-filter__input ' + className;
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }

  function mount(item) {
    var title = getTitle(item);
    var label = normalizeLabel(title && title.getAttribute('data-filter-label'));
    if (FILTER_LABELS.indexOf(label) === -1) return;

    var nativeContainer = getNativeContainer(item);
    if (!nativeContainer) return;

    if (item._dsRangeState && item._dsRangeState.nativeContainer === nativeContainer) return;

    var oldUi = item.querySelector('.ds-range-filter__ui');
    if (oldUi) oldUi.remove();
    if (item._dsRangeState && item._dsRangeState.nativeContainer) {
      item._dsRangeState.nativeContainer.classList.remove('ds-range-filter__native');
    }

    var boxes = getBoxes(nativeContainer);
    var values = getValues(boxes);
    if (values.length < 2) return;

    var state = {
      item: item,
      nativeContainer: nativeContainer,
      boxes: boxes,
      values: values,
      applying: false
    };
    var initial = checkedRange(state);

    var ui = document.createElement('div');
    ui.className = 'ds-range-filter__ui';
    ui.setAttribute('data-ds-filter-label', label);

    var sliders = document.createElement('div');
    sliders.className = 'ds-range-filter__sliders';

    var rail = document.createElement('div');
    rail.className = 'ds-range-filter__rail';
    var fill = document.createElement('div');
    fill.className = 'ds-range-filter__fill';

    var readableTitle = (title.textContent || label).trim();
    var low = makeRangeInput('ds-range-filter__range_min', values.length - 1, initial[0], readableTitle + ': от');
    var high = makeRangeInput('ds-range-filter__range_max', values.length - 1, initial[1], readableTitle + ': до');

    sliders.appendChild(rail);
    sliders.appendChild(fill);
    sliders.appendChild(low);
    sliders.appendChild(high);

    var inputs = document.createElement('div');
    inputs.className = 'ds-range-filter__inputs';
    var from = makeTextInput('ds-range-filter__input_min', values[initial[0]], readableTitle + ': минимальное значение');
    var delimiter = document.createElement('span');
    delimiter.className = 'ds-range-filter__delimiter';
    delimiter.textContent = '—';
    var to = makeTextInput('ds-range-filter__input_max', values[initial[1]], readableTitle + ': максимальное значение');

    inputs.appendChild(from);
    inputs.appendChild(delimiter);
    inputs.appendChild(to);
    ui.appendChild(sliders);
    ui.appendChild(inputs);

    nativeContainer.classList.add('ds-range-filter__native');
    nativeContainer.parentNode.appendChild(ui);
    item.classList.add('ds-range-filter');

    state.ui = ui;
    state.fill = fill;
    state.low = low;
    state.high = high;
    state.from = from;
    state.to = to;
    item._dsRangeState = state;

    function stop(event) { event.stopPropagation(); }
    ui.addEventListener('click', stop);

    low.addEventListener('input', function (event) {
      stop(event);
      if (Number(low.value) > Number(high.value)) high.value = low.value;
      render(state);
    });
    high.addEventListener('input', function (event) {
      stop(event);
      if (Number(high.value) < Number(low.value)) low.value = high.value;
      render(state);
    });
    low.addEventListener('change', function (event) { stop(event); applyNative(state); });
    high.addEventListener('change', function (event) { stop(event); applyNative(state); });

    [from, to].forEach(function (input) {
      input.addEventListener('click', stop);
      input.addEventListener('input', stop);
      input.addEventListener('change', stop);
    });
    from.addEventListener('change', function () { commitTextInput(state, 'min'); });
    to.addEventListener('change', function () { commitTextInput(state, 'max'); });
    from.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); from.blur(); }
    });
    to.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); to.blur(); }
    });

    boxes.forEach(function (box) {
      box.addEventListener('change', function () {
        if (!state.applying) window.setTimeout(function () { syncFromNative(state); }, 0);
      });
    });

    render(state);
  }

  function mountAll() {
    mountTimer = null;
    document.querySelectorAll('.js-catalog-filter-item').forEach(mount);

    var filterRoot = document.querySelector('.js-catalog-filter');
    if (observer && filterRoot && observerRoot !== filterRoot) {
      observer.disconnect();
      observerRoot = filterRoot;
      observer.observe(filterRoot, { childList: true, subtree: true });
    }
  }

  function scheduleMount() {
    if (mountTimer) return;
    mountTimer = window.setTimeout(mountAll, 80);
  }

  function start() {
    injectStyles();
    observer = new MutationObserver(scheduleMount);
    observerRoot = document.querySelector('.js-catalog-filter') || document.body;
    observer.observe(observerRoot, { childList: true, subtree: true });
    mountAll();

    window.addEventListener('popstate', function () {
      window.setTimeout(function () {
        mountAll();
        document.querySelectorAll('.ds-range-filter').forEach(function (item) {
          syncFromNative(item._dsRangeState);
        });
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());
