
/* --------------------------------------------------
   1. GLOBAL SETTINGS & CONSTANTS
   -------------------------------------------------- */
const TILE_SIZE = 40;
const MAP_COLS = 15;
const MAP_ROWS = 10;
const CANVAS_W = TILE_SIZE * MAP_COLS;
const CANVAS_H = TILE_SIZE * MAP_ROWS;

const FPS = 60;
const STATUS_DEFAULT_DURATION = 180; // frames (~3 seconds)
const SPAWN_INTERVAL_BASE = 45;      // base frames between spawns
const SELL_REFUND_RATIO = 0.65;

const MAP_LIBRARY = [
  {
    id: 'gauntlet-run',
    name: 'Gauntlet Run',
    description: 'A straight approach into a narrow choke point. Great for testing core strategies.',
    layout: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    path: [
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },
      { row: 1, col: 6 }, { row: 1, col: 7 }, { row: 1, col: 8 }, { row: 1, col: 9 }, { row: 1, col: 10 },
      { row: 1, col: 11 }, { row: 1, col: 12 }, { row: 1, col: 13 },
      { row: 2, col: 13 }, { row: 3, col: 13 }, { row: 4, col: 13 }, { row: 5, col: 13 },
      { row: 6, col: 13 }, { row: 7, col: 13 }, { row: 8, col: 13 }
    ]
  },
  {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'A looping path that gives enemies multiple angles of attack.',
    layout: [
      [0,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0,0,1,1,1,1],
      [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0,0,0,0,1,0,0,0],
      [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    path: [
      { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
      { row: 1, col: 4 }, { row: 2, col: 4 }, { row: 3, col: 4 }, { row: 4, col: 4 }, { row: 5, col: 4 },
      { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 }, { row: 6, col: 8 },
      { row: 6, col: 9 }, { row: 6, col: 10 }, { row: 6, col: 11 },
      { row: 5, col: 11 }, { row: 4, col: 11 }, { row: 3, col: 11 }, { row: 3, col: 12 },
      { row: 3, col: 13 }, { row: 3, col: 14 }
    ]
  }
];

function createEmptyMap() {
  return Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(0));
}

let currentMapConfig = null;
let MAP = createEmptyMap();
let PATH = [];

/* --------------------------------------------------
   2. GAME STATE
   -------------------------------------------------- */
let canvas, ctx;
let gameInterval = null;

let enemies = [];
let towers = [];
let projectiles = [];
let explosions = [];
let spawnQueue = [];
let upcomingBlueprint = [];
let spawnCooldown = 0;

let wave = 0;
let waveInProgress = false;
let nextWaveReady = false;
let gameOver = false;

let money = 0;
let lives = 0;
let score = 0;

let selectedTowerType = 'basic';
let placeTowerMode = false;
let placementGhost = null;
let selectedTower = null;
let paused = false;

let statusMessage = '';
let statusMessageTimer = 0;

/* --------------------------------------------------
   3. UTILITY HELPERS
   -------------------------------------------------- */
function cloneMap(source) {
  return source.map(row => row.slice());
}

function buildPath(map, pathDefinition = null) {
  if (pathDefinition && pathDefinition.length > 0) {
    return pathDefinition.map(({ row, col }) => ({
      x: col * TILE_SIZE + (TILE_SIZE - 30) / 2,
      y: row * TILE_SIZE + (TILE_SIZE - 30) / 2
    }));
  }

  const path = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (map[r][c] === 1) {
        path.push({
          x: c * TILE_SIZE + (TILE_SIZE - 30) / 2,
          y: r * TILE_SIZE + (TILE_SIZE - 30) / 2
        });
      }
    }
  }
  return path;
}

function setCurrentMap(config) {
  currentMapConfig = config || null;
  refreshMapLayout();
  updateMapNameDisplay();
}

function refreshMapLayout() {
  if (!currentMapConfig) {
    MAP = createEmptyMap();
    PATH = [];
    return;
  }

  MAP = cloneMap(currentMapConfig.layout);
  PATH = buildPath(MAP, currentMapConfig.path);
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function summariseTypes(types) {
  if (!types || types.length === 0) return 'no data';
  const counts = types.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([type, count]) => getEnemyLabel(type) + ' x' + count)
    .join(' | ');
}

function getEnemyLabel(type) {
  switch (type) {
    case 'fast': return 'Fast';
    case 'tank': return 'Armored';
    case 'swarm': return 'Swarm';
    case 'boss': return 'Boss';
    default: return 'Basic';
  }
}

