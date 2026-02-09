(function(){
  'use strict';

  var gridEl = document.getElementById('life-grid');
  if (!gridEl) return;

  var genEl    = document.getElementById('life-gen');
  var popEl    = document.getElementById('life-pop');
  var deltaEl  = document.getElementById('life-delta');
  var statusEl = document.getElementById('life-status');
  var startBtn = document.getElementById('life-start');
  var pauseBtn = document.getElementById('life-pause');
  var stepBtn  = document.getElementById('life-step');
  var clearBtn = document.getElementById('life-clear');
  var randomBtn = document.getElementById('life-random');
  var presetSel = document.getElementById('life-preset');
  var speedSlider = document.getElementById('life-speed');
  var speedText   = document.getElementById('life-speed-text');
  var wrapCheck   = document.getElementById('life-wrap');

  var SIZE = 30;
  var speedMs = 120;

  gridEl.style.setProperty('--grid-size', SIZE);

  // grid[i] = 0 (dead) or 1+ (age in generations alive)
  var cells = new Array(SIZE * SIZE);
  var grid  = new Array(SIZE * SIZE);
  var dying = new Array(SIZE * SIZE); // 1 = just died (ghost), 0 = normal

  for (var i = 0; i < SIZE * SIZE; i++) {
    var cell = document.createElement('div');
    cell.className = 'life-cell';
    gridEl.appendChild(cell);
    cells[i] = cell;
    grid[i] = 0;
    dying[i] = 0;
  }

  var generation = 0;
  var population = 0;
  var running = false;
  var timer = null;
  var toroidal = false;

  /* --- Drawing (click/drag, works while running) --- */
  var drawingActive = false;
  var drawValue = 1; // 1 = set alive, 0 = erase

  function idx(x, y) { return y * SIZE + x; }

  function cellFromEvent(e) {
    var rect = gridEl.getBoundingClientRect();
    var cellW = rect.width / SIZE;
    var cellH = rect.height / SIZE;
    var cx, cy;
    if (e.touches && e.touches.length) {
      cx = Math.floor((e.touches[0].clientX - rect.left) / cellW);
      cy = Math.floor((e.touches[0].clientY - rect.top) / cellH);
    } else {
      cx = Math.floor((e.clientX - rect.left) / cellW);
      cy = Math.floor((e.clientY - rect.top) / cellH);
    }
    if (cx < 0 || cx >= SIZE || cy < 0 || cy >= SIZE) return -1;
    return idx(cx, cy);
  }

  function onPointerDown(e) {
    e.preventDefault();
    drawingActive = true;
    var i = cellFromEvent(e);
    if (i < 0) return;
    drawValue = grid[i] ? 0 : 1;
    grid[i] = drawValue ? 1 : 0;
    dying[i] = 0;
    render();
  }

  function onPointerMove(e) {
    if (!drawingActive) return;
    e.preventDefault();
    var i = cellFromEvent(e);
    if (i < 0) return;
    grid[i] = drawValue ? 1 : 0;
    dying[i] = 0;
    render();
  }

  function onPointerUp() {
    drawingActive = false;
  }

  gridEl.addEventListener('mousedown', onPointerDown);
  gridEl.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  gridEl.addEventListener('touchstart', onPointerDown, { passive: false });
  gridEl.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  /* --- Conway rules --- */
  function countNeighbors(g, x, y) {
    var count = 0;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx;
        var ny = y + dy;
        if (toroidal) {
          nx = (nx + SIZE) % SIZE;
          ny = (ny + SIZE) % SIZE;
        } else {
          if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
        }
        if (g[idx(nx, ny)] > 0) count++;
      }
    }
    return count;
  }

  function step() {
    var next = new Array(SIZE * SIZE);
    var newDying = new Array(SIZE * SIZE);
    var born = 0;
    var died = 0;

    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var i = idx(x, y);
        var age = grid[i];
        var n = countNeighbors(grid, x, y);
        newDying[i] = 0;

        if (age > 0) {
          // alive
          if (n === 2 || n === 3) {
            next[i] = age + 1; // survive, age increments
          } else {
            next[i] = 0;      // die
            newDying[i] = 1;   // ghost
            died++;
          }
        } else {
          // dead
          if (n === 3) {
            next[i] = 1;      // born
            born++;
          } else {
            next[i] = 0;
          }
        }
      }
    }

    grid = next;
    dying = newDying;
    generation++;

    // Update population stats
    population = 0;
    for (var j = 0; j < grid.length; j++) {
      if (grid[j] > 0) population++;
    }

    if (born > 0 || died > 0) {
      var parts = [];
      if (born > 0) parts.push('+' + born);
      if (died > 0) parts.push('-' + died);
      deltaEl.textContent = parts.join(' / ');
    } else {
      deltaEl.textContent = '';
    }
  }

  /* --- Render --- */
  function render() {
    population = 0;
    for (var i = 0; i < cells.length; i++) {
      var el = cells[i];
      var age = grid[i];

      if (age > 0) {
        population++;
        // Remove dying class, set age-based styling
        if (age === 1) {
          el.className = 'life-cell';
          el.setAttribute('data-age', '1');
        } else if (age <= 3) {
          el.className = 'life-cell';
          el.setAttribute('data-age', age.toString());
        } else if (age === 4) {
          el.className = 'life-cell';
          el.setAttribute('data-age', '4');
        } else {
          el.className = 'life-cell alive';
          el.removeAttribute('data-age');
        }
      } else if (dying[i]) {
        el.className = 'life-cell dying';
        el.removeAttribute('data-age');
      } else {
        el.className = 'life-cell';
        el.removeAttribute('data-age');
      }
    }
    genEl.textContent = String(generation);
    popEl.textContent = String(population);
  }

  /* --- Speed helper --- */
  function speedLabel(ms) {
    if (ms <= 60) return 'Fast';
    if (ms <= 200) return 'Normal';
    return 'Slow';
  }

  function updateSpeed() {
    speedMs = parseInt(speedSlider.value, 10);
    speedText.textContent = speedLabel(speedMs);
    if (running) {
      clearInterval(timer);
      timer = setInterval(tick, speedMs);
    }
  }

  /* --- Controls --- */
  function start() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stepBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    statusEl.textContent = 'Running';
    timer = setInterval(tick, speedMs);
  }

  function pause() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    timer = null;
    pauseBtn.textContent = 'Resume';
    startBtn.disabled = false;
    stepBtn.disabled = false;
    statusEl.textContent = 'Paused';
  }

  function togglePause() {
    if (running) pause();
    else start();
  }

  function stepOne() {
    if (running) return;
    step();
    render();
    statusEl.textContent = 'Stepped';
  }

  function clear() {
    pause();
    for (var i = 0; i < grid.length; i++) {
      grid[i] = 0;
      dying[i] = 0;
    }
    generation = 0;
    deltaEl.textContent = '';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    statusEl.textContent = 'Ready';
    render();
  }

  function randomize() {
    pause();
    for (var i = 0; i < grid.length; i++) {
      grid[i] = Math.random() < 0.3 ? 1 : 0;
      dying[i] = 0;
    }
    generation = 0;
    deltaEl.textContent = '';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    statusEl.textContent = 'Ready';
    render();
  }

  function tick() {
    step();
    render();
  }

  /* --- Presets --- */
  var PRESETS = {
    // --- Spaceships ---
    glider: [
      [1,0],[2,1],[0,2],[1,2],[2,2]
    ],
    lwss: [
      [1,0],[4,0],
      [0,1],
      [0,2],[4,2],
      [0,3],[1,3],[2,3],[3,3]
    ],
    hwss: [
      [3,0],[4,0],
      [1,1],[6,1],
      [0,2],
      [0,3],[6,3],
      [1,4],[2,4],[3,4],[4,4],[5,4],[6,4]
    ],
    copperhead: [
      [1,0],[2,0],[5,0],[6,0],
      [3,1],[4,1],
      [3,2],[4,2],
      [0,3],[2,3],[5,3],[7,3],
      [0,4],[7,4],
      [0,6],[7,6],
      [1,7],[2,7],[5,7],[6,7],
      [2,8],[3,8],[4,8],[5,8],
      [3,10],[4,10],
      [3,11],[4,11]
    ],
    armada: [
      // 3 LWSSs traveling right in formation
      [3,2],[6,2],[2,3],[2,4],[6,4],[2,5],[3,5],[4,5],[5,5],
      [3,10],[6,10],[2,11],[2,12],[6,12],[2,13],[3,13],[4,13],[5,13],
      [3,18],[6,18],[2,19],[2,20],[6,20],[2,21],[3,21],[4,21],[5,21]
    ],

    // --- Oscillators ---
    pulsar: [
      [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
      [0,2],[5,2],[7,2],[12,2],
      [0,3],[5,3],[7,3],[12,3],
      [0,4],[5,4],[7,4],[12,4],
      [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],
      [2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
      [0,8],[5,8],[7,8],[12,8],
      [0,9],[5,9],[7,9],[12,9],
      [0,10],[5,10],[7,10],[12,10],
      [2,12],[3,12],[4,12],[8,12],[9,12],[10,12]
    ],
    pentadecathlon: [
      [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0]
    ],
    galaxy: [
      // Kok's Galaxy, period 8
      [0,0],[1,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
      [0,1],[1,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
      [0,2],[1,2],
      [0,3],[1,3],[7,3],[8,3],
      [7,4],[8,4],
      [0,5],[1,5],[7,5],[8,5],
      [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[7,6],[8,6],
      [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[7,7],[8,7]
    ],
    figureEight: [
      // Figure Eight, period 8
      [0,0],[1,0],[2,0],
      [0,1],[1,1],[2,1],
      [0,2],[1,2],[2,2],
      [3,3],[4,3],[5,3],
      [3,4],[4,4],[5,4],
      [3,5],[4,5],[5,5]
    ],

    // --- Methuselahs ---
    rpentomino: [
      [1,0],[2,0],
      [0,1],[1,1],
      [1,2]
    ],
    acorn: [
      [1,0],
      [3,1],
      [0,2],[1,2],[4,2],[5,2],[6,2]
    ],
    diehard: [
      [6,0],
      [0,1],[1,1],
      [1,2],[5,2],[6,2],[7,2]
    ],
    thunderbird: [
      [0,0],[1,0],[2,0],
      [1,2],[1,3],[1,4]
    ],
    piheptomino: [
      // Pi-heptomino, stabilizes ~173 gen
      [0,0],[1,0],[2,0],
      [0,1],[2,1],
      [0,2],[2,2]
    ],

    // --- Space scenes ---
    nebula: [
      // Twin pulsars side by side — pulsating nebula
      // Pulsar 1 (centered ~7,7)
      [2,0],[3,0],[4,0],[8,0],[9,0],[10,0],
      [0,2],[5,2],[7,2],[12,2],
      [0,3],[5,3],[7,3],[12,3],
      [0,4],[5,4],[7,4],[12,4],
      [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],
      [2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
      [0,8],[5,8],[7,8],[12,8],
      [0,9],[5,9],[7,9],[12,9],
      [0,10],[5,10],[7,10],[12,10],
      [2,12],[3,12],[4,12],[8,12],[9,12],[10,12],
      // Pentadecathlon below it (offset +1, +16)
      [1,16],[2,16],[3,16],[4,16],[5,16],[6,16],[7,16],[8,16],[9,16],[10,16]
    ],
    solarSystem: [
      // Center "sun" (block) orbited by gliders
      // Sun — a 2x2 still life at center
      [14,14],[15,14],[14,15],[15,15],
      // Glider 1 — top-left, heading SE
      [3,1],[4,2],[2,3],[3,3],[4,3],
      // Glider 2 — top-right, heading SW
      [26,1],[25,2],[25,3],[26,3],[27,3],
      // Glider 3 — bottom-left, heading NE
      [2,26],[3,26],[4,26],[4,25],[3,24],
      // Glider 4 — bottom-right, heading NW
      [25,26],[26,26],[27,26],[25,25],[26,24]
    ],
    constellation: [
      // Grid of beacons — twinkling star field
      // Beacon = two 2x2 blocks diagonal (period 2)
      [0,0],[1,0],[0,1],[1,1],[2,2],[3,2],[2,3],[3,3],
      [8,0],[9,0],[8,1],[9,1],[10,2],[11,2],[10,3],[11,3],
      [16,0],[17,0],[16,1],[17,1],[18,2],[19,2],[18,3],[19,3],
      [24,0],[25,0],[24,1],[25,1],[26,2],[27,2],[26,3],[27,3],
      [4,6],[5,6],[4,7],[5,7],[6,8],[7,8],[6,9],[7,9],
      [12,6],[13,6],[12,7],[13,7],[14,8],[15,8],[14,9],[15,9],
      [20,6],[21,6],[20,7],[21,7],[22,8],[23,8],[22,9],[23,9],
      [0,12],[1,12],[0,13],[1,13],[2,14],[3,14],[2,15],[3,15],
      [8,12],[9,12],[8,13],[9,13],[10,14],[11,14],[10,15],[11,15],
      [16,12],[17,12],[16,13],[17,13],[18,14],[19,14],[18,15],[19,15],
      [24,12],[25,12],[24,13],[25,13],[26,14],[27,14],[26,15],[27,15],
      [4,18],[5,18],[4,19],[5,19],[6,20],[7,20],[6,21],[7,21],
      [12,18],[13,18],[12,19],[13,19],[14,20],[15,20],[14,21],[15,21],
      [20,18],[21,18],[20,19],[21,19],[22,20],[23,20],[22,21],[23,21],
      [0,24],[1,24],[0,25],[1,25],[2,26],[3,26],[2,27],[3,27],
      [8,24],[9,24],[8,25],[9,25],[10,26],[11,26],[10,27],[11,27],
      [16,24],[17,24],[16,25],[17,25],[18,26],[19,26],[18,27],[19,27],
      [24,24],[25,24],[24,25],[25,25],[26,26],[27,26],[26,27],[27,27]
    ],
    bigBang: [
      // Dense center seed — chaotic expansion like a cosmic explosion
      [13,12],[14,12],[15,12],[16,12],
      [12,13],[13,13],[16,13],[17,13],
      [12,14],[15,14],[16,14],
      [13,15],[14,15],[17,15],
      [12,16],[13,16],[14,16],[15,16],[16,16],[17,16],
      [13,17],[14,17],[15,17],[16,17]
    ],
    warpDrive: [
      // Diagonal stream of gliders — warp trail effect (enable wrap!)
      [1,0],[2,1],[0,2],[1,2],[2,2],
      [6,5],[7,6],[5,7],[6,7],[7,7],
      [11,10],[12,11],[10,12],[11,12],[12,12],
      [16,15],[17,16],[15,17],[16,17],[17,17],
      [21,20],[22,21],[20,22],[21,22],[22,22],
      [26,25],[27,26],[25,27],[26,27],[27,27]
    ]
  };

  // Pentadecathlon needs special handling — the 10-cell line is the standard form
  // but it needs to be vertical for visual clarity. Keep it horizontal, it works.

  function loadPreset(name) {
    if (!PRESETS[name]) return;
    pause();
    for (var i = 0; i < grid.length; i++) {
      grid[i] = 0;
      dying[i] = 0;
    }
    generation = 0;
    deltaEl.textContent = '';

    var pts = PRESETS[name];
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var p = 0; p < pts.length; p++) {
      if (pts[p][0] < minX) minX = pts[p][0];
      if (pts[p][1] < minY) minY = pts[p][1];
      if (pts[p][0] > maxX) maxX = pts[p][0];
      if (pts[p][1] > maxY) maxY = pts[p][1];
    }
    var pw = maxX - minX + 1;
    var ph = maxY - minY + 1;
    var ox = Math.floor((SIZE - pw) / 2);
    var oy = Math.floor((SIZE - ph) / 2);

    for (var p = 0; p < pts.length; p++) {
      var x = pts[p][0] - minX + ox;
      var y = pts[p][1] - minY + oy;
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        grid[idx(x, y)] = 1;
      }
    }

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    statusEl.textContent = 'Ready';
    render();
  }

  /* --- Event wiring --- */
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', togglePause);
  stepBtn.addEventListener('click', stepOne);
  clearBtn.addEventListener('click', clear);
  randomBtn.addEventListener('click', randomize);
  speedSlider.addEventListener('input', updateSpeed);

  wrapCheck.addEventListener('change', function() {
    toroidal = wrapCheck.checked;
  });

  presetSel.addEventListener('change', function() {
    if (presetSel.value) {
      loadPreset(presetSel.value);
      presetSel.value = '';
    }
  });

  /* --- Keyboard shortcuts --- */
  document.addEventListener('keydown', function(e) {
    // Don't capture when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case 'c':
      case 'C':
        clear();
        break;
      case 'r':
      case 'R':
        randomize();
        break;
      case '.':
      case 'n':
      case 'N':
        stepOne();
        break;
    }
  });

  /* --- Init --- */
  speedText.textContent = speedLabel(speedMs);
  render();
})();
