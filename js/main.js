const CONFIG = Object.freeze({
  stage: { width: 1000, height: 1000 },
  token: {
    groundTop: 475,
    heroTop: 450,
    height: 450,
    minX: -14,
    maxX: 869,
    pixelsPerStep: 25,
    walkFrameMs: 40,
  },
  combat: {
    starTop: 600,
    knifeTop: 600,
    starSpeed: 5,
    knifeSpeed: 5,
    starFrameMs: 30,
    knifeFrameMs: 15,
    blockMs: 5000,
  },
  bomb: {
    startTop: 50,
    speed: 10,
    frameMs: 400,
    explodeAt: 725,
  },
});

const ASSETS = Object.freeze({
  audio: {
    wait: './audio/wait_music.mp3',
    hero: './audio/hero_initialized.mp3',
    level1: './audio/level1.mp3',
    level2: './audio/level2.mp3',
    level3: './audio/level3.mp3',
    gameOver: './audio/gameover.mp3',
    tutorial: './audio/tutorial.mp3',
    win: './audio/win.mp3',
    heroDamage1: './audio/herodamage1.mp3',
    heroDamage2: './audio/herodamage2.mp3',
    footDeath: './audio/footdeath.mp3',
    block: './audio/block.mp3',
    bombFall: './audio/bombfall.mp3',
    bombExplode: './audio/bombexplode.mp3',
  },
  images: {
    heroStand: './images/hero-standing-min.png',
    heroWalk: './images/hero-walk-min.gif',
    heroDamage: './images/damage_animate.gif',
    heroThrowLeft: './images/hero-throw-knife-left-min.gif',
    heroThrowRight: './images/hero-throw-knife-right-min.gif',
    footStand: './images/standing-min.png',
    footWalk: './images/animate-walking-opt.gif',
    footThrowLeft: './images/left-arm-throw-min.gif',
    footThrowRight: './images/right-arm-throw-min.gif',
    knifeLeft: './images/knife-left-min.gif',
    knifeRight: './images/knife-right-min.gif',
    star: './images/throwstar.gif',
    blockRight: './images/block.png',
    blockLeft: './images/block-left.png',
    bomb: './images/bomb.png',
    explode: './images/explode.gif',
    health: (amount) => `./images/healthbar/health-${amount}.png`,
  },
});

const COMMANDS = ['Block', 'Walk Left', 'Walk Right', 'Throw Knife'];
const FOOTMEN_SLOTS = [
  { id: 'first', x: 700, hue: 0, label: 'danny' },
  { id: 'second', x: 600, hue: 225, label: 'shredder' },
  { id: 'third', x: 500, hue: 135, label: 'rocksteady' },
  { id: 'fourth', x: 400, hue: 55, label: 'bebop' },
];
const HERO_SLOT = { id: 'hero', x: 50, hue: 0, label: 'yoshi' };

const $ = (selector) => document.querySelector(selector);
const stage = () => $('#backdrop');
const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

let yoshi;
let danny;
let shredder;
let rocksteady;
let bebop;
let foot;
let clan;

const sounds = Object.fromEntries(
  Object.entries(ASSETS.audio).map(([name, src]) => [name, new Audio(src)]),
);
sounds.wait.loop = true;
sounds.level1.loop = true;
sounds.level2.loop = true;
sounds.level3.loop = true;
sounds.tutorial.loop = true;

function safePlay(sound) {
  try {
    sound.currentTime = 0;
    const promise = sound.play();
    if (promise) promise.catch(() => {});
  } catch {}
}

function stopSound(sound) {
  try {
    sound.pause();
    sound.currentTime = 0;
  } catch {}
}

function stopAllMusic(except = null) {
  [sounds.wait, sounds.level1, sounds.level2, sounds.level3, sounds.gameOver, sounds.tutorial, sounds.win]
    .filter((sound) => sound !== except)
    .forEach(stopSound);
}