function formatNumber(value, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
/* --------------------------------------------------
   4. AUDIO HELPERS
   -------------------------------------------------- */
function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

function playShootSound() { playSound('shootSound'); }
function playExplosionSound() { playSound('explosionSound'); }
function playPlaceTowerSound() { playSound('placeTowerSound'); }
function playGameOverSound() { playSound('gameOverSound'); }

/* --------------------------------------------------
   5. ENEMIES
   -------------------------------------------------- */
class Enemy {
  constructor() {
    const start = PATH[0] || { x: 0, y: 0 };
    this.x = start.x;
    this.y = start.y;
    this.w = 30;
    this.h = 30;
    this.pathIdx = 1;

    this.speed = 0.7;
    this.maxHealth = 8;
    this.health = this.maxHealth;
    this.reward = 10;
    this.scoreValue = 8;
    this.lifeDamage = 1;

    this.color = '#f44336';
    this.dead = false;
    this.slowTimer = 0;
    this.slowFactor = 1;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  applyScaling(waveNumber, extraDifficulty = 1) {
    const level = Math.max(0, waveNumber - 1);
    const healthScale = 1 + level * 0.12 * extraDifficulty;
    const rewardScale = 1 + level * 0.05 * extraDifficulty;
    const scoreScale = 1 + level * 0.04 * extraDifficulty;

    this.maxHealth = Math.round(this.maxHealth * healthScale);
    this.health = this.maxHealth;
    this.reward = Math.max(5, Math.round(this.reward * rewardScale));
    this.scoreValue = Math.max(5, Math.round(this.scoreValue * scoreScale));
  }

  update() {
    if (this.dead) return;

    if (this.slowTimer > 0) {
      this.slowTimer--;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    const target = PATH[this.pathIdx];
    if (!target) {
      this.reachGoal();
      return;
    }

    const speed = this.speed * this.slowFactor;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= speed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIdx++;
      if (this.pathIdx >= PATH.length) this.reachGoal();
      return;
    }

    this.x += (dx / dist) * speed;
    this.y += (dy / dist) * speed;
  }

  reachGoal() {
    if (this.dead) return;
    this.dead = true;
    lives = Math.max(0, lives - this.lifeDamage);
    updateLivesDisplay();
    setStatusMessage('An enemy reached the base!', 150);
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    money += this.reward;
    score += this.scoreValue;
    updateMoneyDisplay();
    updateScoreDisplay();
    playExplosionSound();
    explosions.push(new Explosion(this.centerX, this.centerY));
  }

  applySlow(factor, duration) {
    if (factor < this.slowFactor) this.slowFactor = factor;
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  render(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(this.x, this.y - 5, this.w, 4);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(this.x, this.y - 5, this.w * (this.health / this.maxHealth), 4);
  }
}

class BasicEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 0.85;
    this.maxHealth = 14;
    this.health = this.maxHealth;
    this.reward = 14;
    this.color = '#ef5350';
  }
}

class FastEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 1.4;
    this.w = 26;
    this.h = 26;
    this.maxHealth = 9;
    this.health = this.maxHealth;
    this.reward = 16;
    this.scoreValue = 12;
    this.color = '#29b6f6';
  }
}

class TankEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 0.55;
    this.w = 36;
    this.h = 36;
    this.maxHealth = 36;
    this.health = this.maxHealth;
    this.reward = 35;
    this.scoreValue = 26;
    this.lifeDamage = 2;
    this.color = '#8d6e63';
  }
}

class SwarmEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 1.1;
    this.w = 24;
    this.h = 24;
    this.maxHealth = 6;
    this.health = this.maxHealth;
    this.reward = 8;
    this.scoreValue = 8;
    this.color = '#ffa726';
  }
}

class BossEnemy extends Enemy {
  constructor() {
    super();
    this.speed = 0.42;
    this.w = 44;
    this.h = 44;
    this.maxHealth = 140;
    this.health = this.maxHealth;
    this.reward = 140;
    this.scoreValue = 80;
    this.lifeDamage = 3;
    this.color = '#7e57c2';
  }
}
/* --------------------------------------------------
   6. VISUAL EFFECTS & PROJECTILES
   -------------------------------------------------- */
