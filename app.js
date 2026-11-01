// ============================================================
//  ROAD NETWORK & MAP NAVIGATOR — Interactive Graph UI
//  Direct counterpart to main.cpp (BFS + Dijkstra)
// ============================================================

const INF = Number.MAX_SAFE_INTEGER;

// Geographic normalized coordinates (0..1000 x 0..1000 canvas space)
// Positioned to mirror real Indian geography for immediate visual clarity
const CITY_COORDS = {
  "Manali":     { x: 375, y: 85 },
  "Shimla":     { x: 385, y: 145 },
  "Chandigarh": { x: 350, y: 185 },
  "Delhi":      { x: 365, y: 260 },
  "Jaipur":     { x: 295, y: 330 },
  "Agra":       { x: 405, y: 325 },
  "Lucknow":    { x: 495, y: 320 },
  "Udaipur":    { x: 245, y: 410 },
  "Ahmedabad":  { x: 195, y: 470 },
  "Bhopal":     { x: 380, y: 465 },
  "Varanasi":   { x: 565, y: 365 },
  "Patna":      { x: 635, y: 355 },
  "Gangtok":    { x: 745, y: 270 },
  "Darjeeling": { x: 725, y: 315 },
  "Kolkata":    { x: 715, y: 475 },
  "Raipur":     { x: 525, y: 535 },
  "Nagpur":     { x: 430, y: 555 },
  "Mumbai":     { x: 215, y: 605 },
  "Pune":       { x: 255, y: 650 },
  "Hyderabad":  { x: 415, y: 680 },
  "Bengaluru":  { x: 375, y: 815 },
  "Chennai":    { x: 470, y: 805 },
  "Kochi":      { x: 335, y: 915 }
};

// Minimalist geometric outline of India (in the same 1000x1000 coordinate space)
const INDIA_OUTLINE = [
  [335, 45], [415, 55], [440, 110], [425, 165], [485, 225],
  [585, 265], [685, 275], [730, 245], [765, 255], [770, 305],
  [850, 260], [895, 290], [845, 385], [790, 425], [745, 495],
  [655, 555], [560, 645], [495, 735], [485, 835], [415, 935],
  [355, 955], [310, 895], [275, 780], [220, 655], [190, 560],
  [125, 515], [115, 455], [180, 415], [195, 335], [265, 255],
  [305, 165], [295, 95]
];

class RoadMap {
  constructor() {
    this.names = [];       // index -> city name
    this.adj = [];         // index -> array of { to, km }
    this.id = new Map();   // lowercase name -> index
    this.coords = [];      // index -> { x, y }
  }

  clone() {
    const c = new RoadMap();
    c.names = [...this.names];
    c.adj = this.adj.map(list => list.map(e => ({ ...e })));
    c.id = new Map(this.id);
    c.coords = this.coords.map(pt => ({ ...pt }));
    return c;
  }

  find(name) {
    if (!name) return -1;
    const idx = this.id.get(name.trim().toLowerCase());
    return idx === undefined ? -1 : idx;
  }

  addCity(name, customCoord = null) {
    const existing = this.find(name);
    if (existing !== -1) return existing;
    const idx = this.names.length;
    this.names.push(name);
    this.adj.push([]);
    this.id.set(name.toLowerCase(), idx);

    if (customCoord) {
      this.coords.push({ x: customCoord.x, y: customCoord.y });
    } else if (CITY_COORDS[name]) {
      this.coords.push({ ...CITY_COORDS[name] });
    } else {
      // Place custom cities neatly around central-west canvas with slight offset
      const angle = (idx * 137.5) * (Math.PI / 180);
      const r = 120 + (idx % 4) * 35;
      this.coords.push({
        x: Math.round(450 + Math.cos(angle) * r),
        y: Math.round(500 + Math.sin(angle) * r)
      });
    }
    return idx;
  }

  hasRoad(a, b) {
    return this.adj[a].some(e => e.to === b);
  }

  getRoadKm(a, b) {
    const edge = this.adj[a].find(e => e.to === b);
    return edge ? edge.km : 0;
  }

  addRoad(a, b, km) {
    this.removeRoad(a, b);
    this.adj[a].push({ to: b, km });
    this.adj[b].push({ to: a, km });
  }

  removeRoad(a, b) {
    const lenBefore = this.adj[a].length;
    this.adj[a] = this.adj[a].filter(e => e.to !== b);
    this.adj[b] = this.adj[b].filter(e => e.to !== a);
    return this.adj[a].length < lenBefore;
  }

  roadCount() {
    let total = 0;
    for (let i = 0; i < this.adj.length; i++) total += this.adj[i].length;
    return total / 2;
  }

  // BFS: Returns { hops, parent }
  bfs(src) {
    const n = this.names.length;
    const hops = new Array(n).fill(-1);
    const parent = new Array(n).fill(-1);
    const q = [];
    hops[src] = 0;
    q.push(src);

    while (q.length > 0) {
      const u = q.shift();
      for (const edge of this.adj[u]) {
        const v = edge.to;
        if (hops[v] === -1) {
          hops[v] = hops[u] + 1;
          parent[v] = u;
          q.push(v);
        }
      }
    }
    return { hops, parent };
  }

  bfsOrder(src) {
    const order = [];
    const seen = new Array(this.names.length).fill(false);
    const q = [src];
    seen[src] = true;
    while (q.length > 0) {
      const u = q.shift();
      order.push(u);
      for (const edge of this.adj[u]) {
        if (!seen[edge.to]) {
          seen[edge.to] = true;
          q.push(edge.to);
        }
      }
    }
    return order;
  }

  components() {
    const comps = [];
    const seen = new Array(this.names.length).fill(false);
    for (let s = 0; s < this.names.length; s++) {
      if (seen[s]) continue;
      const comp = [];
      const q = [s];
      seen[s] = true;
      while (q.length > 0) {
        const u = q.shift();
        comp.push(u);
        for (const edge of this.adj[u]) {
          if (!seen[edge.to]) {
            seen[edge.to] = true;
            q.push(edge.to);
          }
        }
      }
      comps.push(comp);
    }
    return comps;
  }

