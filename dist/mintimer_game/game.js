// Простая web-версия игры "Миссия Иннополис" на Canvas.
// Цель — максимально сохранить механику и визуал из Pygame-версии.

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const FPS = 45;

// Константы физики и мира (взяты из Python-версии, частично упрощены)
const GRAVITY = 1.6;
const OBJECT_SCALE = 1.85;
const ROVER_SPEED_BASE = 6;

const ROVER_NORMAL_SIZE = Math.max(10, Math.floor(105 * OBJECT_SCALE));
const ROVER_DUCKING_SIZE = Math.max(10, Math.floor(63 * OBJECT_SCALE));
const COIN_RADIUS = Math.max(5, Math.floor(20 * OBJECT_SCALE));
// Уровень земли: оставляем ниже экрана меньше «земли», чтобы ровер ехал ближе к низу
const GROUND_LEVEL = SCREEN_HEIGHT - Math.floor(SCREEN_HEIGHT / 6);
// Небольшой сдвиг визуального спрайта вниз, чтобы ровер «стоял» на дороге
const ROVER_DRAW_OFFSET_Y = 56;
// Задержка вставания — хитбокс остаётся «присевшим» ещё немного после отпуска
const STAND_UP_DELAY_MS = 220;

// Состояния игры
const GameState = {
  SPLASH: "SPLASH",
  PLAYING: "PLAYING",
  COOLDOWN: "COOLDOWN",
  FINAL_RESULTS: "FINAL_RESULTS",
};

// Загрузка изображений
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Клавиатура
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // Отменим прокрутку для стрелок/пробела
  if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function setupPointer(canvas, game) {
  const toCanvasCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const xNorm = (clientX - rect.left) / rect.width;
    const yNorm = (clientY - rect.top) / rect.height;
    return {
      x: xNorm * SCREEN_WIDTH,
      y: yNorm * SCREEN_HEIGHT,
    };
  };

  canvas.addEventListener("mousedown", (e) => {
    const pos = toCanvasCoords(e.clientX, e.clientY);
    game.handlePointerDown(pos.x, pos.y);
  });
  canvas.addEventListener("mouseup", (e) => {
    const pos = toCanvasCoords(e.clientX, e.clientY);
    game.handlePointerUp(pos.x, pos.y);
  });
  canvas.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    const pos = toCanvasCoords(t.clientX, t.clientY);
    game.handlePointerDown(pos.x, pos.y);
  }, { passive: false });
  canvas.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const pos = toCanvasCoords(t.clientX, t.clientY);
    game.handlePointerUp(pos.x, pos.y);
  });
}

// Ровер
class Rover {
  constructor(sprite, spriteDucking) {
    this.sprite = sprite;
    this.spriteDucking = spriteDucking;
    // Физический хитбокс
    this.width = ROVER_NORMAL_SIZE;
    this.height = ROVER_NORMAL_SIZE;
    this.normalHeight = ROVER_NORMAL_SIZE;
    this.duckingHeight = ROVER_DUCKING_SIZE;
    this.normalWidth = ROVER_NORMAL_SIZE;
    this.duckingWidth = ROVER_NORMAL_SIZE;
    // Визуальные размеры спрайта с сохранением пропорций исходного изображения
    const baseW = (sprite && sprite.width) || ROVER_NORMAL_SIZE;
    const baseH = (sprite && sprite.height) || ROVER_NORMAL_SIZE;
    const aspect = baseW / baseH;
    // Стоя — сохраняем пропорции исходного спрайта
    this.drawWidth = ROVER_NORMAL_SIZE * aspect;
    this.drawHeight = ROVER_NORMAL_SIZE;
    // В приседе сохраняем ширину, но сжимаем только по вертикали (пропорции не обязательны)
    this.drawDuckWidth = this.drawWidth;
    this.drawDuckHeight = ROVER_DUCKING_SIZE;
    this.x = 100;
    this.y = GROUND_LEVEL - this.height;
    this.vy = 0;
    this.onGround = true;
    this.isDucking = false;
    this.jumpPressed = false;
    this.standUpUntilTs = 0; // до этого момента считаем, что ровер ещё «встаёт»
  }

  resetPosition() {
    this.width = this.normalWidth;
    this.height = this.normalHeight;
    this.x = 100;
    this.y = GROUND_LEVEL - this.height;
    this.vy = 0;
    this.onGround = true;
    this.isDucking = false;
    this.jumpPressed = false;
  }

