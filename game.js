// ============================================================
// My Pixel Runner
// ============================================================
// このファイルでは「ゲームの動き」を担当します。
// 画像そのものの変更は images フォルダで行います。
//
// 今後機能を追加するときも、できるだけ
// 「設定」「ゲーム状態」「キャラクター」「障害物」
// のように役割を分けて書いていきます。
// ============================================================


// ============================================================
// 1. ゲームの基本設定
// ============================================================

const GAME_CONFIG = {
  // Canvasの大きさ
  width: 800,
  height: 400,

  // 地面の高さ
  // ここを変更すると、キャラクターや障害物の地面位置を変更できます。
  groundY: 360,

  // ゲーム開始時の速度
  obstacleSpeed: 8,

  // 時間経過による速度アップ
  speedIncrease: 0.0005,

  // 重力
  gravity: 0.9,

  // ジャンプの強さ
  jumpPower: -20,

  // キャラクターの表示サイズ
  playerWidth: 128,
  playerHeight: 128,

  // 障害物の表示サイズ
  obstacleWidth: 64,
  obstacleHeight: 64
};


// ============================================================
// 2. HTML要素・Canvas
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");

const gameMessage = document.getElementById("gameMessage");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");


// ============================================================
// 3. 画像を読み込む
// ============================================================

const images = {
  playerRun1: loadImage("images/player_run1.png"),
  playerRun2: loadImage("images/player_run2.png"),
  playerJump: loadImage("images/player_jump.png"),
  obstacle: loadImage("images/obstacle.png"),
  background: loadImage("images/background.png")
};

function loadImage(path) {
  const image = new Image();
  image.src = path;
  return image;
}


// ============================================================
// 4. ゲームの状態
// ============================================================

let gameState = "ready";
// ready     = スタート待ち
// playing   = プレイ中
// gameOver  = ゲームオーバー

let score = 0;
let highScore = Number(localStorage.getItem("pixelRunnerHighScore")) || 0;

let gameSpeed = GAME_CONFIG.obstacleSpeed;
let lastTime = 0;
let animationId = null;

highScoreElement.textContent = highScore;


// ============================================================
// 5. キャラクター
// ============================================================

const player = {
  x: 100,
  y: GAME_CONFIG.groundY - GAME_CONFIG.playerHeight,

  width: GAME_CONFIG.playerWidth,
  height: GAME_CONFIG.playerHeight,

  velocityY: 0,
  isJumping: false,

  // 走るアニメーション用
  animationTimer: 0,
  animationFrame: 0
};


// ============================================================
// 6. 障害物
// ============================================================

const obstacle = {
  x: GAME_CONFIG.width + 100,
  y: GAME_CONFIG.groundY - GAME_CONFIG.obstacleHeight,

  width: GAME_CONFIG.obstacleWidth,
  height: GAME_CONFIG.obstacleHeight
};


// ============================================================
// 7. 背景のスクロール位置
// ============================================================

let backgroundX = 0;


// ============================================================
// 8. ゲーム開始
// ============================================================

function startGame() {
  if (gameState === "playing") {
    return;
  }

  score = 0;
  gameSpeed = GAME_CONFIG.obstacleSpeed;

  player.y = GAME_CONFIG.groundY - player.height;
  player.velocityY = 0;
  player.isJumping = false;

  obstacle.x = GAME_CONFIG.width + 100;

  backgroundX = 0;

  gameState = "playing";

  hideMessage();

  lastTime = performance.now();

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  animationId = requestAnimationFrame(gameLoop);
}


// ============================================================
// 9. ジャンプ
// ============================================================

function jump() {
  // ゲーム開始前なら、まずゲームを開始
  if (gameState === "ready") {
    startGame();
    return;
  }

  // ゲームオーバーなら、最初からやり直す
  if (gameState === "gameOver") {
    startGame();
    return;
  }

  // 空中では二段ジャンプしない
  if (player.isJumping) {
    return;
  }

  player.velocityY = GAME_CONFIG.jumpPower;
  player.isJumping = true;
}


// ============================================================
// 10. キーボード操作
// ============================================================

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    // ページがスクロールするのを防ぐ
    event.preventDefault();
    jump();
  }
});


// ============================================================
// 11. スマートフォン・マウス操作
// ============================================================

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  jump();
});


// ============================================================
// 12. ゲームループ
// ============================================================

function gameLoop(currentTime) {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  update(deltaTime);
  draw();

  if (gameState === "playing") {
    animationId = requestAnimationFrame(gameLoop);
  }
}


// ============================================================
// 13. ゲーム内部の更新
// ============================================================