  // Dijkstra: Returns { dist, parent }
  dijkstra(src) {
    const n = this.names.length;
    const dist = new Array(n).fill(INF);
    const parent = new Array(n).fill(-1);
    const visited = new Array(n).fill(false);
    dist[src] = 0;

    for (let step = 0; step < n; step++) {
      let u = -1;
      let best = INF;
      for (let i = 0; i < n; i++) {
        if (!visited[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1) break;
      visited[u] = true;

      for (const edge of this.adj[u]) {
        const v = edge.to;
        const w = edge.km;
        if (dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          parent[v] = u;
        }
      }
    }
    return { dist, parent };
  }

  buildPath(parent, src, dst) {
    const path = [];
    for (let v = dst; v !== -1; v = parent[v]) {
      path.push(v);
    }
    path.reverse();
    if (path.length === 0 || path[0] !== src) return [];
    return path;
  }

  pathKm(path) {
    let total = 0;
    for (let i = 0; i + 1 < path.length; i++) {
      total += this.getRoadKm(path[i], path[i + 1]);
    }
    return total;
  }
}

// Sample dataset identical to main.cpp loadSample()
const SAMPLE_ROADS = [
  ["Delhi", "Jaipur", 280],     ["Delhi", "Agra", 233],
  ["Delhi", "Chandigarh", 245], ["Delhi", "Lucknow", 555],
  ["Agra", "Jaipur", 240],      ["Agra", "Lucknow", 335],
  ["Agra", "Bhopal", 570],      ["Jaipur", "Ahmedabad", 660],
  ["Jaipur", "Udaipur", 395],   ["Udaipur", "Ahmedabad", 260],
  ["Ahmedabad", "Mumbai", 525], ["Ahmedabad", "Bhopal", 570],
  ["Bhopal", "Nagpur", 350],    ["Bhopal", "Mumbai", 780],
  ["Lucknow", "Varanasi", 320], ["Varanasi", "Patna", 250],
  ["Patna", "Kolkata", 590],    ["Nagpur", "Hyderabad", 500],
  ["Nagpur", "Raipur", 290],    ["Raipur", "Kolkata", 1000],
  ["Mumbai", "Pune", 150],      ["Pune", "Hyderabad", 560],
  ["Pune", "Bengaluru", 840],   ["Hyderabad", "Bengaluru", 570],
  ["Hyderabad", "Chennai", 625],["Bengaluru", "Chennai", 350],
  ["Bengaluru", "Kochi", 550],  ["Chennai", "Kochi", 690],
  ["Shimla", "Manali", 250],
  ["Gangtok", "Darjeeling", 100]
];

function loadSample(map) {
  for (const [aName, bName, km] of SAMPLE_ROADS) {
    const a = map.addCity(aName);
    const b = map.addCity(bName);
    map.addRoad(a, b, km);
  }
}

// ============================================================
//  APPLICATION STATE & VISUALIZATION ENGINE
// ============================================================

const state = {
  map: new RoadMap(),
  showWeights: true,

  // Visual overlays on the canvas
  dijkstraPath: [],       // array of city indices
  bfsPath: [],            // array of city indices
  closedRoads: [],        // array of { a, b, km }
  nodeBadges: new Map(),  // cityIdx -> { text, color, bg }
  componentColors: null,  // cityIdx -> color hex

  // Viewport transform
  scale: 1,
  offsetX: 0,
  offsetY: 0,

  // Interaction
  hoveredCity: -1,
  draggingCity: -1,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  pointerDownPos: { x: 0, y: 0 },

  // Auto-demo
  demoActive: false,
  demoStep: 0
};

// Component palette (mature, subdued colors)
const COMP_PALETTE = [
  { stroke: "#0d9488", fill: "#f0fdfa", label: "Network 1 (Mainland)" },
  { stroke: "#d97706", fill: "#fffbeb", label: "Network 2 (Himachal)" },
  { stroke: "#6366f1", fill: "#eef2ff", label: "Network 3 (Eastern Hills)" },
  { stroke: "#ec4899", fill: "#fdf2f8", label: "Network 4" },
  { stroke: "#64748b", fill: "#f8fafc", label: "Network 5" }
];

// DOM Elements
const canvas = document.getElementById("networkCanvas");
const ctx = canvas.getContext("2d");

const selectFrom = document.getElementById("selectFrom");
const selectTo = document.getElementById("selectTo");
const selectStartCity = document.getElementById("selectStartCity");
const selectCloseA = document.getElementById("selectCloseA");
const selectCloseB = document.getElementById("selectCloseB");
const selectRoadA = document.getElementById("selectRoadA");
const selectRoadB = document.getElementById("selectRoadB");

const outputTag = document.getElementById("outputTag");
const outputTitle = document.getElementById("outputTitle");
const outputBody = document.getElementById("outputBody");

// Initialize application
function init() {
  state.map = new RoadMap();
  loadSample(state.map);
  populateAllSelects("Delhi", "Mumbai", "Delhi", "Ahmedabad", "Mumbai", "Delhi", "Jaipur");
  updateTopStats();
  setupCanvasEvents();
  setupUIEvents();
  resizeCanvas(true);
  showOverviewPanel();
}

function populateAllSelects(fromVal, toVal, startVal, closeAVal, closeBVal, roadAVal, roadBVal) {
  const selects = [
    { el: selectFrom, def: fromVal },
    { el: selectTo, def: toVal },
    { el: selectStartCity, def: startVal },
    { el: selectCloseA, def: closeAVal },
    { el: selectCloseB, def: closeBVal },
    { el: selectRoadA, def: roadAVal },
    { el: selectRoadB, def: roadBVal }
  ];

  for (const { el, def } of selects) {
    const prev = el.value ? state.map.names[Number(el.value)] : def;
    el.innerHTML = "";
    state.map.names.forEach((name, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = `${idx + 1}. ${name}`;
      el.appendChild(opt);
    });
    const targetIdx = state.map.find(prev || def);
    if (targetIdx !== -1) el.value = targetIdx;
  }
}

function updateTopStats() {
  document.getElementById("statCities").textContent = state.map.names.length;
  document.getElementById("statRoads").textContent = state.map.roadCount();
  document.getElementById("statComponents").textContent = state.map.components().length;
  renderAdjacencyView();
  renderMatrixView();
}

function clearVisualOverlays() {
  state.dijkstraPath = [];
  state.bfsPath = [];
  state.nodeBadges.clear();
  state.componentColors = null;
  drawMap();
}

// ============================================================
//  CANVAS RENDERING & INTERACTION
// ============================================================

function resizeCanvas(fit = false) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  if (fit) fitView();
  else drawMap();
}

function fitView() {
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const padding = 55;
  const scaleX = (rect.width - padding * 2) / 860;
  const scaleY = (rect.height - padding * 2) / 920;
  state.scale = Math.min(scaleX, scaleY, 1.35);
  state.offsetX = (rect.width - 960 * state.scale) / 2;
  state.offsetY = (rect.height - 980 * state.scale) / 2;
  drawMap();
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - state.offsetX) / state.scale,
    y: (sy - state.offsetY) / state.scale
  };
}

function isEdgeInPath(u, v, path) {
  for (let i = 0; i + 1 < path.length; i++) {
    if ((path[i] === u && path[i + 1] === v) || (path[i] === v && path[i + 1] === u)) {
      return true;
    }
  }
  return false;
}

function isNodeInPath(u, path) {
  return path.includes(u);
}