  jump(speed) {
    if (this.onGround && !this.isDucking && !this.jumpPressed) {
      const JUMP_STRENGTH_BASE_RAW = -32;
      const JUMP_STRENGTH_BASE = Math.floor(JUMP_STRENGTH_BASE_RAW * Math.sqrt(OBJECT_SCALE));
      const JUMP_SPEED_FACTOR_BASE = 0.7;
      const JUMP_SPEED_FACTOR = JUMP_SPEED_FACTOR_BASE * Math.sqrt(OBJECT_SCALE);
      const sp = speed ?? ROVER_SPEED_BASE;
      const strength = JUMP_STRENGTH_BASE - JUMP_SPEED_FACTOR * Math.max(0, sp - ROVER_SPEED_BASE);
      this.vy = strength;
      this.onGround = false;
      this.jumpPressed = true;
    }
  }

  duck() {
    if (this.onGround) {
      this.isDucking = true;
      this.standUpUntilTs = 0; // отменяем предыдущую задержку вставания
      // При приседании «сжимаем» верх: низ (колёса) остаётся на земле.
      const bottom = GROUND_LEVEL;
      this.height = this.duckingHeight;
      this.width = this.duckingWidth;
      this.y = bottom - this.height;
      this.vy = 0;
    }
  }

  standUp() {
    // Если сейчас не в приседе — ничего не делаем
    if (!this.isDucking) return;
    // Запускаем таймер: ещё STAND_UP_DELAY_MS мс ровер считается присевшим,
    // затем в update() он «распрямится» одним шагом без дёрганий.
    this.standUpUntilTs = performance.now() + STAND_UP_DELAY_MS;
  }

  update(speed) {
    const moveSpeed = speed ?? ROVER_SPEED_BASE;
    this.x += moveSpeed;
    this.vy += GRAVITY;
    this.y += this.vy;
    this.onGround = false;
    if (this.y + this.height >= GROUND_LEVEL) {
      this.y = GROUND_LEVEL - this.height;
      this.vy = 0;
      this.onGround = true;
      // Разрешаем следующий прыжок после приземления
      this.jumpPressed = false;
    }

    // По истечении задержки вставания полностью возвращаемся в стоячее состояние
    if (this.isDucking && this.standUpUntilTs > 0 && performance.now() >= this.standUpUntilTs) {
      this.isDucking = false;
      const bottom = GROUND_LEVEL;
      this.height = this.normalHeight;
      this.width = this.normalWidth;
      this.y = bottom - this.height;
      this.standUpUntilTs = 0;
    }
  }

  getRect() {
    return {
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height,
    };
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    // Визуально опускаем спрайт чуть ниже хитбокса, чтобы он стоял на дороге
    const sy = this.y + ROVER_DRAW_OFFSET_Y;
    if (this.sprite && !this.isDucking) {
      // Стоя: спрайт с пропорциями, высота = normalHeight
      ctx.drawImage(this.sprite, sx, sy, this.drawWidth, this.drawHeight);
    } else if (this.spriteDucking && this.isDucking) {
      // Присев: более низкий спрайт, низ остаётся на земле
      ctx.drawImage(this.spriteDucking, sx, sy, this.drawDuckWidth, this.drawDuckHeight);
    } else {
      ctx.fillStyle = "#5aaaff";
      ctx.fillRect(sx, sy, this.width, this.height);
    }
  }
}

class Obstacle {
  constructor(x, y, w, h, type) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type; // "jump" or "duck"
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  draw(ctx, cameraX) {
    const sx = this.x - cameraX;
    const sy = this.y;
    ctx.save();
    if (this.type === "jump") {
      ctx.fillStyle = "#e04646";
    } else {
      ctx.fillStyle = "#8b5a2b";
    }
    ctx.fillRect(sx, sy, this.w, this.h);
    ctx.restore();
  }
}

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = COIN_RADIUS;
    this.collected = false;
    this.anim = 0;
  }

  getRect() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }

  update() {
    this.anim += 0.1;
  }

  draw(ctx, cameraX, logo) {
    if (this.collected) return;
    const sx = this.x - cameraX;
    const sy = this.y + Math.sin(this.anim) * 5;
    ctx.save();
    ctx.fillStyle = "#ffdd33";
    ctx.beginPath();
    ctx.arc(sx, sy, this.r, 0, Math.PI * 2);
    ctx.fill();
    // Логотип IU поверх монеты, если есть текстура
    if (logo) {
      const size = this.r * 1.6;
      ctx.drawImage(logo, sx - size / 2, sy - size / 2, size, size);
    }
    ctx.restore();
  }
}

