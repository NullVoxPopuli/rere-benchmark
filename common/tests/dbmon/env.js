// @ts-nocheck
// More or less the dbmon code (copied from Solid)
//
// https://mathieuancelin.github.io/js-repaint-perfs/
// Modified, because:
// - the original code assumes that we're creating UI as well
// - we don't want mutations set this way, we'll use an env var
// - we don't want to add a new method to the String.prototype
//   - lpad exists natively now as padStart (tho with different argument order)
// - we also need the different functions exported individually, rather than hidden in a private function scope
//   - some versions of the dbmon test *could* try re-generating the whole table eatm time (keepIdentity = false).
//     This needlessly thrashing memory tho, and is not the default test.
//     We want to test the framework, not the browser's ability to arbitrarily execute JS
// - !keepIdentity branches have been removed, because it's silly to not keep identity
// - the original did not give any callbacks to manage changes in data
//   (which we need to do to have a chance to tie in to fine-grained reactivity)
//
// More references:
//   https://github.com/mathieuancelin/js-repaint-perfs/blob/gh-pages/ENV.js
//   https://github.com/ryansolid/solid-dbmon/blob/master/dist/ENV.js
//   https://github.com/html-next/vertical-collection/blob/master/tests/dummy/app/lib/get-data.js

import { qpNum, qpPercent } from '../utils.js';

var first = true;
var counter = 0;
var data;
var _base;
let mutations = qpPercent('mutations', 0.15);
let rows = qpNum('rows', 20);

function formatElapsed(value) {
  var str = parseFloat(value).toFixed(2);
  if (value > 60) {
    minutes = Math.floor(value / 60);
    comps = (value % 60).toFixed(2).split('.');
    seconds = comps[0].padStart(2, '0');
    ms = comps[1];
    str = minutes + ':' + seconds + '.' + ms;
  }
  return str;
}
function getElapsedClassName(elapsed) {
  var className = 'Query elapsed';
  if (elapsed >= 10.0) {
    className += ' warn_long';
  } else if (elapsed >= 1.0) {
    className += ' warn';
  } else {
    className += ' short';
  }
  return className;
}
function countClassName(queries) {
  var countClassName = 'label';
  if (queries >= 20) {
    countClassName += ' label-important';
  } else if (queries >= 10) {
    countClassName += ' label-warning';
  } else {
    countClassName += ' label-success';
  }
  return countClassName;
}

function updateQuery(object) {
  if (!object) {
    object = {};
  }
  var elapsed = Math.random() * 15;
  object.elapsed = elapsed;
  object.formatElapsed = formatElapsed(elapsed);
  object.elapsedClassName = getElapsedClassName(elapsed);
  object.query = 'SELECT blah FROM something';
  object.waiting = Math.random() < 0.5;
  if (Math.random() < 0.2) {
    object.query = '<IDLE> in transaction';
  }
  if (Math.random() < 0.1) {
    object.query = 'vacuum';
  }
  return object;
}
function cleanQuery(value) {
  if (value) {
    value.formatElapsed = '';
    value.elapsedClassName = '';
    value.query = '';
    value.elapsed = null;
    value.waiting = null;
  } else {
    return {
      query: '***',
      formatElapsed: '',
      elapsedClassName: '',
    };
  }
}

function generateRow(object, counter) {
  var nbQueries = Math.floor(Math.random() * 10 + 1);
  if (!object) {
    object = {};
  }
  object.lastMutationId = counter;
  object.nbQueries = nbQueries;
  if (!object.lastSample) {
    object.lastSample = {};
  }
  if (!object.lastSample.topFiveQueries) {
    object.lastSample.topFiveQueries = [];
  }

  if (!object.lastSample.queries) {
    object.lastSample.queries = [];
    for (var l = 0; l < 12; l++) {
      object.lastSample.queries[l] = cleanQuery();
    }
  }
  for (var j in object.lastSample.queries) {
    var value = object.lastSample.queries[j];
    if (j <= nbQueries) {
      updateQuery(value);
    } else {
      cleanQuery(value);
    }
  }

  for (var i = 0; i < 5; i++) {
    var source = object.lastSample.queries[i];
    object.lastSample.topFiveQueries[i] = source;
  }
  object.lastSample.nbQueries = nbQueries;
  object.lastSample.countClassName = countClassName(nbQueries);
  return object;
}

export function generateData() {
  if (!data) {
    data = [];
    for (var i = 1; i <= rows; i++) {
      data.push({
        dbname: 'cluster' + i,
      });
      data.push({
        dbname: 'cluster' + i + ' secondary',
      });
    }
  }

  function updateData(callback) {
    let changed = [];
    for (var i in data) {
      let row = data[i];
      if (!row.lastSample || Math.random() < mutations) {
        counter = counter + 1;

        generateRow(row, counter);
        callback?.(row.dbname, row);
        changed.push(row);
      }
    }
    return changed;
  }
  updateData();

  first = false;
  return {
    updateData,
    toArray: function () {
      return data;
    },
  };
}