$('#wait-audio')?.addEventListener('click', function toggleWaitMusic() {
  if (this.classList.contains('fa-volume-high')) {
    this.classList.replace('fa-volume-high', 'fa-volume-xmark');
    stopAllMusic();
  } else {
    this.classList.replace('fa-volume-xmark', 'fa-volume-high');
    safePlay(sounds.wait);
  }
});

function logTitle(text) {
  console.log(`%c${text}`, 'color:#8FD129; font-size:22px; font-weight:bold;');
}
function logText(text) {
  console.log(`%c${text}`, 'color:#8FD129; font-size:14px;');
}
function logCode(text) {
  console.log(`%c${text}`, 'color:#ED1C28; font-size:15px; font-family:monospace;');
}
function logHint(text) {
  console.log(`%c${text}`, 'color:#FFEEA6; font-size:13px;');
}

class Health {
  constructor() {
    this.amount = 0;
    this.max = 8;
    this.node = $('#health');
  }

  decrease() {
    if (this.amount >= this.max) return;
    safePlay(this.amount % 2 === 0 ? sounds.heroDamage1 : sounds.heroDamage2);
    this.amount += 1;
    this.render();
    checkDeath();
  }

  increase() {
    this.amount = clamp(this.amount - 1, 0, this.max);
    this.render();
  }

  reset() {
    this.amount = 0;
    this.render();
  }

  render() {
    if (this.node) this.node.src = ASSETS.images.health(this.amount);
  }
}

const healthBar = new Health();

class GameObject {
  constructor({ id, src, x = 0, y = 0, height = null, width = null, className = '' }) {
    this.node = document.createElement('img');
    this.node.id = id;
    this.node.src = src;
    this.node.className = className;
    this.node.style.position = 'absolute';
    if (height) this.node.style.height = `${height}px`;
    if (width) this.node.style.width = `${width}px`;
    this._x = x;
    this._y = y;
    this.renderPosition();
  }

  get x() { return this._x; }
  set x(value) {
    this._x = Number(value);
    this.renderPosition();
  }

  get y() { return this._y; }
  set y(value) {
    this._y = Number(value);
    this.renderPosition();
  }

  renderPosition() {
    this.node.style.left = `${this._x}px`;
    this.node.style.top = `${this._y}px`;
  }

  remove() {
    this.node?.remove();
  }
}

class Token extends GameObject {
  static availableSlots = [];
  static all = [];

  constructor({ slot, baseImg, top, isHero = false }) {
    super({
      id: slot.id,
      src: baseImg,
      x: slot.x,
      y: top,
      height: CONFIG.token.height,
      className: isHero ? 'token hero' : 'token bad footman',
    });

    this.id = slot.id;
    this.label = slot.label;
    this.baseImg = baseImg;
    this.isHero = isHero;
    this.alive = true;
    this.isRunning = false;
    this.isBlocking = false;
    this._hue = slot.hue ?? 0;
    this.facing = 'left';
    this.node.style.zIndex = 99;
    this.renderAppearance();
    stage().appendChild(this.node);
    Token.all.push(this);
  }

  get hue() { return this._hue; }
  set hue(value) {
    this._hue = Number(value) || 0;
    this.renderAppearance();
  }

  get name() { return this.label; }
  set name(value) {
    this.label = String(value);
    this.node.dataset.name = this.label;
  }

  renderAppearance() {
    this.node.style.filter = `hue-rotate(${this._hue}deg)`;
    this.node.dataset.name = this.label;
  }