// Простой AABB-пересечение
function rectsIntersect(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;

    this.state = GameState.SPLASH;
    this.justResetToSplash = false;

    this.rover = new Rover(assets.rover, assets.roverDuck);
    this.cameraX = 0;
    this.roverSpeed = ROVER_SPEED_BASE;
    this.lastSpeedIncreaseTime = performance.now();

    this.obstacles = [];
    this.coins = [];
    this.levelFront = 1200;

    this.score = 0;
    this.bestScore = 0;

    this.pointerStart = { x: 0, y: 0 };

    // Фоновые здания (PNG) с параллаксом
    this.buildings = assets.buildings || [];
    this.bgHouses = [];
    if (this.buildings.length) {
      const BG_HOUSE_SPACING_MIN = 600;
      const BG_HOUSE_SPACING_MAX = 840;
      let wx = 180;
      const maxX = 20000;
      let idx = 0;
      while (wx < maxX) {
        const surf = this.buildings[idx % this.buildings.length];
        this.bgHouses.push({ x: wx, idx: idx % this.buildings.length });
        const spacing = BG_HOUSE_SPACING_MIN +
          Math.random() * (BG_HOUSE_SPACING_MAX - BG_HOUSE_SPACING_MIN);
        wx += surf.width + spacing;
        idx++;
      }
    }

    this.lastTimestamp = performance.now();

    setupPointer(canvas, this);
  }

  resetToSplashFromFinal() {
    this.state = GameState.SPLASH;
    this.rover.resetPosition();
    this.roverSpeed = ROVER_SPEED_BASE;
    this.cameraX = 0;
    this.obstacles = [];
    this.coins = [];
    this.levelFront = 1200;
    this.score = 0;
    this.justResetToSplash = true;
  }

  startGame() {
    this.state = GameState.PLAYING;
    this.rover.resetPosition();
    this.roverSpeed = ROVER_SPEED_BASE;
    this.cameraX = 0;
    this.obstacles = [];
    this.coins = [];
    this.levelFront = this.rover.x + 2000;
    this.score = 0;
    this.justResetToSplash = false;
  }

  handlePointerDown(x, y) {
    if (this.state === GameState.SPLASH) {
      if (this.justResetToSplash) {
        this.justResetToSplash = false;
      } else {
        this.startGame();
      }
      return;
    }
    if (this.state === GameState.FINAL_RESULTS) {
      this.resetToSplashFromFinal();
      return;
    }
    if (this.state === GameState.PLAYING) {
      // Простое управление зонами: верх — прыжок, низ — присед (зажатие)
      if (y < SCREEN_HEIGHT / 2) {
        this.rover.jump(this.roverSpeed);
      } else {
        this.rover.duck();
      }
    }
  }

  handlePointerUp(x, y) {
    if (this.state === GameState.PLAYING) {
      // Отпускаем присед — ровер встаёт (с задержкой хитбокса, как в десктопной версии)
      this.rover.standUp();
    }
  }

  handleKeyboard() {
    if (keys["Space"]) {
      if (this.state === GameState.SPLASH) {
        if (this.justResetToSplash) {
          this.justResetToSplash = false;
        } else {
          this.startGame();
        }
        keys["Space"] = false;
      } else if (this.state === GameState.FINAL_RESULTS) {
        this.resetToSplashFromFinal();
        keys["Space"] = false;
      }
    }
  }

  generateLevelChunk() {
    const ground = GROUND_LEVEL;
    let x = this.levelFront;
    const minGap = Math.floor(380 * 1.5);
    const maxGap = Math.floor(620 * 1.5);

    while (x < this.cameraX + SCREEN_WIDTH * 2) {
      const type = Math.random() < 0.5 ? "jump" : "duck";
      const width = Math.floor((12 + Math.random() * (30 - 12)) * OBJECT_SCALE);
      let height;
      let y;
      if (type === "jump") {
        height = Math.floor((45 + Math.random() * (70 - 45)) * OBJECT_SCALE);
        y = ground - height;
      } else {
        height = Math.floor((210 + Math.random() * (260 - 210)) * OBJECT_SCALE);
        y = (ground - ROVER_DUCKING_SIZE) - height;
      }
      this.obstacles.push(new Obstacle(x, y, width, height, type));

      // монета после препятствия
      const coinX = x + width + (70 + Math.random() * (160 - 70)) * OBJECT_SCALE;
      const coinY = ground - 60 * OBJECT_SCALE;
      this.coins.push(new Coin(coinX, coinY));

      x += width + (minGap + Math.random() * (maxGap - minGap));
    }
    this.levelFront = x;
  }

  update(dt) {
    this.handleKeyboard();

    if (this.state === GameState.PLAYING) {
      const now = performance.now();
      if (now - this.lastSpeedIncreaseTime > 5000) {
        this.roverSpeed += 1;
        this.lastSpeedIncreaseTime = now;
      }

      this.rover.update(this.roverSpeed);
      this.cameraX = this.rover.x - SCREEN_WIDTH * 0.05;
      if (this.cameraX < 0) this.cameraX = 0;

      if (this.levelFront < this.cameraX + SCREEN_WIDTH * 2) {
        this.generateLevelChunk();
      }

      // коллизии с монетами
      const roverRect = this.rover.getRect();
      for (const coin of this.coins) {
        if (!coin.collected && rectsIntersect(roverRect, coin.getRect())) {
          coin.collected = true;
          this.score += 1;
          if (this.score > this.bestScore) this.bestScore = this.score;
        }
        coin.update();
      }

      // коллизии с препятствиями
      for (const obs of this.obstacles) {
        if (rectsIntersect(roverRect, obs.getRect())) {
          if (obs.type === "jump") {
            // врезался
            this.state = GameState.FINAL_RESULTS;
          } else if (obs.type === "duck" && !this.rover.isDucking) {
            this.state = GameState.FINAL_RESULTS;
          }
        }
      }

      // очистить далеко позади
      this.obstacles = this.obstacles.filter(o => o.x + o.w > this.cameraX - 200);
      this.coins = this.coins.filter(c => c.x + c.r > this.cameraX - 200 && !c.collected);
    }
  }

  drawSplash() {
    const ctx = this.ctx;
    if (this.assets.splash) {
      ctx.drawImage(this.assets.splash, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    } else {
      ctx.fillStyle = "#1b2340";
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      ctx.fillStyle = "white";
      ctx.font = "bold 40px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Миссия Иннополис", SCREEN_WIDTH / 2, 200);
      ctx.font = "24px system-ui";
      ctx.fillText("Нажмите ПРОБЕЛ или тапните", SCREEN_WIDTH / 2, 260);
      ctx.fillText("чтобы начать", SCREEN_WIDTH / 2, 300);
    }
  }

  drawFinal() {
    const ctx = this.ctx;
    // Фон — тёмный фон, как на стенде
    const grad = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    grad.addColorStop(0, "rgb(25,20,40)");
    grad.addColorStop(1, "rgb(10,8,20)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Мягкие «вспышки»
    ctx.save();
    ctx.fillStyle = "rgba(255,215,120,0.22)";
    ctx.beginPath();
    ctx.arc(180, 120, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(SCREEN_WIDTH - 160, 720, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Заголовок
    ctx.fillStyle = "rgb(255,245,200)";
    ctx.textAlign = "center";
    ctx.font = "bold 40px system-ui";
    ctx.fillText("Ты молодец!", SCREEN_WIDTH / 2, 90);

    // Основное сообщение
    ctx.fillStyle = "rgb(230,230,240)";
    ctx.font = "26px system-ui";
    ctx.fillText("получи приз за подписку на наш канал", SCREEN_WIDTH / 2, 150);
    ctx.fillStyle = "#ffd700";
    ctx.fillText("«Технологии путешествий»", SCREEN_WIDTH / 2, 190);

    // Результат игрока — количество собранных монет
    ctx.fillStyle = "rgb(230,230,240)";
    ctx.font = "24px system-ui";
    ctx.fillText(`Твой результат: ${this.score} монет`, SCREEN_WIDTH / 2, 230);

    // QR-код, если есть
    const qrTop = 240;
    let qrBottom;
    const qr = this.assets.qrTravel;
    if (qr) {
      const maxSide = Math.min(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 3);
      const scale = maxSide / Math.max(qr.width, qr.height);
      const w = Math.max(50, Math.floor(qr.width * scale));
      const h = Math.max(50, Math.floor(qr.height * scale));
      const x = SCREEN_WIDTH / 2 - w / 2;
      const y = qrTop;
      ctx.drawImage(qr, x, y, w, h);
      qrBottom = y + h;
    } else {
      const w = 260, h = 260;
      const x = (SCREEN_WIDTH - w) / 2;
      const y = qrTop;
      ctx.fillStyle = "rgb(40,40,60)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgb(200,200,230)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgb(220,220,240)";
      ctx.font = "20px system-ui";
      ctx.fillText("QR @travel_techinno", SCREEN_WIDTH / 2, y + h / 2);
      qrBottom = y + h;
    }

    // Пояснение под QR
    ctx.fillStyle = "rgb(210,210,225)";
    ctx.font = "22px system-ui";
    ctx.fillText("Отсканируй QR и подпишись на Telegram-канал", SCREEN_WIDTH / 2, qrBottom + 40);
    ctx.fillStyle = "#ffd700";
    ctx.font = "24px system-ui";
    ctx.fillText("@travel_techinno", SCREEN_WIDTH / 2, qrBottom + 75);

    // Кнопка/подсказка «Играть снова»
    const btnW = 520, btnH = 58;
    const btnX = (SCREEN_WIDTH - btnW) / 2;
    const btnY = SCREEN_HEIGHT - 110;
    ctx.fillStyle = "rgba(80,180,120,0.9)";
    ctx.beginPath();
    const r = 26;
    ctx.moveTo(btnX + r, btnY);
    ctx.lineTo(btnX + btnW - r, btnY);
    ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + r);
    ctx.lineTo(btnX + btnW, btnY + btnH - r);
    ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH);
    ctx.lineTo(btnX + r, btnY + btnH);
    ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - r);
    ctx.lineTo(btnX, btnY + r);
    ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgb(120,220,160)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "22px system-ui";
    ctx.fillText("ПРОБЕЛ / ТАП — играть снова", SCREEN_WIDTH / 2, btnY + btnH / 2 + 7);
  }

  drawGame() {
    const ctx = this.ctx;
    // Небо (просто градиентом/цветом)
    ctx.drawImage(this.assets.sky, 0, 0);

    // Фоновые здания (PNG, параллакс) — как в десктопной версии
    const parallax = 0.35;
    for (const bh of this.bgHouses) {
      const img = this.buildings[bh.idx];
      if (!img) continue;
      const screenX = bh.x - this.cameraX * parallax;
      if (screenX + img.width < -80 || screenX > SCREEN_WIDTH + 200) continue;
      const screenY = GROUND_LEVEL - img.height + 100;
      ctx.drawImage(img, screenX, screenY, img.width, img.height);
    }

    // Земля: нижняя часть экрана — коричневый градиент, сверху тонкая травяная полоса
    const totalGroundH = SCREEN_HEIGHT - GROUND_LEVEL;
    const grd = ctx.createLinearGradient(0, GROUND_LEVEL, 0, SCREEN_HEIGHT);
    grd.addColorStop(0, "#4a8b50");
    grd.addColorStop(1, "#5c3a22");
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_LEVEL, SCREEN_WIDTH, totalGroundH);

    // Текстурная трава: небольшая полоса над линией земли, двигается с лёгким параллаксом
    const grassBandH = 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, GROUND_LEVEL - grassBandH, SCREEN_WIDTH, grassBandH);
    ctx.clip();
    const grassParallax = 0.3;
    const period = SCREEN_WIDTH + 64;
    for (let i = 0; i < period; i += 16) {
      let sx = (i - this.cameraX * grassParallax) % period;
      if (sx < -16) sx += period;
      if (sx < -16 || sx > SCREEN_WIDTH + 16) continue;
      const bladeHeight = 8 + 4 * Math.sin(i * 0.25);
      const yTop = GROUND_LEVEL - bladeHeight;
      ctx.strokeStyle = "#5fa867";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, GROUND_LEVEL);
      ctx.lineTo(sx + 4, yTop);
      ctx.stroke();
      ctx.strokeStyle = "#3f7b4c";
      ctx.beginPath();
      ctx.moveTo(sx + 9, GROUND_LEVEL);
      ctx.lineTo(sx + 9, yTop + 3);
      ctx.stroke();
    }
    ctx.restore();

    // Линия края травы
    ctx.strokeStyle = "#356d3e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_LEVEL);
    ctx.lineTo(SCREEN_WIDTH, GROUND_LEVEL);
    ctx.stroke();

    // Дорога, по которой едет ровер (тёмная полоса чуть ниже края травы)
    const roadHeight = 26;
    const roadY = GROUND_LEVEL + 6;
    ctx.fillStyle = "#3a2f28";
    ctx.fillRect(0, roadY, SCREEN_WIDTH, roadHeight);
    ctx.strokeStyle = "#5c4638";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(SCREEN_WIDTH, roadY);
    ctx.stroke();

    // Монеты
    for (const c of this.coins) c.draw(ctx, this.cameraX, this.assets.coinLogo);
    // Препятствия
    for (const o of this.obstacles) o.draw(ctx, this.cameraX);
    // Ровер
    this.rover.draw(ctx, this.cameraX);

    // Инструкция по управлению: верх — прыжок, низ — присед
    const half = SCREEN_HEIGHT / 2;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "rgb(80,180,120)";
    ctx.fillRect(0, 0, SCREEN_WIDTH, half);
    ctx.fillStyle = "rgb(120,90,60)";
    ctx.fillRect(0, half, SCREEN_WIDTH, half);
    ctx.restore();

    ctx.save();
    ctx.textAlign = "right";
    ctx.font = "20px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("Прыжок — тап в верхней части экрана", SCREEN_WIDTH - 20, half / 2);
    ctx.fillText("Присесть — удерживать нижнюю часть экрана", SCREEN_WIDTH - 20, half + half / 2);
    ctx.restore();

    // UI — счёт
    ctx.fillStyle = "rgba(20,25,35,0.8)";
    ctx.fillRect(12, 12, 220, 80);
    ctx.strokeStyle = "rgba(100,180,255,0.8)";
    ctx.strokeRect(12, 12, 220, 80);
    ctx.fillStyle = "white";
    ctx.font = "20px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`Счёт: ${this.score}`, 24, 40);
    ctx.fillText(`Скорость: ${this.roverSpeed.toFixed(0)}`, 24, 66);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (this.state === GameState.SPLASH) {
      this.drawSplash();
    } else if (this.state === GameState.PLAYING) {
      this.drawGame();
    } else if (this.state === GameState.FINAL_RESULTS) {
      this.drawFinal();
    }
  }

  loop = (timestamp) => {
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  };
}