function drawMap() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);

  // 1. Subtle India cartographic silhouette
  ctx.save();
  ctx.beginPath();
  INDIA_OUTLINE.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(226, 232, 240, 0.35)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 1.5 / state.scale;
  ctx.setLineDash([5 / state.scale, 5 / state.scale]);
  ctx.stroke();
  ctx.restore();

  const fromIdx = Number(selectFrom.value);
  const toIdx = Number(selectTo.value);

  // 2. Draw Closed Roads (dashed crimson)
  for (const closed of state.closedRoads) {
    const p1 = state.map.coords[closed.a];
    const p2 = state.map.coords[closed.b];
    if (!p1 || !p2) continue;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2.5 / state.scale;
    ctx.setLineDash([6 / state.scale, 5 / state.scale]);
    ctx.stroke();
    ctx.restore();

    // Midpoint badge "CLOSED"
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    drawPillLabel(mx, my, `✕ ${closed.km} km`, "#fef2f2", "#dc2626", "#fecaca");
  }

  // 3. Draw Active Roads (undirected edges)
  const n = state.map.names.length;
  for (let u = 0; u < n; u++) {
    for (const edge of state.map.adj[u]) {
      const v = edge.to;
      if (u >= v) continue; // draw each undirected edge once

      const p1 = state.map.coords[u];
      const p2 = state.map.coords[v];

      const inDijk = isEdgeInPath(u, v, state.dijkstraPath);
      const inBfs = isEdgeInPath(u, v, state.bfsPath);

      if (inDijk && inBfs) {
        // Both paths use this road -> draw parallel offset lines so both are clearly visible
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * (3.2 / state.scale);
        const ny = (dx / len) * (3.2 / state.scale);

        ctx.beginPath();
        ctx.moveTo(p1.x + nx, p1.y + ny);
        ctx.lineTo(p2.x + nx, p2.y + ny);
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 3.5 / state.scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x - nx, p1.y - ny);
        ctx.lineTo(p2.x - nx, p2.y - ny);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3.5 / state.scale;
        ctx.stroke();
      } else if (inDijk) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 4 / state.scale;
        ctx.stroke();
      } else if (inBfs) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 4 / state.scale;
        ctx.stroke();
      } else {
        // Standard road
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        if (state.componentColors) {
          ctx.strokeStyle = state.componentColors.get(u)?.stroke || "#94a3b8";
          ctx.lineWidth = 2.2 / state.scale;
        } else {
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1.8 / state.scale;
        }
        ctx.stroke();
      }

      // Draw distance label (km)
      if (state.showWeights || inDijk || inBfs) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const highlighted = inDijk || inBfs;
        const bg = inDijk ? "#f0fdfa" : inBfs ? "#eff6ff" : "rgba(255,255,255,0.88)";
        const fg = inDijk ? "#0f766e" : inBfs ? "#1d4ed8" : "#64748b";
        const border = inDijk ? "#99f6e4" : inBfs ? "#bfdbfe" : "#e2e8f0";
        drawPillLabel(mx, my, `${edge.km}`, bg, fg, border, highlighted);
      }
    }
  }

  // 4. Draw Cities (Vertices)
  for (let i = 0; i < n; i++) {
    const pt = state.map.coords[i];
    const inDijk = isNodeInPath(i, state.dijkstraPath);
    const inBfs = isNodeInPath(i, state.bfsPath);
    const isFrom = i === fromIdx;
    const isTo = i === toIdx;
    const isHovered = i === state.hoveredCity;

    const radius = (isFrom || isTo ? 8.5 : inDijk || inBfs ? 7.5 : 6) / state.scale;

    // Outer Halo for Source / Destination
    if (isFrom || isTo) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 4 / state.scale, 0, Math.PI * 2);
      ctx.fillStyle = isFrom ? "rgba(13, 148, 136, 0.18)" : "rgba(37, 99, 235, 0.18)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

    if (state.componentColors && state.componentColors.has(i)) {
      const c = state.componentColors.get(i);
      ctx.fillStyle = c.stroke;
      ctx.strokeStyle = "#ffffff";
    } else if (inDijk && inBfs) {
      ctx.fillStyle = "#0d9488";
      ctx.strokeStyle = "#2563eb";
    } else if (inDijk) {
      ctx.fillStyle = "#0d9488";
      ctx.strokeStyle = "#ffffff";
    } else if (inBfs) {
      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#ffffff";
    } else if (isFrom || isTo) {
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#ffffff";
    } else {
      ctx.fillStyle = isHovered ? "#0f172a" : "#334155";
      ctx.strokeStyle = "#ffffff";
    }

    ctx.lineWidth = 2 / state.scale;
    ctx.fill();
    ctx.stroke();

    // City Name Label
    const fontSize = Math.max(10, Math.round(12 / Math.pow(state.scale, 0.85)));
    ctx.font = `${isFrom || isTo || inDijk || inBfs ? "600" : "500"} ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const labelY = pt.y + radius + 4 / state.scale;
    const text = state.map.names[i];
    const metrics = ctx.measureText(text);
    const padX = 4 / state.scale;
    const padY = 2 / state.scale;

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillRect(
      pt.x - metrics.width / 2 - padX,
      labelY - padY,
      metrics.width + padX * 2,
      fontSize + padY * 2
    );

    ctx.fillStyle = isFrom || isTo || inDijk || inBfs ? "#0f172a" : "#334155";
    ctx.fillText(text, pt.x, labelY);

    // Optional Algorithm Badge above node (e.g. L0, L1, or km distance)
    if (state.nodeBadges.has(i)) {
      const badge = state.nodeBadges.get(i);
      drawPillLabel(
        pt.x,
        pt.y - radius - 10 / state.scale,
        badge.text,
        badge.bg,
        badge.color,
        badge.border,
        true
      );
    }
  }

  ctx.restore();
}

function drawPillLabel(x, y, text, bg, fg, border, bold = false) {
  const fontSize = Math.max(9.5, Math.round(10.5 / Math.pow(state.scale, 0.85)));
  ctx.font = `${bold ? "600" : "500"} ${fontSize}px "JetBrains Mono", Consolas, monospace`;
  const m = ctx.measureText(text);
  const pw = m.width + 8 / state.scale;
  const ph = fontSize + 5 / state.scale;

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 1 / state.scale;

  ctx.beginPath();
  ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3 / state.scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5 / state.scale);
}

// ============================================================
//  CANVAS MOUSE / POINTER EVENTS
// ============================================================

function findCityAt(wx, wy) {
  const hitRadius = 14 / state.scale;
  for (let i = state.map.coords.length - 1; i >= 0; i--) {
    const pt = state.map.coords[i];
    if (Math.hypot(wx - pt.x, wy - pt.y) <= hitRadius) return i;
  }
  return -1;
}

function setupCanvasEvents() {
  window.addEventListener("resize", () => resizeCanvas(false));

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    state.pointerDownPos = { x: sx, y: sy };
    const hit = findCityAt(world.x, world.y);

    if (hit !== -1 && e.button === 0) {
      state.draggingCity = hit;
    } else {
      state.isPanning = true;
      state.panStartX = sx - state.offsetX;
      state.panStartY = sy - state.offsetY;
    }
  });

  window.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (state.draggingCity !== -1) {
      state.map.coords[state.draggingCity].x = world.x;
      state.map.coords[state.draggingCity].y = world.y;
      drawMap();
      return;
    }

    if (state.isPanning) {
      state.offsetX = sx - state.panStartX;
      state.offsetY = sy - state.panStartY;
      drawMap();
      return;
    }

    const hit = findCityAt(world.x, world.y);
    if (hit !== state.hoveredCity) {
      state.hoveredCity = hit;
      canvas.style.cursor = hit !== -1 ? "pointer" : "grab";
      drawMap();
    }
  });

  window.addEventListener("mouseup", e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const movedDist = Math.hypot(sx - state.pointerDownPos.x, sy - state.pointerDownPos.y);

    if (movedDist < 4) {
      const world = screenToWorld(sx, sy);
      const hit = findCityAt(world.x, world.y);
      if (hit !== -1) {
        if (e.shiftKey || e.button === 2) {
          selectTo.value = hit;
        } else {
          selectFrom.value = hit;
          selectStartCity.value = hit;
        }
        drawMap();
      }
    }

    state.draggingCity = -1;
    state.isPanning = false;
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newScale = Math.min(Math.max(state.scale * zoomFactor, 0.35), 3.0);

    state.offsetX = sx - ((sx - state.offsetX) / state.scale) * newScale;
    state.offsetY = sy - ((sy - state.offsetY) / state.scale) * newScale;
    state.scale = newScale;
    drawMap();
  }, { passive: false });
}

// ============================================================
//  CORE GRAPH FEATURES (Matching Menu 1..13 in main.cpp)
// ============================================================

function formatPathPills(path) {
  return `<div class="path-pills">${path
    .map(idx => `<span class="city-pill">${state.map.names[idx]}</span>`)
    .join(`<span class="path-arrow">→</span>`)}</div>`;
}

// Overview (Default / Menu #1)
function showOverviewPanel() {
  outputTag.className = "output-tag";
  outputTag.textContent = "GRAPH READY";
  outputTitle.textContent = `India Road Network (${state.map.names.length} Cities)`;

  const comps = state.map.components();
  outputBody.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Total Cities (V)</div>
        <div class="metric-value">${state.map.names.length}</div>
        <div class="metric-sub">Adjacency List Storage</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Two-Way Roads (E)</div>
        <div class="metric-value">${state.map.roadCount()}</div>
        <div class="metric-sub">${comps.length} Connected Networks</div>
      </div>
    </div>

    <div class="callout">
      <strong>Quick Guide:</strong> Select any two cities on the left (or click directly on the map) to run <strong>Dijkstra</strong> (shortest distance in km) or <strong>BFS</strong> (fewest roads/hops), or compare both side by side.
    </div>

    <div class="route-box">
      <div class="route-box-title">All Loaded Cities (${state.map.names.length})</div>
      <div class="path-pills">
        ${state.map.names.map((n, i) => `<span class="city-pill"><span class="mono" style="color:#64748b">${i + 1}.</span> ${n}</span>`).join("")}
      </div>
    </div>
  `;
}