class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.life = 1.0;
  }

  update() {
    this.radius += 2.4;
    this.life -= 0.06;
  }

  render(ctx) {
    if (this.life <= 0) return;
    ctx.fillStyle = 'rgba(255, 183, 77, ' + this.life + ')';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Projectile {
  constructor({ x, y, target, speed, damage, color, trailColor, splash = 0, onHit = null }) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.trailColor = trailColor || color;
    this.splash = splash;
    this.onHit = onHit;
    this.dead = false;
    this.trail = [];
  }

  update() {
    if (this.dead) return;
    if (!this.target || this.target.dead) {
      this.dead = true;
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();

    const tx = this.target.centerX;
    const ty = this.target.centerY;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.speed) {
      this.impact();
      return;
    }

    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
  }

  impact() {
    if (this.splash > 0) {
      enemies.forEach(enemy => {
        if (enemy.dead) return;
        const d = distance(enemy.centerX, enemy.centerY, this.x, this.y);
        if (d <= this.splash) {
          enemy.takeDamage(this.damage);
          if (this.onHit) this.onHit(enemy);
        }
      });
    } else if (this.target && !this.target.dead) {
      this.target.takeDamage(this.damage);
      if (this.onHit) this.onHit(this.target);
    }
    this.dead = true;
  }

  render(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i + 1) / this.trail.length * 0.4;
      ctx.fillStyle = this.trailColor;
      ctx.globalAlpha = alpha;
      ctx.fillRect(this.trail[i].x - 2, this.trail[i].y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --------------------------------------------------
   7. TOWERS
   -------------------------------------------------- */
class Tower {
  constructor(x, y, config) {
    this.x = x;
    this.y = y;
    this.w = TILE_SIZE;
    this.h = TILE_SIZE;

    this.name = config.name;
    this.type = config.type;
    this.description = config.description || '';
    this.color = config.bodyColor;
    this.projectileColor = config.projectileColor;
    this.trailColor = config.trailColor || config.projectileColor;
    this.levelStats = config.levelStats;
    this.upgradeCosts = config.upgradeCosts;
    this.rangeRingColor = config.rangeRingColor || 'rgba(255, 255, 255, 0.2)';
    this.sellRatio = SELL_REFUND_RATIO;

    this.level = 1;
    this.cooldown = 0;
    this.totalInvested = config.cost;

    this.setStatsForLevel(1);
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  setStatsForLevel(level) {
    const stats = this.levelStats[level - 1];
    this.range = stats.range;
    this.fireRate = stats.fireRate;
    this.damage = stats.damage;
    this.projectileSpeed = stats.projectileSpeed;
    this.special = stats.special ? { ...stats.special } : null;
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
  }

  readyToFire() {
    return this.cooldown <= 0;
  }

  inRange(enemy) {
    return distance(this.centerX, this.centerY, enemy.centerX, enemy.centerY) <= this.range;
  }

  acquireTarget() {
    let best = null;
    let bestScore = -Infinity;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (!this.inRange(enemy)) continue;
      const score = enemy.pathIdx + enemy.health / enemy.maxHealth;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  }

  shoot(target) {
    const specialSlow = this.special && this.special.slow;
    const specialSplash = this.special && this.special.splashRadius ? this.special.splashRadius : 0;
    const onHit = specialSlow
      ? (enemy) => enemy.applySlow(specialSlow.factor, specialSlow.duration)
      : null;

    projectiles.push(new Projectile({
      x: this.centerX,
      y: this.centerY,
      target,
      speed: this.projectileSpeed,
      damage: this.damage,
      color: this.projectileColor,
      trailColor: this.trailColor,
      splash: specialSplash,
      onHit
    }));

    this.cooldown = this.fireRate;
    playShootSound();
  }

  getUpgradeCost() {
    if (this.level >= this.levelStats.length) return null;
    return this.upgradeCosts[this.level];
  }

  upgrade() {
    if (this.level >= this.levelStats.length) return false;
    this.level++;
    this.setStatsForLevel(this.level);
    return true;
  }

  getSellValue() {
    return Math.round(this.totalInvested * this.sellRatio);
  }

  containsPoint(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  render(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = this.rangeRingColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.range, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.level, this.centerX, this.centerY);
  }
}
class BasicTower extends Tower {
  constructor(x, y) {
    super(x, y, {
      name: 'Basic Tower',
      type: 'basic',
      cost: 100,
      bodyColor: '#3f51b5',
      projectileColor: '#ffeb3b',
      trailColor: '#ffeb3b',
      description: 'Balanced range and damage to support every strategy.',
      levelStats: [
        { range: 110, fireRate: 70, damage: 3, projectileSpeed: 6 },
        { range: 125, fireRate: 60, damage: 4, projectileSpeed: 7 },
        { range: 140, fireRate: 48, damage: 5, projectileSpeed: 8 }
      ],
      upgradeCosts: [0, 90, 140]
    });
  }
}

class RapidTower extends Tower {
  constructor(x, y) {
    super(x, y, {
      name: 'Rapid Tower',
      type: 'rapid',
      cost: 150,
      bodyColor: '#f44336',
      projectileColor: '#ff9800',
      trailColor: '#ff9800',
      description: 'Fires quickly with lower damage per shot.',
      levelStats: [
        { range: 95, fireRate: 35, damage: 2, projectileSpeed: 6 },
        { range: 110, fireRate: 28, damage: 2.8, projectileSpeed: 7 },
        { range: 125, fireRate: 22, damage: 3.4, projectileSpeed: 7.5 }
      ],
      upgradeCosts: [0, 120, 170]
    });
  }
}

class SniperTower extends Tower {
  constructor(x, y) {
    super(x, y, {
      name: 'Sniper Tower',
      type: 'sniper',
      cost: 220,
      bodyColor: '#673ab7',
      projectileColor: '#d1c4e9',
      trailColor: '#d1c4e9',
      description: 'Extreme range and high damage with a slower fire rate.',
      levelStats: [
        { range: 180, fireRate: 140, damage: 10, projectileSpeed: 9 },
        { range: 200, fireRate: 120, damage: 14, projectileSpeed: 10 },
        { range: 220, fireRate: 100, damage: 18, projectileSpeed: 12 }
      ],
      upgradeCosts: [0, 160, 220]
    });
  }
}

class FrostTower extends Tower {
  constructor(x, y) {
    super(x, y, {
      name: 'Frost Tower',
      type: 'frost',
      cost: 170,
      bodyColor: '#00acc1',
      projectileColor: '#b2ebf2',
      trailColor: '#b2ebf2',
      description: 'Slows enemies to give your other towers more time.',
      levelStats: [
        { range: 120, fireRate: 75, damage: 2, projectileSpeed: 6, special: { slow: { factor: 0.6, duration: 120 } } },
        { range: 135, fireRate: 65, damage: 3, projectileSpeed: 6.5, special: { slow: { factor: 0.5, duration: 150 } } },
        { range: 150, fireRate: 60, damage: 4, projectileSpeed: 7, special: { slow: { factor: 0.45, duration: 180 } } }
      ],
      upgradeCosts: [0, 130, 190]
    });
  }
}

const TOWER_TYPES = {
  basic: { id: 'placeBasicTower', cost: 100, classRef: BasicTower },
  rapid: { id: 'placeRapidTower', cost: 150, classRef: RapidTower },
  sniper: { id: 'placeSniperTower', cost: 220, classRef: SniperTower },
  frost: { id: 'placeFrostTower', cost: 170, classRef: FrostTower }
};
/* --------------------------------------------------
   8. WAVE MANAGEMENT
   -------------------------------------------------- */
function createWaveBlueprint(waveNumber) {
  const blueprint = [];
  const baseCount = 6 + Math.floor(waveNumber * 1.5);
  for (let i = 0; i < baseCount; i++) blueprint.push('basic');

  if (waveNumber >= 2) {
    const fastCount = Math.max(2, Math.floor(waveNumber / 1.6));
    for (let i = 0; i < fastCount; i++) blueprint.push('fast');
  }

  if (waveNumber >= 4) {
    const swarmCount = Math.floor(waveNumber / 2);
    for (let i = 0; i < swarmCount; i++) blueprint.push('swarm');
  }

  if (waveNumber >= 5) {
    const tankCount = Math.max(1, Math.floor((waveNumber - 3) / 1.8));
    for (let i = 0; i < tankCount; i++) blueprint.push('tank');
  }

  if (waveNumber > 0 && waveNumber % 8 === 0) {
    blueprint.push('tank', 'tank');
  }

  if (waveNumber > 0 && waveNumber % 10 === 0) {
    blueprint.push('boss');
  }

  return shuffle(blueprint);
}

function createEnemyByType(type, waveNumber) {
  let enemy;
  switch (type) {
    case 'fast':
      enemy = new FastEnemy();
      break;
    case 'tank':
      enemy = new TankEnemy();
      break;
    case 'swarm':
      enemy = new SwarmEnemy();
      break;
    case 'boss':
      enemy = new BossEnemy();
      enemy.applyScaling(waveNumber, 0.6);
      return enemy;
    default:
      enemy = new BasicEnemy();
      break;
  }
  enemy.applyScaling(waveNumber);
  return enemy;
}

function startNextWave(triggeredByPlayer = false) {
  if (!nextWaveReady || gameOver) return;

  wave++;
  updateWaveDisplay();

  const blueprint = upcomingBlueprint.length > 0 ? upcomingBlueprint.slice() : createWaveBlueprint(wave);
  spawnQueue = blueprint.slice();
  spawnCooldown = SPAWN_INTERVAL_BASE;
  waveInProgress = true;
  nextWaveReady = false;

  updateCurrentWaveInfo(blueprint);
  upcomingBlueprint = createWaveBlueprint(wave + 1);
  updateUpcomingWaveInfo(upcomingBlueprint);
  updateNextWaveButton();

  if (triggeredByPlayer) setStatusMessage('Wave ' + wave + ' started!', 150);
  updateWaveProgressLabel();
}

function handleWaveCompleted() {
  if (!waveInProgress) return;
  waveInProgress = false;

  const reward = 80 + wave * 15;
  money += reward;
  updateMoneyDisplay();

  setStatusMessage('Wave ' + wave + ' defeated! Bonus: ' + reward, 240);
  updateCurrentWaveInfo([]);
  prepareNextWave();
}

function prepareNextWave() {
  if (gameOver) return;
  upcomingBlueprint = createWaveBlueprint(wave + 1);
  nextWaveReady = true;
  updateUpcomingWaveInfo(upcomingBlueprint);
  updateNextWaveButton();
}
/* --------------------------------------------------
   9. MAP MENU & HUD UPDATES
   -------------------------------------------------- */
function populateMapMenu() {
  const list = document.getElementById('mapList');
  if (!list) return;

  list.innerHTML = '';
  MAP_LIBRARY.forEach((mapConfig) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-option';

    const title = document.createElement('span');
    title.className = 'map-title';
    title.textContent = mapConfig.name;

    const description = document.createElement('span');
    description.className = 'map-description';
    description.textContent = mapConfig.description;

    button.appendChild(title);
    button.appendChild(description);
    if (currentMapConfig && currentMapConfig.id === mapConfig.id) {
      button.classList.add('active-map');
    }
    button.addEventListener('click', () => handleMapSelection(mapConfig.id));
    list.appendChild(button);
  });
}

function showMapMenu() {
  populateMapMenu();
  const closeButton = document.getElementById('closeMapMenuButton');
  if (closeButton) closeButton.classList.toggle('hidden', !currentMapConfig);
  const menu = document.getElementById('mapMenu');
  if (menu) menu.classList.remove('hidden');
}

function hideMapMenu() {
  const menu = document.getElementById('mapMenu');
  if (menu) menu.classList.add('hidden');
}

function handleMapSelection(mapId) {
  const config = MAP_LIBRARY.find((map) => map.id === mapId);
  if (!config) return;

  setCurrentMap(config);
  hideMapMenu();
  resetGame();
  setStatusMessage(config.name + ' loaded. Build your defenses and press "Start Wave 1" when ready.', 360);
}

function updateMapNameDisplay() {
  const el = document.getElementById('mapName');
  if (!el) return;
  el.textContent = currentMapConfig
    ? 'Map: ' + currentMapConfig.name
    : 'Map: Not selected';
}

function updateMoneyDisplay() {
  const el = document.getElementById('money');
  if (el) el.textContent = 'Money: ' + money;
  updateTowerButtons();
  updateTowerDetails();
}

function updateLivesDisplay() {
  const el = document.getElementById('lives');
  if (el) el.textContent = 'Lives: ' + lives;
}

function updateWaveDisplay() {
  const el = document.getElementById('wave');
  if (el) el.textContent = 'Wave: ' + wave;
}

function updateScoreDisplay() {
  const el = document.getElementById('score');
  if (el) el.textContent = 'Score: ' + score;
}

function updateWaveProgressLabel() {
  const el = document.getElementById('waveProgress');
  if (!el) return;
  const remaining = enemies.length + spawnQueue.length;
  if (waveInProgress) {
    el.textContent = 'Wave ' + wave + ': ' + remaining + ' enemies';
  } else if (wave === 0) {
    el.textContent = 'No wave in progress';
  } else {
    el.textContent = 'Wave ' + wave + ' cleared';
  }
}

function updateCurrentWaveInfo(blueprint) {
  const el = document.getElementById('currentWaveInfo');
  if (!el) return;
  if (wave === 0) {
    el.textContent = 'No wave started yet';
    return;
  }
  el.textContent = blueprint.length > 0
    ? 'Wave ' + wave + ': ' + summariseTypes(blueprint)
    : 'Wave ' + wave + ' cleared';
}

function updateUpcomingWaveInfo(blueprint) {
  const el = document.getElementById('nextWaveInfo');
  if (!el) return;
  el.textContent = blueprint.length > 0
    ? 'Next wave (' + (wave + 1) + '): ' + summariseTypes(blueprint)
    : 'Next wave unknown';
}

function updateNextWaveButton() {
  const button = document.getElementById('nextWaveButton');
  if (!button) return;
  if (!currentMapConfig) {
    button.disabled = true;
    button.classList.remove('ready');
    button.textContent = 'Select a Map';
    return;
  }
  button.disabled = !nextWaveReady || gameOver;
  button.classList.toggle('ready', nextWaveReady && !gameOver);

  let label = 'Start Next Wave';
  if (gameOver) {
    label = 'Start Next Wave';
  } else if (!nextWaveReady) {
    label = 'Wave In Progress';
  } else {
    label = wave === 0 ? 'Start Wave 1' : 'Send Next Wave';
  }
  button.textContent = label;
}

function updateTowerButtons() {
  Object.entries(TOWER_TYPES).forEach(([type, def]) => {
    const btn = document.getElementById(def.id);
    if (!btn) return;
    const affordable = money >= def.cost;
    btn.disabled = !affordable;
    btn.classList.toggle('disabled', !affordable);
    btn.classList.toggle('active', placeTowerMode && selectedTowerType === type);
  });
}

function setStatusMessage(message, duration = STATUS_DEFAULT_DURATION) {
  statusMessage = message;
  statusMessageTimer = duration;
  const el = document.getElementById('statusMessage');
  if (el) el.textContent = message;
}

function clearStatusMessage() {
  statusMessage = '';
  statusMessageTimer = 0;
  const el = document.getElementById('statusMessage');
  if (el) el.textContent = '';
}

function selectTower(tower) {
  selectedTower = tower;
  const panel = document.getElementById('towerDetails');
  if (!panel) return;

  if (!tower) {
    panel.classList.add('hidden');
    document.getElementById('towerTitle').textContent = '';
    document.getElementById('towerDescription').textContent = '';
    document.getElementById('towerStats').textContent = '';
    document.getElementById('towerUpgradeInfo').textContent = '';
    document.getElementById('upgradeTowerButton').disabled = true;
    document.getElementById('sellTowerButton').disabled = true;
    return;
  }

  panel.classList.remove('hidden');
  document.getElementById('towerTitle').textContent = tower.name + ' (level ' + tower.level + ')';
  document.getElementById('towerDescription').textContent = tower.description;

  const shotsPerSecond = FPS / tower.fireRate;
  const dps = shotsPerSecond * tower.damage;
  document.getElementById('towerStats').textContent =
    'Range: ' + Math.round(tower.range) +
    ' | Damage: ' + formatNumber(tower.damage, 1) +
    ' | Shots/s: ' + formatNumber(shotsPerSecond, 2) +
    ' | DPS: ' + formatNumber(dps, 1);

  const upgradeBtn = document.getElementById('upgradeTowerButton');
  const sellBtn = document.getElementById('sellTowerButton');
  const upgradeCost = tower.getUpgradeCost();

  if (upgradeCost === null) {
    document.getElementById('towerUpgradeInfo').textContent = 'Maximum level reached.';
    upgradeBtn.textContent = 'Upgrade';
    upgradeBtn.disabled = true;
  } else {
    document.getElementById('towerUpgradeInfo').textContent = 'Upgrade cost: ' + upgradeCost;
    upgradeBtn.textContent = 'Upgrade (' + upgradeCost + ')';
    upgradeBtn.disabled = money < upgradeCost;
  }

  sellBtn.textContent = 'Sell (' + tower.getSellValue() + ')';
  sellBtn.disabled = false;
}

function updateTowerDetails() {
  if (selectedTower) selectTower(selectedTower);
}

function cancelPlacementMode() {
  placeTowerMode = false;
  placementGhost = null;
  updateTowerButtons();
}
/* --------------------------------------------------
   10. INPUT HANDLERS
   -------------------------------------------------- */
function setPlacementMode(type) {
  const def = TOWER_TYPES[type] || TOWER_TYPES.basic;
  if (money < def.cost) {
    setStatusMessage('Not enough money for this tower.', 120);
    return;
  }
  selectedTowerType = type;
  placeTowerMode = true;
  placementGhost = null;
  selectTower(null);
  setStatusMessage('Click an empty tile to build.', 120);
  updateTowerButtons();
}

function getMousePosition(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function getTileFromMouse(e) {
  const pos = getMousePosition(e);
  const col = Math.floor(pos.x / TILE_SIZE);
  const row = Math.floor(pos.y / TILE_SIZE);
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return null;
  return { row, col, x: col * TILE_SIZE, y: row * TILE_SIZE, pos };
}

function handleCanvasClick(e) {
  const tileInfo = getTileFromMouse(e);
  if (!tileInfo) return;

  if (placeTowerMode) {
    tryPlaceTower(tileInfo.row, tileInfo.col);
    return;
  }

  const tower = towers.find(t => t.containsPoint(tileInfo.pos.x, tileInfo.pos.y));
  if (tower) selectTower(tower);
  else selectTower(null);
}

function handleCanvasMove(e) {
  if (!placeTowerMode) {
    placementGhost = null;
    return;
  }
  const tile = getTileFromMouse(e);
  if (!tile) {
    placementGhost = null;
    return;
  }
  placementGhost = {
    row: tile.row,
    col: tile.col,
    x: tile.x,
    y: tile.y,
    valid: MAP[tile.row][tile.col] === 0
  };
}

function tryPlaceTower(row, col) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return;
  if (MAP[row][col] !== 0) {
    setStatusMessage('This tile is occupied or part of the path.', 120);
    cancelPlacementMode();
    return;
  }

  const def = TOWER_TYPES[selectedTowerType] || TOWER_TYPES.basic;
  if (money < def.cost) {
    setStatusMessage('Not enough money for this tower.', 120);
    cancelPlacementMode();
    return;
  }

  money -= def.cost;
  updateMoneyDisplay();

  const TowerClass = def.classRef;
  const tower = new TowerClass(col * TILE_SIZE, row * TILE_SIZE);
  towers.push(tower);
  MAP[row][col] = 2;

  playPlaceTowerSound();
  setStatusMessage(tower.name + ' placed!', 120);
  cancelPlacementMode();
  selectTower(tower);
}

function handleUpgradeTower() {
  if (!selectedTower) return;
  const cost = selectedTower.getUpgradeCost();
  if (cost === null) {
    setStatusMessage('This tower is already at max level.', 120);
    return;
  }
  if (money < cost) {
    setStatusMessage('Not enough money to upgrade.', 120);
    return;
  }

  money -= cost;
  selectedTower.totalInvested += cost;
  if (selectedTower.upgrade()) {
    playPlaceTowerSound();
    setStatusMessage(selectedTower.name + ' upgraded to level ' + selectedTower.level + '!', 150);
  }
  updateMoneyDisplay();
  updateTowerButtons();
  updateTowerDetails();
}

function handleSellTower() {
  if (!selectedTower) return;
  const value = selectedTower.getSellValue();

  const row = Math.floor(selectedTower.y / TILE_SIZE);
  const col = Math.floor(selectedTower.x / TILE_SIZE);
  towers = towers.filter(t => t !== selectedTower);
  if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) MAP[row][col] = 0;

  money += value;
  updateMoneyDisplay();
  setStatusMessage(selectedTower.name + ' sold for ' + value + '.', 150);
  selectTower(null);
}

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('pauseButton');
  if (btn) {
    btn.textContent = paused ? 'Resume' : 'Pause';
    btn.classList.toggle('paused', paused);
  }
  setStatusMessage(paused ? 'Game paused.' : 'Game resumed.', 90);
}
/* --------------------------------------------------
   11. GAME LOOP
   -------------------------------------------------- */