  face(direction) {
    this.facing = direction;
    this.node.style.transform = direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)';
  }

  walk(steps = 1, direction = -1) {
    if (this.isRunning || !this.alive) return;
    this.isRunning = true;
    this.node.src = this.isHero ? ASSETS.images.heroWalk : ASSETS.images.footWalk;
    this.face(direction > 0 ? 'right' : 'left');

    let frames = Math.max(1, Number(steps)) * CONFIG.token.pixelsPerStep;
    const intervalId = setInterval(() => {
      if (frames <= 0) {
        clearInterval(intervalId);
        this.node.src = this.baseImg;
        this.y = this.isHero ? CONFIG.token.heroTop : CONFIG.token.groundTop;
        this.face('left');
        this.isRunning = false;
        return;
      }

      this.x = clamp(this.x + direction, CONFIG.token.minX, CONFIG.token.maxX);
      frames -= 1;
    }, CONFIG.token.walkFrameMs);
  }

  walkLeft(steps = 1) { this.walk(steps, -1); }
  walkRight(steps = 1) { this.walk(steps, 1); }

  // Friendly aliases for beginners who try common naming styles.
  walkleft(steps = 1) { this.walkLeft(steps); }
  walkright(steps = 1) { this.walkRight(steps); }
  walk_left(steps = 1) { this.walkLeft(steps); }
  walk_right(steps = 1) { this.walkRight(steps); }

  throwStar(direction = 'left') {
    if (this.isHero) return logHint('Only Footmen can throw stars. Heroes throw knives with attack().');
    if (this.isRunning || !this.alive) return;
    this.isRunning = true;

    this.node.src = direction === 'left' ? ASSETS.images.footThrowRight : ASSETS.images.footThrowLeft;
    const star = new GameObject({
      id: `star-${this.id}-${crypto.randomUUID?.() ?? randInt(1, 1000000)}`,
      src: ASSETS.images.star,
      x: this.x + (direction === 'left' ? 45 : 125),
      y: CONFIG.combat.starTop,
      height: 25,
      className: `projectile ${direction === 'left' ? 'starLeft' : 'starRight'}`,
    });
    stage().appendChild(star.node);

    const intervalId = setInterval(() => {
      const hero = yoshi;
      const heroIsValidTarget = hero?.alive && hero?.node?.isConnected;
      const heroIsOnLeft = heroIsValidTarget && hero.x < this.x;

      if (heroIsValidTarget && direction === 'left' && heroIsOnLeft && collision(hero.node, star.node)) {
        hero.takeProjectileHit('right');
        cleanup();
      } else if (heroIsValidTarget && direction === 'right' && !heroIsOnLeft && collision(hero.node, star.node)) {
        hero.takeProjectileHit('left');
        cleanup();
      } else if (star.x <= -50 || star.x >= CONFIG.stage.width) {
        cleanup();
      } else {
        star.x += direction === 'left' ? -CONFIG.combat.starSpeed : CONFIG.combat.starSpeed;
      }
    }, CONFIG.combat.starFrameMs);

    const cleanup = () => {
      clearInterval(intervalId);
      star.remove();
      if (this.alive) this.node.src = this.baseImg;
      this.isRunning = false;
    };
  }

  throwStarLeft() { this.throwStar('left'); }
  throwStarRight() { this.throwStar('right'); }
  throwstarleft() { this.throwStarLeft(); }
  throwstarright() { this.throwStarRight(); }
  throw_star_left() { this.throwStarLeft(); }
  throw_star_right() { this.throwStarRight(); }

  remove() {
    this.alive = false;
    super.remove();
  }
}

class Hero extends Token {
  static slots = [HERO_SLOT];

  constructor() {
    if (document.getElementById('hero')) {
      logHint('You already have a Hero. Use reset() if you want to start over.');
      return yoshi;
    }
    safePlay(sounds.hero);
    super({ slot: HERO_SLOT, baseImg: ASSETS.images.heroStand, top: CONFIG.token.heroTop, isHero: true });
  }

  walk(steps = 1, direction = -1) {
    this.markTutorial(direction > 0 ? 'walkRight' : 'walkLeft');
    if (Number(steps) > 1) this.markTutorial('walkFar');

    if (Bomb.current?.command === 'Walk Right' && direction > 0) this.clearBombCommand();
    if (Bomb.current?.command === 'Walk Left' && direction < 0) this.clearBombCommand();

    super.walk(steps, direction);
  }