// Menu #3: Shortest Route by Distance (Dijkstra)
function runDijkstraRoute(a, b) {
  switchTab("map");
  clearVisualOverlays();

  const srcName = state.map.names[a];
  const dstName = state.map.names[b];

  outputTag.className = "output-tag tag-dijkstra";
  outputTag.textContent = "DIJKSTRA · O((V + E) log V)";
  outputTitle.textContent = `${srcName} → ${dstName}`;

  if (a === b) {
    outputBody.innerHTML = `<div class="callout callout-warn">Source and destination are the same city (0 km).</div>`;
    return;
  }

  const { dist, parent } = state.map.dijkstra(a);
  if (dist[b] === INF) {
    outputTag.className = "output-tag tag-danger";
    outputBody.innerHTML = `
      <div class="callout callout-danger">
        <strong>No road connection exists</strong> between <strong>${srcName}</strong> and <strong>${dstName}</strong>.<br/>
        They belong to separate, disconnected road networks.
      </div>
    `;
    return;
  }

  const path = state.map.buildPath(parent, a, b);
  state.dijkstraPath = path;

  // Add cumulative distance badges along path
  let accKm = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) accKm += state.map.getRoadKm(path[i - 1], path[i]);
    state.nodeBadges.set(path[i], {
      text: `${accKm} km`,
      bg: "#f0fdfa",
      color: "#0f766e",
      border: "#99f6e4"
    });
  }
  drawMap();

  let legsRows = "";
  for (let i = 0; i + 1 < path.length; i++) {
    const u = path[i];
    const v = path[i + 1];
    const km = state.map.getRoadKm(u, v);
    legsRows += `
      <tr>
        <td class="mono">${i + 1}</td>
        <td>${state.map.names[u]} → ${state.map.names[v]}</td>
        <td class="mono text-right"><strong>${km} km</strong></td>
      </tr>
    `;
  }

  outputBody.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Total Distance</div>
        <div class="metric-value" style="color: var(--color-dijkstra);">${dist[b]} km</div>
        <div class="metric-sub">Minimum possible km</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Roads / Stops</div>
        <div class="metric-value">${path.length - 1} roads</div>
        <div class="metric-sub">${path.length - 2} intermediate stops</div>
      </div>
    </div>

    <div class="route-box">
      <div class="route-box-title">Optimal Route</div>
      ${formatPathPills(path)}
    </div>

    <div class="route-box-title" style="margin-bottom: 6px;">Leg-by-Leg Breakdown</div>
    <table class="clean-table">
      <thead>
        <tr><th>#</th><th>Highway Segment</th><th class="text-right">Distance</th></tr>
      </thead>
      <tbody>${legsRows}</tbody>
    </table>
  `;
}

// Menu #4: Fewest Roads Route (BFS)
function runBfsRoute(a, b) {
  switchTab("map");
  clearVisualOverlays();

  const srcName = state.map.names[a];
  const dstName = state.map.names[b];

  outputTag.className = "output-tag tag-bfs";
  outputTag.textContent = "BFS · O(V + E)";
  outputTitle.textContent = `${srcName} → ${dstName}`;

  if (a === b) {
    outputBody.innerHTML = `<div class="callout callout-warn">Source and destination are the same city (0 hops).</div>`;
    return;
  }

  const { hops, parent } = state.map.bfs(a);
  if (hops[b] === -1) {
    outputTag.className = "output-tag tag-danger";
    outputBody.innerHTML = `
      <div class="callout callout-danger">
        <strong>No road connection exists</strong> between <strong>${srcName}</strong> and <strong>${dstName}</strong>.
      </div>
    `;
    return;
  }

  const path = state.map.buildPath(parent, a, b);
  const totalKm = state.map.pathKm(path);
  state.bfsPath = path;

  path.forEach((cityIdx, step) => {
    state.nodeBadges.set(cityIdx, {
      text: `Hop ${step}`,
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe"
    });
  });
  drawMap();

  outputBody.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Road Count (Hops)</div>
        <div class="metric-value" style="color: var(--color-bfs);">${hops[b]} roads</div>
        <div class="metric-sub">Fewest possible turns</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Road Distance</div>
        <div class="metric-value">${totalKm} km</div>
        <div class="metric-sub">Unweighted BFS path</div>
      </div>
    </div>

    <div class="callout callout-bfs">
      <strong>How BFS works here:</strong> Breadth-First Search explores cities level by level using a FIFO queue, guaranteeing the minimum number of road segments (hops), ignoring edge weights.
    </div>

    <div class="route-box">
      <div class="route-box-title">Fewest-Stops Route</div>
      ${formatPathPills(path)}
    </div>
  `;
}