function update() {
  if (spawnCooldown > 0) spawnCooldown--;

  if (spawnCooldown <= 0 && spawnQueue.length > 0) {
    const type = spawnQueue.shift();
    const enemy = createEnemyByType(type, wave);
    enemies.push(enemy);
    const interval = Math.max(15, SPAWN_INTERVAL_BASE - Math.floor(wave * 2));
    spawnCooldown = interval;
    updateWaveProgressLabel();
  }

  enemies.forEach(enemy => enemy.update());
  enemies = enemies.filter(enemy => !enemy.dead);

  towers.forEach(tower => {
    tower.update();
    if (!tower.readyToFire()) return;
    const target = tower.acquireTarget();
    if (target) tower.shoot(target);
  });

  projectiles.forEach(projectile => projectile.update());
  projectiles = projectiles.filter(projectile => !projectile.dead);

  explosions.forEach(explosion => explosion.update());
  explosions = explosions.filter(explosion => explosion.life > 0);

  if (waveInProgress && spawnQueue.length === 0 && enemies.length === 0) {
    handleWaveCompleted();
  }

  if (statusMessageTimer > 0) {
    statusMessageTimer--;
    if (statusMessageTimer <= 0) clearStatusMessage();
  }

  updateWaveProgressLabel();
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const tile = MAP[r][c];
      if (tile === 1) ctx.fillStyle = '#757575';
      else if (tile === 2) ctx.fillStyle = '#37474f';
      else ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  if (placeTowerMode && placementGhost) {
    ctx.fillStyle = placementGhost.valid ? 'rgba(76, 175, 80, 0.35)' : 'rgba(244, 67, 54, 0.35)';
    ctx.fillRect(placementGhost.x, placementGhost.y, TILE_SIZE, TILE_SIZE);
  }

  enemies.forEach(enemy => enemy.render(ctx));
  towers.forEach(tower => tower.render(ctx));
  projectiles.forEach(projectile => projectile.render(ctx));
  explosions.forEach(explosion => explosion.render(ctx));

  if (selectedTower) {
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 2;
    ctx.strokeRect(selectedTower.x + 2, selectedTower.y + 2, selectedTower.w - 4, selectedTower.h - 4);
    ctx.lineWidth = 1;
  }

  if (paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paused', CANVAS_W / 2, CANVAS_H / 2);
  }
}