  attack(enemy) {
    if (!enemy) return logHint('Pass an enemy object into attack(), like: yoshi.attack(danny)');
    if (!enemy.node?.isConnected) return logHint('That enemy is not on the stage right now.');
    if (this.isRunning || !this.alive) return;

    if (Bomb.current?.command === 'Throw Knife') this.clearBombCommand();

    this.isRunning = true;
    const direction = this.x >= enemy.x + 150 ? 'left' : 'right';
    this.node.src = direction === 'left' ? ASSETS.images.heroThrowLeft : ASSETS.images.heroThrowRight;

    const knife = new GameObject({
      id: 'knife',
      src: direction === 'left' ? ASSETS.images.knifeLeft : ASSETS.images.knifeRight,
      x: this.x + (direction === 'left' ? 75 : 175),
      y: CONFIG.combat.knifeTop,
      height: 75,
      className: `projectile knife-${direction}`,
    });
    stage().appendChild(knife.node);

    const intervalId = setInterval(() => {
      if (collision(enemy.node, knife.node)) {
        clearInterval(intervalId);
        knife.remove();
        enemy.die();
        this.node.src = this.baseImg;
        this.isRunning = false;
      } else if (knife.x <= 0 || knife.x >= 1200) {
        clearInterval(intervalId);
        knife.remove();
        this.node.src = this.baseImg;
        this.isRunning = false;
      } else {
        knife.x += direction === 'left' ? -CONFIG.combat.knifeSpeed : CONFIG.combat.knifeSpeed;
      }
    }, CONFIG.combat.knifeFrameMs);
  }

  block(direction = 'right') {
    if (Bomb.current?.command === 'Block') this.clearBombCommand();
    this.isBlocking = true;
    this.node.classList.add('blocking', direction === 'right' ? 'block-right' : 'block-left');
    this.node.src = direction === 'right' ? ASSETS.images.blockRight : ASSETS.images.blockLeft;

    setTimeout(() => {
      this.isBlocking = false;
      this.node.src = this.baseImg;
      this.node.classList.remove('blocking', 'block-right', 'block-left');
    }, CONFIG.combat.blockMs);
  }

  blockLeft() { this.block('left'); }
  blockRight() { this.block('right'); }
  blockleft() { this.blockLeft(); }
  blockright() { this.blockRight(); }
  block_left() { this.blockLeft(); }
  block_right() { this.blockRight(); }

  takeProjectileHit(blockSideNeeded) {
    const isBlocked = this.node.classList.contains(`block-${blockSideNeeded}`);
    if (isBlocked) {
      safePlay(sounds.block);
      this.markTutorial('block');
      return;
    }
    this.node.src = ASSETS.images.heroDamage;
    setTimeout(() => { if (this.alive) this.node.src = this.baseImg; }, 2000);
    healthBar.decrease();
  }

  clearBombCommand() {
    Bomb.current?.destroy();
    this.markTutorial('bomb');
  }

  markTutorial(step) {
    this.node.dataset[`tutorial${step}`] = 'done';
  }
}

class Footman extends Token {
  static slots = [...FOOTMEN_SLOTS];
  static nextSlotIndex = 0;
  static all = [];

  constructor(slotOverride = null) {
    const slot = slotOverride ?? Footman.slots[Footman.nextSlotIndex];
    if (!slot) {
      logHint('You can only have 4 Footmen at one time.');
      return null;
    }
    Footman.nextSlotIndex += slotOverride ? 0 : 1;
    super({ slot, baseImg: ASSETS.images.footStand, top: CONFIG.token.groundTop, isHero: false });
    Footman.all.push(this);
  }

  die() {
    this.alive = false;
    safePlay(sounds.footDeath);
    this.remove();
  }

  remove() {
    super.remove();
    Footman.all = Footman.all.filter((footman) => footman !== this);
  }