// Menu #5: Compare BFS vs Dijkstra
function runCompareRoutes(a, b) {
  switchTab("map");
  clearVisualOverlays();

  const srcName = state.map.names[a];
  const dstName = state.map.names[b];

  outputTag.className = "output-tag";
  outputTag.textContent = "ALGORITHM COMPARISON";
  outputTitle.textContent = `BFS vs Dijkstra: ${srcName} → ${dstName}`;

  if (a === b) {
    outputBody.innerHTML = `<div class="callout callout-warn">Pick two different cities to compare routes.</div>`;
    return;
  }

  const bfsRes = state.map.bfs(a);
  const dijkRes = state.map.dijkstra(a);

  if (bfsRes.hops[b] === -1) {
    outputTag.className = "output-tag tag-danger";
    outputBody.innerHTML = `
      <div class="callout callout-danger">
        <strong>Unreachable:</strong> ${srcName} and ${dstName} are in separate disconnected components. Neither BFS nor Dijkstra can form a path.
      </div>
    `;
    return;
  }

  const bfsPath = state.map.buildPath(bfsRes.parent, a, b);
  const dijkPath = state.map.buildPath(dijkRes.parent, a, b);
  const bfsKm = state.map.pathKm(bfsPath);
  const dijkKm = dijkRes.dist[b];

  state.bfsPath = bfsPath;
  state.dijkstraPath = dijkPath;
  drawMap();

  const sameRoute =
    bfsPath.length === dijkPath.length &&
    bfsPath.every((v, idx) => v === dijkPath[idx]);

  const verdictHtml = sameRoute
    ? `<div class="callout">
         <strong>Identical Route:</strong> For this pair, the path with the fewest roads is also the shortest in kilometres (${dijkKm} km).
       </div>`
    : `<div class="callout callout-dijkstra">
         <strong>Different Routes Found!</strong><br/>
         • <strong>BFS</strong> took fewer roads (<strong>${bfsPath.length - 1} roads</strong> vs ${dijkPath.length - 1}), costing <strong>${bfsKm} km</strong>.<br/>
         • <strong>Dijkstra</strong> took an extra stop via Udaipur to save <strong>${bfsKm - dijkKm} km</strong> (total <strong>${dijkKm} km</strong>).
       </div>`;

  outputBody.innerHTML = `
    ${verdictHtml}

    <table class="clean-table" style="margin-bottom: 14px;">
      <thead>
        <tr>
          <th>Metric</th>
          <th style="color: var(--color-bfs);">BFS (Unweighted)</th>
          <th style="color: var(--color-dijkstra);">Dijkstra (Weighted)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Data Structure</td>
          <td class="mono">FIFO Queue</td>
          <td class="mono">Min-Heap PQ</td>
        </tr>
        <tr>
          <td>Roads (Hops)</td>
          <td class="mono"><strong>${bfsPath.length - 1} roads</strong></td>
          <td class="mono">${dijkPath.length - 1} roads</td>
        </tr>
        <tr>
          <td>Total Distance</td>
          <td class="mono">${bfsKm} km</td>
          <td class="mono"><strong>${dijkKm} km</strong></td>
        </tr>
        <tr>
          <td>Time Complexity</td>
          <td class="mono">O(V + E)</td>
          <td class="mono">O((V+E) log V)</td>
        </tr>
      </tbody>
    </table>

    <div class="route-box" style="border-left: 3px solid var(--color-bfs);">
      <div class="route-box-title" style="color: var(--color-bfs);">BFS Route (${bfsPath.length - 1} roads · ${bfsKm} km)</div>
      ${formatPathPills(bfsPath)}
    </div>

    <div class="route-box" style="border-left: 3px solid var(--color-dijkstra);">
      <div class="route-box-title" style="color: var(--color-dijkstra);">Dijkstra Route (${dijkPath.length - 1} roads · ${dijkKm} km)</div>
      ${formatPathPills(dijkPath)}
    </div>
  `;
}