function gameLoop() {
  if (!paused && !gameOver) {
    update();
    checkGameOver();
  }
  render();
}

function startGameLoop() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 1000 / FPS);
}
/* --------------------------------------------------
   12. GAME FLOW
   -------------------------------------------------- */
function checkGameOver() {
  if (gameOver || lives > 0) return;
  triggerGameOver();
}

function triggerGameOver() {
  if (gameOver) return;
  gameOver = true;
  clearInterval(gameInterval);
  playGameOverSound();
  showGameOverScreen();
  nextWaveReady = false;
  updateNextWaveButton();
  setStatusMessage('The base has fallen...', 300);
}

function showGameOverScreen() {
  const screen = document.getElementById('gameOverScreen');
  if (screen) screen.classList.remove('hidden');
  const finalScore = document.getElementById('finalScore');
  if (finalScore) finalScore.textContent = score;
}

function hideGameOverScreen() {
  const screen = document.getElementById('gameOverScreen');
  if (screen) screen.classList.add('hidden');
}

function resetGame() {
  if (!currentMapConfig) {
    showMapMenu();
    return;
  }

  cancelPlacementMode();
  enemies = [];
  towers = [];
  projectiles = [];
  explosions = [];
  spawnQueue = [];
  upcomingBlueprint = [];
  spawnCooldown = 0;

  wave = 0;
  waveInProgress = false;
  nextWaveReady = true;
  gameOver = false;

  money = 200;
  lives = 10;
  score = 0;

  refreshMapLayout();
  updateMapNameDisplay();
  selectedTower = null;
  placementGhost = null;
  paused = false;
  clearStatusMessage();

  updateMoneyDisplay();
  updateLivesDisplay();
  updateWaveDisplay();
  updateScoreDisplay();
  updateWaveProgressLabel();
  updateCurrentWaveInfo([]);
  updateUpcomingWaveInfo([]);
  updateNextWaveButton();
  selectTower(null);

  hideGameOverScreen();

  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    pauseButton.textContent = 'Pause';
    pauseButton.classList.remove('paused');
  }

  prepareNextWave();
  setStatusMessage('Build your defenses and press "Start Wave 1" when ready.', 300);
  startGameLoop();
}