async function main() {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Простейший фон неба
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = SCREEN_WIDTH;
  skyCanvas.height = GROUND_LEVEL + 20;
  const skyCtx = skyCanvas.getContext("2d");
  const grad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
  grad.addColorStop(0, "rgb(200,230,255)");
  grad.addColorStop(1, "rgb(140,180,220)");
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  // Загрузка спрайтов
  const [
    roverImg,
    splashImg,
    splashWebImg,
    coinLogoImg,
    technoImg,
    univImg,
    sportImg,
    houseImg,
    travelQrImg,
  ] = await Promise.all([
    loadImage("sprites/mintimer.png").catch(() => null),
    loadImage("sprites/start.png").catch(() => null),
    loadImage("start_web.png").catch(() => null),
    loadImage("sprites/iu_logo.png").catch(() => null),
    loadImage("sprites/technopark.png").catch(() => null),
    loadImage("sprites/university.png").catch(() => null),
    loadImage("sprites/sportcomplex.png").catch(() => null),
    loadImage("sprites/house.png").catch(() => null),
    loadImage("travel_tech.png").catch(() => null),
  ]);

  let roverSurf = null;
  let roverDuckSurf = null;
  if (roverImg) {
    roverSurf = roverImg;
    roverDuckSurf = roverImg;
  }

  // Масштабирование зданий по высоте (как BG_TECHOPARK_HEIGHT в Python-версии)
  const buildingImgs = [technoImg, univImg, sportImg, houseImg].filter(Boolean);
  const buildings = [];
  const BUILDING_TARGET_H = 384;
  for (const img of buildingImgs) {
    const scale = BUILDING_TARGET_H / img.height;
    const w = Math.max(1, Math.floor(img.width * scale));
    const h = BUILDING_TARGET_H;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d");
    cctx.drawImage(img, 0, 0, w, h);
    buildings.push(c);
  }

  const game = new Game(canvas, {
    rover: roverSurf,
    roverDuck: roverDuckSurf,
    sky: skyCanvas,
    // На заставку в web-версии сначала используем start_web.png (из корня),
    // если его нет — падаем назад на sprites/start.png
    splash: splashWebImg || splashImg || null,
    coinLogo: coinLogoImg || null,
    buildings,
    qrTravel: travelQrImg || null,
  });

  requestAnimationFrame(game.loop);
}

main().catch((e) => {
  console.error(e);
});