// Menu #6: Distance to All Cities from One (Dijkstra)
function runAllDistances(startIdx) {
  switchTab("map");
  clearVisualOverlays();

  const startName = state.map.names[startIdx];
  outputTag.className = "output-tag tag-dijkstra";
  outputTag.textContent = "SINGLE-SOURCE SHORTEST PATHS";
  outputTitle.textContent = `Distances from ${startName}`;

  const { dist, parent } = state.map.dijkstra(startIdx);
  const rows = [];
  for (let i = 0; i < dist.length; i++) {
    if (i !== startIdx) rows.push({ city: i, km: dist[i] });
  }
  rows.sort((a, b) => a.km - b.km);

  state.nodeBadges.set(startIdx, {
    text: "START (0 km)",
    bg: "#0d9488",
    color: "#ffffff",
    border: "#0d9488"
  });

  for (const r of rows) {
    if (r.km < INF) {
      state.nodeBadges.set(r.city, {
        text: `${r.km} km`,
        bg: "#f0fdfa",
        color: "#0f766e",
        border: "#99f6e4"
      });
    } else {
      state.nodeBadges.set(r.city, {
        text: "Unreachable",
        bg: "#fef2f2",
        color: "#dc2626",
        border: "#fecaca"
      });
    }
  }
  drawMap();

  const tableRows = rows
    .map(r => {
      if (r.km === INF) {
        return `<tr>
          <td><strong>${state.map.names[r.city]}</strong></td>
          <td class="mono" style="color: var(--color-danger);">∞ (Unreachable)</td>
          <td style="color: var(--text-muted);">Isolated network</td>
        </tr>`;
      }
      const path = state.map.buildPath(parent, startIdx, r.city);
      const pathStr = path.map(idx => state.map.names[idx]).join(" → ");
      return `<tr style="cursor:pointer;" onclick="highlightSinglePath(${startIdx}, ${r.city})">
        <td><strong>${state.map.names[r.city]}</strong></td>
        <td class="mono"><strong>${r.km} km</strong></td>
        <td style="font-size:11px; color: var(--text-secondary);">${pathStr}</td>
      </tr>`;
    })
    .join("");

  outputBody.innerHTML = `
    <div class="callout callout-dijkstra">
      Click any row below to highlight its shortest path from <strong>${startName}</strong> on the map.
    </div>
    <table class="clean-table">
      <thead>
        <tr><th>Destination</th><th>Shortest km</th><th>Optimal Route</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

window.highlightSinglePath = function(src, dst) {
  const { parent } = state.map.dijkstra(src);
  state.dijkstraPath = state.map.buildPath(parent, src, dst);
  drawMap();
};

// Menu #7: Level-by-Level Traversal (BFS)
function runBfsTraversal(startIdx) {
  switchTab("map");
  clearVisualOverlays();

  const startName = state.map.names[startIdx];
  outputTag.className = "output-tag tag-bfs";
  outputTag.textContent = "BFS LEVEL TRAVERSAL";
  outputTitle.textContent = `Layers from ${startName}`;

  const { hops } = state.map.bfs(startIdx);
  const order = state.map.bfsOrder(startIdx);

  let maxLevel = 0;
  for (const h of hops) if (h > maxLevel) maxLevel = h;

  const levelPalette = [
    { bg: "#1e3a8a", fg: "#ffffff", border: "#1e3a8a" },
    { bg: "#dbeafe", fg: "#1e40af", border: "#93c5fd" },
    { bg: "#e0f2fe", fg: "#0369a1", border: "#7dd3fc" },
    { bg: "#f0fdfa", fg: "#0f766e", border: "#99f6e4" },
    { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
    { bg: "#f3e8ff", fg: "#6b21a8", border: "#d8b4fe" },
    { bg: "#f1f5f9", fg: "#334155", border: "#cbd5e1" }
  ];

  for (let i = 0; i < hops.length; i++) {
    if (hops[i] !== -1) {
      const pal = levelPalette[Math.min(hops[i], levelPalette.length - 1)];
      state.nodeBadges.set(i, {
        text: `L${hops[i]}`,
        bg: pal.bg,
        color: pal.fg,
        border: pal.border
      });
    } else {
      state.nodeBadges.set(i, {
        text: "Unreachable",
        bg: "#fef2f2",
        color: "#dc2626",
        border: "#fecaca"
      });
    }
  }
  drawMap();

  let levelsHtml = "";
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const citiesAtLevel = order.filter(idx => hops[idx] === lvl);
    levelsHtml += `
      <div class="level-card">
        <div class="level-header">
          <span>Level ${lvl} (${lvl} ${lvl === 1 ? "road" : "roads"} away)</span>
          <span class="mono" style="color: var(--text-muted);">${citiesAtLevel.length} ${citiesAtLevel.length === 1 ? "city" : "cities"}</span>
        </div>
        <div class="path-pills">
          ${citiesAtLevel.map(idx => `<span class="city-pill">${state.map.names[idx]}</span>`).join("")}
        </div>
      </div>
    `;
  }

  const unreachable = state.map.names.filter((_, idx) => hops[idx] === -1);
  if (unreachable.length > 0) {
    levelsHtml += `
      <div class="callout callout-danger" style="margin-top: 10px;">
        <strong>Unreachable Cities (${unreachable.length}):</strong> ${unreachable.join(", ")}
      </div>
    `;
  }

  outputBody.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Reachable Cities</div>
        <div class="metric-value" style="color: var(--color-bfs);">${order.length - 1} / ${state.map.names.length - 1}</div>
        <div class="metric-sub">From ${startName}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Max Depth</div>
        <div class="metric-value">${maxLevel} hops</div>
        <div class="metric-sub">BFS Ripple Radius</div>
      </div>
    </div>
    ${levelsHtml}
  `;
}

// Menu #8: Connectivity Check (Connected Components)
function runConnectivity() {
  switchTab("map");
  clearVisualOverlays();

  const comps = state.map.components();
  state.componentColors = new Map();

  comps.forEach((comp, cIdx) => {
    const pal = COMP_PALETTE[cIdx % COMP_PALETTE.length];
    comp.forEach(cityIdx => {
      state.componentColors.set(cityIdx, pal);
      state.nodeBadges.set(cityIdx, {
        text: `Net #${cIdx + 1}`,
        bg: pal.fill,
        color: pal.stroke,
        border: pal.stroke
      });
    });
  });
  drawMap();

  outputTag.className = "output-tag";
  outputTag.textContent = "BFS CONNECTED COMPONENTS";
  outputTitle.textContent = `${comps.length} Separate Road Networks`;

  const statusHtml =
    comps.length === 1
      ? `<div class="callout callout-dijkstra"><strong>Fully Connected:</strong> Every city in the graph can reach every other city.</div>`
      : `<div class="callout callout-warn"><strong>Not Fully Connected:</strong> The graph is partitioned into <strong>${comps.length} disconnected components</strong>. Cities in different networks have no connecting road.</div>`;

  const compCards = comps
    .map((comp, idx) => {
      const pal = COMP_PALETTE[idx % COMP_PALETTE.length];
      return `
        <div class="route-box" style="border-left: 3px solid ${pal.stroke};">
          <div class="route-box-title" style="color: ${pal.stroke};">
            Network ${idx + 1} — ${comp.length} ${comp.length === 1 ? "City" : "Cities"}
          </div>
          <div class="path-pills">
            ${comp.map(c => `<span class="city-pill">${state.map.names[c]}</span>`).join("")}
          </div>
        </div>
      `;
    })
    .join("");

  outputBody.innerHTML = `${statusHtml}${compCards}`;
}