  static resetSlots() {
    Footman.nextSlotIndex = 0;
    Footman.all = [];
  }
}

class Bomb extends GameObject {
  static current = null;
  static raidIntervalId = null;

  constructor() {
    if (Bomb.current) return Bomb.current;
    super({
      id: 'bomb',
      src: ASSETS.images.bomb,
      x: randInt(0, CONFIG.stage.width),
      y: CONFIG.bomb.startTop,
      width: 50,
      className: 'bomb',
    });
    this.command = COMMANDS[randInt(0, COMMANDS.length)];
    this.intervalId = null;
    Bomb.current = this;
    stage().appendChild(this.node);
    this.renderPrompt();
    safePlay(sounds.bombFall);
    this.fall();
  }

  renderPrompt() {
    $('#bomb-desc')?.remove();
    this.node.insertAdjacentHTML(
      'beforebegin',
      `<div id="bomb-desc"><span id="bomb_ins">To Stop the Bomb:</span><br>${this.command}</div>`,
    );
  }

  fall() {
    this.intervalId = setInterval(() => {
      const hero = yoshi;
      const heroLeft = hero ? hero.x + 100 : null;
      const heroRight = hero ? hero.x + 200 : null;
      const hitHero = hero && this.x >= heroLeft && this.x <= heroRight && this.y >= 500;

      if (hitHero) {
        this.explode();
        hero.takeProjectileHit('none');
        return;
      }

      if (this.y > CONFIG.bomb.explodeAt) {
        this.explode();
        return;
      }

      this.y += CONFIG.bomb.speed;
    }, CONFIG.bomb.frameMs);
  }

  explode() {
    this.node.src = ASSETS.images.explode;
    safePlay(sounds.bombExplode);
    clearInterval(this.intervalId);
    setTimeout(() => this.destroy(), 1500);
  }

  destroy() {
    clearInterval(this.intervalId);
    $('#bomb-desc')?.remove();
    super.remove();
    if (Bomb.current === this) Bomb.current = null;
  }

  static startRaid(ms = 3000) {
    Bomb.stopRaid();
    logHint('Watch out for BOMBS! Do the console action shown on screen to destroy one.');
    Bomb.raidIntervalId = setInterval(() => new Bomb(), ms);
  }

  static stopRaid() {
    clearInterval(Bomb.raidIntervalId);
    Bomb.raidIntervalId = null;
    Bomb.current?.destroy();
  }
}

