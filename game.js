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

const GAME_VERSION = "v0.1.51";
const GAME_CONFIG = {
  // Canvasの大きさ
  width: 800,
  height: 400,

  // 地面の高さ
  // ここを変更すると、キャラクターや障害物の地面位置を変更できます。
  groundY: 346,

  // ゲーム開始時の速度
  obstacleSpeed: 8,

  // ゲーム中の最高速度
  maxObstacleSpeed: 12,

// 時間経過による速度アップ
speedIncrease: 0.0005,

  // 障害物同士の間隔
  // 前の障害物が画面外に消えてから、
  // 次の障害物が登場するまでの距離です。
  minObstacleGap: 600,
  maxObstacleGap: 1000,

  // 重力
  gravity: 1.8,

  // ジャンプの強さ
  jumpPower: -21,

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
  obstacle2: loadImage("images/obstacle2.png"),
  background: loadImage("images/background.png"),
  houseClosed: loadImage("images/house_closed.png"),
  houseOpen: loadImage("images/house_open.png")
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
let gameElapsedTime = 0;

let goalStarted = false;
let houseX = GAME_CONFIG.width;

let goalWaiting = false;
let goalWaitTimer = 0;
const goalWaitDuration = 3000;

// ゴール演出の段階
// 0 = 通常プレイ
// 1 = 犬停止（1秒）
// 2 = ジャンプ
// 3 = 着地後停止（1秒）
// 4 = 家の前まで歩く
// 5 = 家の前で停止（0.5秒）
// 6 = 扉が開いたあと、扉まで歩く
// 7 = 暗転
let goalPhase = 0;

let goalPlayerTargetX = 0;
const goalPlayerSpeed = 3;

// 1回目の停止時間
const goalStartWaitDuration = 1000;

// ジャンプ着地後の停止時間
const goalLandingWaitDuration = 1000;

// 家の前で停止する時間
const goalHouseWaitDuration = 500;

// 扉の前まで進む位置
const goalFinalTargetX = 550;

// 暗転する時間
const goalBlackoutDuration = 1500;

// 扉が開いているか
let doorOpen = false;

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

// 複数の障害物を管理します
const obstacles = [
  {
    x: GAME_CONFIG.width + 100,
    y: GAME_CONFIG.groundY - GAME_CONFIG.obstacleHeight,

    width: GAME_CONFIG.obstacleWidth,
    height: GAME_CONFIG.obstacleHeight,

    image: images.obstacle
  }
];


// ============================================================
// 7. 背景のスクロール位置
// ============================================================

let backgroundX = 0;

// ============================================================
// 障害物の間隔をランダムに決める
// ============================================================

function getRandomObstacleGap() {
  const random = Math.random();

  // 20%：近め
  if (random < 0.2) {
    return 350 + Math.random() * 100;
  }

  // 50%：普通
  if (random < 0.7) {
    return 500 + Math.random() * 150;
  }

  // 30%：少し休憩
  return 750 + Math.random() * 200;
}
// ============================================================
// 8. ゲーム開始
// ============================================================

function startGame() {
  if (gameState === "playing") {
    return;
  }

score = 0;
gameElapsedTime = 0;
gameSpeed = GAME_CONFIG.obstacleSpeed;

goalStarted = false;
goalWaiting = false;
goalWaitTimer = 0;
houseX = GAME_CONFIG.width;

goalPhase = 0;
goalPlayerTargetX = 0;
doorOpen = false;
  
  player.y = GAME_CONFIG.groundY - player.height;
  player.velocityY = 0;
  player.isJumping = false;

obstacles.length = 1;
obstacles[0].x = GAME_CONFIG.width + 100;
obstacles[0].width = 64;
obstacles[0].image = images.obstacle;
obstacles[0].y =
  GAME_CONFIG.groundY - obstacles[0].height;

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

  // ゴール演出中はプレイヤー操作を受け付けない
  if (goalPhase > 0) {
    return;
  }

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

if (goalPhase === 0) {
  score += deltaTime * 0.01;
}
  gameElapsedTime += deltaTime / 1000;

  scoreElement.textContent = Math.floor(score);

if (gameElapsedTime >= 15 && !goalStarted) {
  console.log("15秒経過！");
  goalStarted = true;
  goalWaiting = true;
  goalWaitTimer = 0;
}

// --------------------------------------------
// ゲーム速度
// --------------------------------------------

// 時間経過で徐々に速くする
// ただし、最高速度は maxObstacleSpeed まで
gameSpeed = Math.min(
  gameSpeed + deltaTime * GAME_CONFIG.speedIncrease,
  GAME_CONFIG.maxObstacleSpeed
);


// --------------------------------------------
// キャラクターの動き
// --------------------------------------------

const groundPlayerY =
  GAME_CONFIG.groundY - player.height;

// ============================================================
// ゴール演出
// ============================================================

// 通常プレイ中
if (goalPhase === 0) {

  player.velocityY += GAME_CONFIG.gravity;
  player.y += player.velocityY;

  if (player.y >= groundPlayerY) {
    player.y = groundPlayerY;
    player.velocityY = 0;
    player.isJumping = false;
  }
}


// ------------------------------------------------------------
// 1. 犬停止（1秒）
// ------------------------------------------------------------
else if (goalPhase === 1) {

  player.y = groundPlayerY;
  player.velocityY = 0;
  player.isJumping = false;

  goalPhaseTimer += deltaTime;

  if (goalPhaseTimer >= goalStartWaitDuration) {

    // その場でジャンプ
    player.velocityY = GAME_CONFIG.jumpPower;
    player.isJumping = true;

    goalPhase = 2;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 2. ジャンプ
// ------------------------------------------------------------
else if (goalPhase === 2) {

  player.velocityY += GAME_CONFIG.gravity;
  player.y += player.velocityY;

  if (player.y >= groundPlayerY) {

    player.y = groundPlayerY;
    player.velocityY = 0;
    player.isJumping = false;

    // 着地後の停止へ
    goalPhase = 3;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 3. 着地後、犬停止（1秒）
// ------------------------------------------------------------
else if (goalPhase === 3) {

  player.y = groundPlayerY;
  player.velocityY = 0;
  player.isJumping = false;

  goalPhaseTimer += deltaTime;

  if (goalPhaseTimer >= goalLandingWaitDuration) {

    // 家の前まで歩く
    goalPhase = 4;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 4. 家の前まで歩く
// ------------------------------------------------------------
else if (goalPhase === 4) {

  player.y = groundPlayerY;
  player.velocityY = 0;
  player.isJumping = false;

  player.x += goalPlayerSpeed * (deltaTime / 16.67);

  if (player.x >= goalPlayerTargetX) {

    player.x = goalPlayerTargetX;

    // 家の前で0.5秒停止
    goalPhase = 5;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 5. 家の前で犬停止（0.5秒）
// ------------------------------------------------------------
else if (goalPhase === 5) {

  player.y = groundPlayerY;
  player.velocityY = 0;
  player.isJumping = false;

  goalPhaseTimer += deltaTime;

  if (goalPhaseTimer >= goalHouseWaitDuration) {

    // ここで扉を開く
    doorOpen = true;

    // 扉が開いた状態で、扉の前まで歩く
    goalPhase = 6;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 6. 扉が開いた状態で、扉の前までゆっくり歩く
// ------------------------------------------------------------
else if (goalPhase === 6) {

  player.y = groundPlayerY;
  player.velocityY = 0;
  player.isJumping = false;

  player.x += goalPlayerSpeed * (deltaTime / 16.67);

  if (player.x >= goalFinalTargetX) {

    player.x = goalFinalTargetX;

    // 犬が扉に触れた瞬間、暗転開始
    goalPhase = 7;
    goalPhaseTimer = 0;
  }
}


// ------------------------------------------------------------
// 7. 暗転
// ------------------------------------------------------------
else if (goalPhase === 7) {

  goalPhaseTimer += deltaTime;

  if (goalPhaseTimer >= goalBlackoutDuration) {

    // 今はここで演出終了
    // 後で「犬が家に入る」演出をここに追加する
    goalPhase = 8;
    goalPhaseTimer = 0;
  }
}

  
// --------------------------------------------
// キャラクターの走るアニメーション
// --------------------------------------------

// 通常プレイ中、またはゴール演出で歩いているときだけ
// 走る画像を切り替える
if (
  !player.isJumping &&
  (goalPhase === 0 || goalPhase === 3)
) {
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

for (let i = obstacles.length - 1; i >= 0; i--) {
  const obstacle = obstacles[i];

  obstacle.x -= gameSpeed * (deltaTime / 16.67);

  // 画面外に出た障害物を削除
  if (obstacle.x + obstacle.width < 0) {
    obstacles.splice(i, 1);
  }
}

if (goalWaiting && obstacles.length === 0) {

  // 最後の花が消えた瞬間からタイマー開始
  goalWaitTimer += deltaTime;

  // 3秒経過したら家を登場させる
  if (goalWaitTimer >= goalWaitDuration) {
    goalWaiting = false;
    goalWaitTimer = 0;
    console.log("3秒経過！家が登場します");
  }
}

// --------------------------------------------
// ゴールの家を右から左へ移動
// --------------------------------------------

if (goalStarted && !goalWaiting) {

  const houseStopX = 550;

  // 家がまだ停止位置に着いていない間は移動
  if (houseX > houseStopX) {
    houseX -= gameSpeed * (deltaTime / 16.67);
  }

  // 停止位置まで来たら止める
  if (houseX <= houseStopX) {
    houseX = houseStopX;

    // 家が所定位置に着いたらゴール演出開始
    if (goalPhase === 0) {
      goalPhase = 1;

      // 犬が向かう扉の位置
      goalPlayerTargetX = 450;

      // 1秒待つためのタイマーを開始
      goalPhaseTimer = 0;
    }
  }
}
  
// --------------------------------------------
// 新しい障害物を追加
// --------------------------------------------

// 一番右にある障害物を探す
let rightmostObstacle = null;

for (const obstacle of obstacles) {
  if (
    rightmostObstacle === null ||
    obstacle.x > rightmostObstacle.x
  ) {
    rightmostObstacle = obstacle;
  }
}

// 15秒までは新しい障害物を追加する
if (gameElapsedTime < 15 && !goalStarted) {

  // 障害物がなくなったら、新しいものを作る
  if (rightmostObstacle === null) {
    rightmostObstacle = {
      x: GAME_CONFIG.width,
      y: GAME_CONFIG.groundY - GAME_CONFIG.obstacleHeight,
      width: 64,
      height: GAME_CONFIG.obstacleHeight,
      image: images.obstacle
    };

    obstacles.push(rightmostObstacle);
  }

  // 一番右の障害物が十分近づいたら、次を追加
  if (
    rightmostObstacle.x <
    GAME_CONFIG.width + 250
  ) {
    const obstacleGap = getRandomObstacleGap();

    const useSecondObstacle = Math.random() < 0.5;

    const newObstacle = {
      x: rightmostObstacle.x +
         rightmostObstacle.width +
         obstacleGap,

      y: GAME_CONFIG.groundY - GAME_CONFIG.obstacleHeight,

      width: useSecondObstacle ? 100 : 64,

      height: GAME_CONFIG.obstacleHeight,

      image: useSecondObstacle
        ? images.obstacle2
        : images.obstacle
    };

    obstacles.push(newObstacle);
  }
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

for (const obstacle of obstacles) {
  if (isColliding(player, obstacle)) {
    endGame();
    return;
  }
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

for (const obstacle of obstacles) {
  ctx.drawImage(
    obstacle.image,
    obstacle.x,
    obstacle.y,
    obstacle.width,
    obstacle.height
  );
}

if (goalStarted && !goalWaiting) {
  const houseWidth = 280;
  const houseHeight = 280;

  const houseY = GAME_CONFIG.groundY - houseHeight + 15;

// doorOpen が true になったら、以降ずっと開いた扉
const houseImage =
  doorOpen
    ? images.houseOpen
    : images.houseClosed;

  ctx.drawImage(
    houseImage,
    houseX,
    houseY,
    houseWidth,
    houseHeight
  );
}
  
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

// --------------------------------------------
// ゴールの暗転
// --------------------------------------------

if (goalPhase === 8 || goalPhase === 9) {
  ctx.fillStyle = "black";
  ctx.fillRect(
    0,
    0,
    GAME_CONFIG.width,
    GAME_CONFIG.height
  );
}
  
// 開発用バージョン表示
ctx.fillStyle = "black";
ctx.font = "14px sans-serif";
ctx.fillText(GAME_VERSION, 10, 20);
  
}


// ============================================================
// 17. 背景描画
// ============================================================

function drawBackground() {
  // まず画面全体を白にする
  ctx.fillStyle = "white";
  ctx.fillRect(
    0,
    0,
    GAME_CONFIG.width,
    GAME_CONFIG.height
  );

// 地面の線を直接描く
ctx.strokeStyle = "#999999";
ctx.lineWidth = 2;

ctx.beginPath();
ctx.moveTo(0, 342);
ctx.lineTo(GAME_CONFIG.width, 342);
ctx.stroke();
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