// Menu #9: Simulate Road Closure
function runClosureSimulation(a, b) {
  switchTab("map");
  clearVisualOverlays();

  const nameA = state.map.names[a];
  const nameB = state.map.names[b];

  outputTag.className = "output-tag tag-danger";
  outputTag.textContent = "ROAD CLOSURE & DETOUR";
  outputTitle.textContent = `${nameA} ↔ ${nameB}`;

  if (!state.map.hasRoad(a, b)) {
    outputBody.innerHTML = `
      <div class="callout callout-warn">
        No direct road currently exists between <strong>${nameA}</strong> and <strong>${nameB}</strong>.
      </div>
    `;
    return;
  }

  const originalKm = state.map.getRoadKm(a, b);
  const compsBefore = state.map.components().length;

  state.map.removeRoad(a, b);
  state.closedRoads = state.closedRoads.filter(
    r => !((r.a === a && r.b === b) || (r.a === b && r.b === a))
  );
  state.closedRoads.push({ a, b, km: originalKm });

  const compsAfter = state.map.components().length;
  const isBridge = compsAfter > compsBefore;

  const { dist, parent } = state.map.dijkstra(a);
  const cutOff = dist[b] === INF;

  let detourHtml = "";
  if (cutOff) {
    detourHtml = `
      <div class="callout callout-danger">
        <strong>CRITICAL BRIDGE CLOSED:</strong> Closing <strong>${nameA} ↔ ${nameB}</strong> completely cuts off the two cities! No alternate detour exists.
      </div>
    `;
  } else {
    const detourPath = state.map.buildPath(parent, a, b);
    state.dijkstraPath = detourPath;
    const extraKm = dist[b] - originalKm;
    detourHtml = `
      <div class="callout callout-dijkstra">
        <strong>Alternate Route Found via Dijkstra:</strong> Traffic rerouted with <strong>+${extraKm} km</strong> additional distance.
      </div>
      <div class="route-box">
        <div class="route-box-title">Active Detour Route (${dist[b]} km vs ${originalKm} km direct)</div>
        ${formatPathPills(detourPath)}
      </div>
    `;
  }

  updateTopStats();
  drawMap();

  outputBody.innerHTML = `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Closed Direct Road</div>
        <div class="metric-value" style="color: var(--color-danger);">${originalKm} km</div>
        <div class="metric-sub">${nameA} ↔ ${nameB}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">New Detour Distance</div>
        <div class="metric-value">${cutOff ? "∞ (Cut Off)" : `${dist[b]} km`}</div>
        <div class="metric-sub">Networks: ${compsBefore} → ${compsAfter} ${isBridge ? "(Bridge!)" : ""}</div>
      </div>
    </div>

    ${detourHtml}

    <button class="btn btn-primary btn-block" onclick="reopenRoad(${a}, ${b}, ${originalKm})">
      Reopen Road (${nameA} ↔ ${nameB}, ${originalKm} km)
    </button>
  `;
}

window.reopenRoad = function(a, b, km) {
  state.map.addRoad(a, b, km);
  state.closedRoads = state.closedRoads.filter(
    r => !((r.a === a && r.b === b) || (r.a === b && r.b === a))
  );
  clearVisualOverlays();
  updateTopStats();
  runDijkstraRoute(a, b);
};

// ============================================================
//  DATA VIEWS (Adjacency List #2 & Distance Matrix #12)
// ============================================================

function renderAdjacencyView() {
  const container = document.getElementById("viewAdj");
  let rows = "";
  for (let i = 0; i < state.map.names.length; i++) {
    const edges = state.map.adj[i];
    const neighbors =
      edges.length === 0
        ? `<span style="color: var(--text-muted);">(no connected roads)</span>`
        : edges
            .map(
              e =>
                `<span class="city-pill">${state.map.names[e.to]} <span class="mono" style="color:var(--color-dijkstra);">${e.km} km</span></span>`
            )
            .join(" ");

    rows += `
      <tr>
        <td class="mono" style="width: 48px; color: var(--text-muted);">${i + 1}</td>
        <td style="width: 140px;"><strong>${state.map.names[i]}</strong></td>
        <td class="mono" style="width: 70px;">deg(${edges.length})</td>
        <td><div class="path-pills">${neighbors}</div></td>
      </tr>
    `;
  }

  container.innerHTML = `
    <div style="max-width: 920px; margin: 0 auto;">
      <h3 style="margin-bottom: 4px; font-size: 15px;">Adjacency List Representation — <span class="mono">vector&lt;vector&lt;Edge&gt;&gt; adj</span></h3>
      <p style="color: var(--text-secondary); margin-bottom: 14px;">
        Space Complexity: <strong>O(V + E)</strong> · ${state.map.names.length} vertices, ${state.map.roadCount()} undirected weighted edges.
      </p>
      <table class="clean-table">
        <thead>
          <tr><th>ID</th><th>City Vertex</th><th>Degree</th><th>Adjacent Cities (Edge Weight in km)</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderMatrixView() {
  const container = document.getElementById("viewMatrix");
  const n = state.map.names.length;

  let headerCells = `<th class="row-header">City</th>`;
  for (let j = 0; j < n; j++) {
    headerCells += `<th title="${state.map.names[j]}">${state.map.names[j].slice(0, 4)}</th>`;
  }

  let bodyRows = "";
  for (let i = 0; i < n; i++) {
    let cells = `<th class="row-header">${i + 1}. ${state.map.names[i]}</th>`;
    for (let j = 0; j < n; j++) {
      const km = state.map.getRoadKm(i, j);
      if (km > 0) {
        cells += `<td class="has-road" title="${state.map.names[i]} ↔ ${state.map.names[j]}: ${km} km">${km}</td>`;
      } else {
        cells += `<td class="empty-cell">·</td>`;
      }
    }
    bodyRows += `<tr>${cells}</tr>`;
  }

  container.innerHTML = `
    <div>
      <h3 style="margin-bottom: 4px; font-size: 15px;">Direct Road Distance Matrix (km)</h3>
      <p style="color: var(--text-secondary); margin-bottom: 14px;">
        Shows direct highway connections between pairs of cities. Hover any cell to inspect endpoints.
      </p>
      <div style="overflow: auto; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
        <table class="matrix-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function switchTab(viewName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  document.getElementById("viewMap").style.display = viewName === "map" ? "block" : "none";
  document.getElementById("viewAdj").classList.toggle("active", viewName === "adj");
  document.getElementById("viewMatrix").classList.toggle("active", viewName === "matrix");
  document.getElementById("canvasControls").style.visibility = viewName === "map" ? "visible" : "hidden";

  if (viewName === "map") resizeCanvas(false);
}

// ============================================================
//  AUTO-DEMO WALKTHROUGH (Menu #13)
// ============================================================

const DEMO_STEPS = [
  {
    label: "Step 1/7: Network Connectivity Check (3 Separate Road Networks)",
    run: () => runConnectivity()
  },
  {
    label: "Step 2/7: BFS Level-by-Level Ripple Traversal from Delhi",
    run: () => {
      const d = state.map.find("Delhi");
      selectStartCity.value = d;
      runBfsTraversal(d);
    }
  },
  {
    label: "Step 3/7: Compare BFS vs Dijkstra (Delhi → Mumbai: 3 roads/1465 km vs 4 roads/1460 km)",
    run: () => {
      const a = state.map.find("Delhi");
      const b = state.map.find("Mumbai");
      selectFrom.value = a;
      selectTo.value = b;
      runCompareRoutes(a, b);
    }
  },
  {
    label: "Step 4/7: Shortest Route Across Country (Delhi → Kochi via Dijkstra)",
    run: () => {
      const a = state.map.find("Delhi");
      const b = state.map.find("Kochi");
      selectFrom.value = a;
      selectTo.value = b;
      runDijkstraRoute(a, b);
    }
  },
  {
    label: "Step 5/7: Unreachable Destination Handling (Delhi → Manali)",
    run: () => {
      const a = state.map.find("Delhi");
      const b = state.map.find("Manali");
      selectFrom.value = a;
      selectTo.value = b;
      runDijkstraRoute(a, b);
    }
  },
  {
    label: "Step 6/7: Road Closure & Automatic Detour (Close Ahmedabad ↔ Mumbai)",
    run: () => {
      const a = state.map.find("Ahmedabad");
      const b = state.map.find("Mumbai");
      selectCloseA.value = a;
      selectCloseB.value = b;
      runClosureSimulation(a, b);
    }
  },
  {
    label: "Step 7/7: Bridge Detection — Closing Delhi ↔ Chandigarh Splits the Network",
    run: () => {
      const a = state.map.find("Delhi");
      const b = state.map.find("Chandigarh");
      selectCloseA.value = a;
      selectCloseB.value = b;
      runClosureSimulation(a, b);
    }
  }
];