function update(deltaTime) {
  // --------------------------------------------
  // スコア
  // --------------------------------------------

  score += deltaTime * 0.01;

  scoreElement.textContent = Math.floor(score);


  // --------------------------------------------
  // ゲーム速度
  // --------------------------------------------

  gameSpeed += deltaTime * GAME_CONFIG.speedIncrease;


  // --------------------------------------------
  // キャラクターの重力
  // --------------------------------------------

  player.velocityY += GAME_CONFIG.gravity;

  player.y += player.velocityY;


  // 地面に着いたら止める
  const groundPlayerY =
    GAME_CONFIG.groundY - player.height;

  if (player.y >= groundPlayerY) {
    player.y = groundPlayerY;
    player.velocityY = 0;
    player.isJumping = false;
  }


  // --------------------------------------------
  // キャラクターの走るアニメーション
  // --------------------------------------------

  if (!player.isJumping) {
    player.animationTimer += deltaTime;

    if (player.animationTimer >= 120) {
      player.animationTimer = 0;
      player.animationFrame =
        player.animationFrame === 0 ? 1 : 0;
    }
  }


  // --------------------------------------------
  // 障害物を左へ移動
  // --------------------------------------------

  obstacle.x -= gameSpeed * (deltaTime / 16.67);


  // 画面外に出たら右側から再登場
  if (obstacle.x + obstacle.width < 0) {
    obstacle.x = GAME_CONFIG.width + 100;
  }


  // --------------------------------------------
  // 背景をスクロール
  // --------------------------------------------

  backgroundX -= gameSpeed * 0.25 * (deltaTime / 16.67);

  // 背景画像の幅を超えたら戻す
  const backgroundWidth = images.background.naturalWidth || 512;

  if (backgroundX <= -backgroundWidth) {
    backgroundX += backgroundWidth;
  }


  // --------------------------------------------
  // 当たり判定
  // --------------------------------------------

  if (isColliding(player, obstacle)) {
    endGame();
  }
}


// ============================================================
// 14. 当たり判定
// ============================================================
// 単純な四角形同士の判定です。
// ドット絵の透明部分まで当たり判定になる場合は、
// 後でここを調整できます。

function isColliding(a, b) {
  // 主人公側の当たり判定
  const playerMarginX = 25;
  const playerMarginY = 20;

  // 障害物側の当たり判定
  const obstacleMarginX = 10;
  const obstacleMarginY = 10;

  return (
    a.x + playerMarginX < b.x + b.width - obstacleMarginX &&
    a.x + a.width - playerMarginX > b.x + obstacleMarginX &&
    a.y + playerMarginY < b.y + b.height - obstacleMarginY &&
    a.y + a.height - playerMarginY > b.y + obstacleMarginY
  );
}


// ============================================================
// 15. ゲームオーバー
// ============================================================

function endGame() {
  gameState = "gameOver";

  const currentScore = Math.floor(score);

  if (currentScore > highScore) {
    highScore = currentScore;

    localStorage.setItem(
      "pixelRunnerHighScore",
      highScore
    );

    highScoreElement.textContent = highScore;
  }

  messageTitle.textContent = "GAME OVER";
  messageText.textContent =
    `SCORE: ${currentScore}　／　タップ・スペースで再スタート`;

  showMessage();
}


// ============================================================
// 16. 描画
// ============================================================

function draw() {
  // --------------------------------------------
  // 背景
  // --------------------------------------------

  drawBackground();


  // --------------------------------------------
  // 障害物
  // --------------------------------------------


  ctx.drawImage(
    images.obstacle,
    obstacle.x,
    obstacle.y,
    obstacle.width,
    obstacle.height
  );


// --------------------------------------------
// キャラクター
// --------------------------------------------

let playerImage;

if (player.isJumping) {
  playerImage = images.playerJump;
} else if (player.animationFrame === 0) {
  playerImage = images.playerRun1;
} else {
  playerImage = images.playerRun2;
}

// 主人公を描画
ctx.drawImage(
  playerImage,
  player.x,
  player.y,
  player.width,
  player.height
);
  
}


// ============================================================
// 17. 背景描画
// ============================================================

function drawBackground() {
  const background = images.background;

  // 背景画像がまだ読み込まれていない場合
  if (!background.complete || background.naturalWidth === 0) {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(
      0,
      0,
      GAME_CONFIG.width,
      GAME_CONFIG.height
    );
    return;
  }

  const width = background.naturalWidth;
  const height = GAME_CONFIG.height;

  // 背景を横方向に繰り返す
  ctx.drawImage(
    background,
    backgroundX,
    0,
    width,
    height
  );

  ctx.drawImage(
    background,
    backgroundX + width,
    0,
    width,
    height
  );

  // 画面下部を地面として扱う
  // 背景画像そのものに地面が描かれている場合は、
  // この線は透明なので何も表示されません。
}


// ============================================================
// 18. メッセージ表示
// ============================================================

function showMessage() {
  gameMessage.classList.remove("hidden");
}

function hideMessage() {
  gameMessage.classList.add("hidden");
}


// ============================================================
// 19. 最初の画面を描画
// ============================================================

function drawInitialScreen() {
  draw();
  showMessage();
}


// 画像の読み込みを待って最初の画面を表示
Promise.all(
  Object.values(images).map(
    image =>
      new Promise(resolve => {
        if (image.complete) {
          resolve();
        } else {
          image.onload = resolve;
          image.onerror = resolve;
        }
      })
  )
).then(() => {
  drawInitialScreen();
});