/* --------------------------------------------------
   13. INITIALISATION
   -------------------------------------------------- */
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  document.getElementById('placeBasicTower').addEventListener('click', () => setPlacementMode('basic'));
  document.getElementById('placeRapidTower').addEventListener('click', () => setPlacementMode('rapid'));
  document.getElementById('placeSniperTower').addEventListener('click', () => setPlacementMode('sniper'));
  document.getElementById('placeFrostTower').addEventListener('click', () => setPlacementMode('frost'));

  document.getElementById('upgradeTowerButton').addEventListener('click', handleUpgradeTower);
  document.getElementById('sellTowerButton').addEventListener('click', handleSellTower);
  document.getElementById('pauseButton').addEventListener('click', togglePause);
  document.getElementById('restartButton').addEventListener('click', resetGame);
  document.getElementById('nextWaveButton').addEventListener('click', () => startNextWave(true));
  document.getElementById('changeMapButton').addEventListener('click', () => {
    cancelPlacementMode();
    showMapMenu();
  });
  document.getElementById('closeMapMenuButton').addEventListener('click', () => {
    if (!currentMapConfig) return;
    hideMapMenu();
  });

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('mousemove', handleCanvasMove);
  canvas.addEventListener('mouseleave', () => { placementGhost = null; });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    }
    if (e.code === 'KeyN') {
      e.preventDefault();
      startNextWave(true);
    }
  });

  populateMapMenu();
  updateMapNameDisplay();
  updateMoneyDisplay();
  updateLivesDisplay();
  updateWaveDisplay();
  updateScoreDisplay();
  updateWaveProgressLabel();
  updateCurrentWaveInfo([]);
  updateUpcomingWaveInfo([]);
  updateNextWaveButton();
  setStatusMessage('Select a map to begin.', 240);
  showMapMenu();
}

/* --------------------------------------------------
   14. STARTUP
   -------------------------------------------------- */
window.onload = init;