function runDemoStep(idx) {
  // Always start from clean sample map before steps 1..5 so closures don't pollute earlier steps
  if (idx <= 5) {
    state.map = new RoadMap();
    loadSample(state.map);
    state.closedRoads = [];
    updateTopStats();
  }
  state.demoStep = idx;
  document.getElementById("demoStepText").textContent = DEMO_STEPS[idx].label;
  DEMO_STEPS[idx].run();
}

// ============================================================
//  UI EVENT BINDINGS
// ============================================================

function setupUIEvents() {
  // Route Planner buttons
  document.getElementById("btnDijkstraRoute").addEventListener("click", () => {
    runDijkstraRoute(Number(selectFrom.value), Number(selectTo.value));
  });

  document.getElementById("btnBfsRoute").addEventListener("click", () => {
    runBfsRoute(Number(selectFrom.value), Number(selectTo.value));
  });

  document.getElementById("btnCompareRoutes").addEventListener("click", () => {
    runCompareRoutes(Number(selectFrom.value), Number(selectTo.value));
  });

  document.getElementById("btnSwapCities").addEventListener("click", () => {
    const tmp = selectFrom.value;
    selectFrom.value = selectTo.value;
    selectTo.value = tmp;
    drawMap();
  });

  // Preset chips
  document.querySelectorAll(".preset-chip[data-from]").forEach(chip => {
    chip.addEventListener("click", () => {
      const a = state.map.find(chip.dataset.from);
      const b = state.map.find(chip.dataset.to);
      if (a === -1 || b === -1) return;
      selectFrom.value = a;
      selectTo.value = b;
      if (chip.dataset.action === "compare") runCompareRoutes(a, b);
      else runDijkstraRoute(a, b);
    });
  });

  document.querySelectorAll(".preset-chip[data-close-a]").forEach(chip => {
    chip.addEventListener("click", () => {
      const a = state.map.find(chip.dataset.closeA);
      const b = state.map.find(chip.dataset.closeB);
      if (a === -1 || b === -1) return;
      selectCloseA.value = a;
      selectCloseB.value = b;
      runClosureSimulation(a, b);
    });
  });

  // Traversal & Connectivity
  document.getElementById("btnAllDistances").addEventListener("click", () => {
    runAllDistances(Number(selectStartCity.value));
  });

  document.getElementById("btnBfsTraversal").addEventListener("click", () => {
    runBfsTraversal(Number(selectStartCity.value));
  });

  document.getElementById("btnConnectivity").addEventListener("click", () => {
    runConnectivity();
  });

  // Closure
  document.getElementById("btnSimulateClosure").addEventListener("click", () => {
    runClosureSimulation(Number(selectCloseA.value), Number(selectCloseB.value));
  });

  // Add City (Menu #10)
  document.getElementById("btnAddCity").addEventListener("click", () => {
    const input = document.getElementById("inputNewCity");
    const name = input.value.trim();
    if (!name) return;
    if (state.map.find(name) !== -1) {
      outputTag.className = "output-tag tag-danger";
      outputTag.textContent = "DUPLICATE CITY";
      outputTitle.textContent = `City '${name}' already exists`;
      return;
    }
    const newIdx = state.map.addCity(name);
    input.value = "";
    populateAllSelects();
    selectRoadA.value = newIdx;
    updateTopStats();
    clearVisualOverlays();

    outputTag.className = "output-tag tag-dijkstra";
    outputTag.textContent = "VERTEX ADDED";
    outputTitle.textContent = `Added City: ${name}`;
    outputBody.innerHTML = `
      <div class="callout callout-dijkstra">
        Added vertex <strong>${name}</strong> (ID #${newIdx + 1}). You can drag it anywhere on the map and connect it using <strong>Save Road</strong>.
      </div>
    `;
  });

  // Add / Update Road (Menu #11)
  document.getElementById("btnAddRoad").addEventListener("click", () => {
    const a = Number(selectRoadA.value);
    const b = Number(selectRoadB.value);
    const km = parseInt(document.getElementById("inputRoadKm").value, 10);

    if (a === b) {
      outputTag.className = "output-tag tag-danger";
      outputTag.textContent = "INVALID EDGE";
      outputTitle.textContent = "Cannot connect a city to itself";
      return;
    }
    if (!km || km <= 0) return;

    state.map.addRoad(a, b, km);
    state.closedRoads = state.closedRoads.filter(
      r => !((r.a === a && r.b === b) || (r.a === b && r.b === a))
    );
    updateTopStats();
    runDijkstraRoute(a, b);
  });

  // Topbar & Canvas Controls
  document.getElementById("btnClearHighlights").addEventListener("click", () => {
    clearVisualOverlays();
    showOverviewPanel();
  });

  document.getElementById("btnResetMap").addEventListener("click", () => {
    state.closedRoads = [];
    state.demoActive = false;
    document.getElementById("demoBar").classList.remove("active");
    init();
  });

  document.getElementById("btnToggleWeights").addEventListener("click", e => {
    state.showWeights = !state.showWeights;
    e.currentTarget.textContent = `Labels: ${state.showWeights ? "ON" : "OFF"}`;
    drawMap();
  });

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    state.scale = Math.min(state.scale * 1.2, 3.0);
    drawMap();
  });

  document.getElementById("btnZoomOut").addEventListener("click", () => {
    state.scale = Math.max(state.scale * 0.83, 0.35);
    drawMap();
  });

  document.getElementById("btnFitView").addEventListener("click", () => fitView());

  // View Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.view));
  });

  // Auto-Demo Controls
  document.getElementById("btnAutoDemo").addEventListener("click", () => {
    state.demoActive = true;
    document.getElementById("demoBar").classList.add("active");
    runDemoStep(0);
  });

  document.getElementById("btnDemoNext").addEventListener("click", () => {
    const next = (state.demoStep + 1) % DEMO_STEPS.length;
    runDemoStep(next);
  });

  document.getElementById("btnDemoPrev").addEventListener("click", () => {
    const prev = (state.demoStep - 1 + DEMO_STEPS.length) % DEMO_STEPS.length;
    runDemoStep(prev);
  });

  document.getElementById("btnDemoExit").addEventListener("click", () => {
    state.demoActive = false;
    document.getElementById("demoBar").classList.remove("active");
  });
}

// Boot on DOM ready
window.addEventListener("DOMContentLoaded", init);