function collision(nodeA, nodeB) {
  if (!nodeA || !nodeB) return false;
  const a = nodeA.getBoundingClientRect();
  const b = nodeB.getBoundingClientRect();
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function checkDeath() {
  if (healthBar.amount < healthBar.max) return;
  stopAllMusic(sounds.gameOver);
  safePlay(sounds.gameOver);
  Bomb.stopRaid();
  reset(false);
  $('#gameover').style.visibility = 'visible';
}

function reset(stopMusic = true) {
  if (stopMusic) stopAllMusic();
  clearLevelIntervals();
  Bomb.stopRaid();
  stage().innerHTML = '';
  healthBar.reset();
  Footman.resetSlots();
  Token.all = [];
  yoshi = undefined;
  danny = undefined;
  shredder = undefined;
  rocksteady = undefined;
  bebop = undefined;
  foot = undefined;
  clan = undefined;
  $('#gameover').style.visibility = 'hidden';
  $('#win').style.visibility = 'hidden';
}

function createClan() {
  Footman.resetSlots();
  const generatedClan = [new Footman(), new Footman(), new Footman(), new Footman()].filter(Boolean);
  danny = generatedClan[0];
  shredder = generatedClan[1];
  rocksteady = generatedClan[2];
  bebop = generatedClan[3];
  clan = generatedClan;
  return generatedClan;
}

function gameInfo() {
  logText('Your Hero has been made for you.');
  logCode('yoshi');
  logText('Footmen names:');
  logCode('danny      : green/default\nshredder   : blue\nrocksteady : green hue\nbebop      : orange/pink hue');
}

let levelIntervalId = null;
function clearLevelIntervals() {
  clearInterval(levelIntervalId);
  levelIntervalId = null;
}

function winScreen() {
  reset(false);
  $('#win').style.visibility = 'visible';
  safePlay(sounds.win);
}

function runLevel({ music, intervalMs, smart = false, raid = false }) {
  clearLevelIntervals();
  reset();
  safePlay(music);
  gameInfo();
  const clan = createClan();
  yoshi = new Hero();
  if (raid) Bomb.startRaid();

  levelIntervalId = setInterval(() => {
    const living = clan.filter((enemy) => enemy?.alive && enemy.node?.isConnected);

    if (healthBar.amount >= healthBar.max) {
      clearLevelIntervals();
      if (raid) Bomb.stopRaid();
      return;
    }

    if (living.length === 0) {
      stopSound(music);
      clearLevelIntervals();
      if (raid) Bomb.stopRaid();
      winScreen();
      return;
    }

    const enemy = living[randInt(0, living.length)];
    if (!enemy || enemy.isRunning) return;

    if (smart && yoshi?.node?.isConnected) {
      if (enemy.x < yoshi.x) {
        Math.random() > 0.5 ? enemy.throwStarRight() : enemy.walkRight(4);
      } else {
        Math.random() > 0.5 ? enemy.throwStarLeft() : enemy.walkLeft(4);
      }
    } else {
      const actions = [
        () => enemy.throwStarLeft(),
        () => enemy.throwStarRight(),
        () => enemy.walkLeft(4),
        () => enemy.walkRight(4),
      ];
      actions[randInt(0, actions.length)]();
    }
  }, intervalMs);
}

function level1() { runLevel({ music: sounds.level1, intervalMs: 1250 }); }
function level2() { runLevel({ music: sounds.level2, intervalMs: 750, smart: true }); }
function level3() { runLevel({ music: sounds.level3, intervalMs: 750, smart: true, raid: true }); }

function help() {
  console.clear();
  logTitle("It's Codin' Time");
  logText('This is a console game for practicing beginner OOP.');
  logText('Start the guided tutorial with:');
  logCode('tutorial()');
  logText('Or create a hero yourself with:');
  logCode('yoshi = new Hero()');
  logHint('Use actions() any time to see the command list. Use reset() to start over.');
}

function actions() {
  console.clear();
  logTitle('Console Commands');
  logText('Create objects / instances:');
  logCode('yoshi = new Hero()\ndanny = new Footman()');

  logText('\nChange attributes directly:');
  logCode('yoshi.hue = 222\nyoshi.x = 300\nyoshi.name = "Code Ninja"');

  logText('\nCall methods / abilities:');
  logCode('yoshi.walkRight()\nyoshi.walkLeft(3)\nyoshi.blockLeft()\nyoshi.blockRight()\nyoshi.attack(danny)');

  logText('\nPlay levels:');
  logCode('level1()\nlevel2()\nlevel3()');

  logText('\nBomb raid:');
  logCode('startRaid()\nstopRaid()');

  logText('\nUtility:');
  logCode('reset()\nhelp()');
}

const tutorialSteps = [];
let currentTutorialWatcher = null;

function waitForTutorial(check, next) {
  clearInterval(currentTutorialWatcher);
  currentTutorialWatcher = setInterval(() => {
    if (check()) {
      clearInterval(currentTutorialWatcher);
      next();
    }
  }, 75);
}

function tutorial() {
  reset();
  safePlay(sounds.tutorial);
  tutorialCreateHero();
}

function tutorialCreateHero() {
  console.clear();
  logTitle('Step 1: Create an object');
  logText('A class is the blueprint. An object is one actual thing made from that blueprint.');
  logText('Make one Hero object and save it in a variable named yoshi:');
  logCode('yoshi = new Hero()');
  logHint('The word new means: build a fresh Hero instance from the Hero class.');
  waitForTutorial(() => yoshi instanceof Hero, tutorialChangeAttribute);
}

function tutorialChangeAttribute() {
  console.clear();
  logTitle('Step 2: Change an attribute');
  logText('Objects can hold data. That data is stored in attributes/properties.');
  logText('Try changing your hero color by setting the hue attribute:');
  logCode('yoshi.hue = 222');
  logHint('Behind the scenes, a setter updates the image filter. For students: it feels like changing normal object data.');
  waitForTutorial(() => yoshi?.hue === 222, tutorialMoveRight);
}

function tutorialMoveRight() {
  console.clear();
  logTitle('Step 3: Call a method');
  logText('Methods are actions an object knows how to do.');
  logText('Tell your hero to walk right:');
  logCode('yoshi.walkRight()');
  waitForTutorial(() => yoshi?.node?.dataset.tutorialwalkRight === 'done', tutorialMoveFar);
}

function tutorialMoveFar() {
  console.clear();
  logTitle('Step 4: Pass an argument');
  logText('Arguments are extra information we give to a method.');
  logText('Walk left 3 steps instead of the default 1 step:');
  logCode('yoshi.walkLeft(3)');
  waitForTutorial(() => yoshi?.node?.dataset.tutorialwalkFar === 'done', tutorialSpawnEnemy);
}

function tutorialSpawnEnemy() {
  console.clear();
  logTitle('Step 5: Make another object');
  logText('Now create a Footman enemy and save it as danny:');
  logCode('danny = new Footman()');
  logHint('Same idea: class blueprint → object instance.');
  waitForTutorial(() => danny instanceof Footman, tutorialBlock);
}

function tutorialBlock() {
  console.clear();
  logTitle('Step 6: Block an attack');
  logText('Danny is going to throw stars. Use a method on yoshi to block.');
  logText('If the projectile comes from the right side, block right:');
  logCode('yoshi.blockRight()');

  const starInterval = setInterval(() => danny?.throwStarLeft(), 900);
  waitForTutorial(
    () => yoshi?.node?.dataset.tutorialblock === 'done',
    () => {
      clearInterval(starInterval);
      tutorialAttack();
    },
  );
}

function tutorialAttack() {
  console.clear();
  logTitle('Step 7: Use one object as an argument');
  logText('The attack method needs to know who to attack. Pass the enemy object into the method:');
  logCode('yoshi.attack(danny)');
  waitForTutorial(() => !danny?.node?.isConnected, tutorialBomb);
}

function tutorialBomb() {
  console.clear();
  logTitle('Step 8: React to the game state');
  logText('A bomb will show a command. Run that command before it lands.');
  logText('Use actions() if you forget the options.');
  logCode('actions()');
  foot = new Footman();
  Bomb.startRaid(3000);
  waitForTutorial(() => yoshi?.node?.dataset.tutorialbomb === 'done', tutorialFinish);
}

function tutorialFinish() {
  Bomb.stopRaid();
  foot?.remove();
  console.clear();
  logTitle('Tutorial complete');
  logText('You practiced: classes, objects, attributes, methods, and arguments.');
  logText('Try a level:');
  logCode('level1()\nlevel2()\nlevel3()');
  stopSound(sounds.tutorial);
}

function startRaid(ms = 3000) { Bomb.startRaid(ms); }
function stopRaid() { Bomb.stopRaid(); }
function refresh() { location.reload(); }

Object.assign(window, {
  Hero,
  Footman,
  Footmen: Footman,
  help,
  actions,
  tutorial,
  level1,
  level2,
  level3,
  startRaid,
  stopRaid,
  reset,
  refresh,
});

console.clear();
logTitle("It's Codin' Time");
logText('Type tutorial() to start the guided OOP lesson.');
logHint('Type actions() for the command list.');
