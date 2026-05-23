const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Загрузка ресурсов
const playerImg = new Image(); playerImg.src = 'player.png';
const crystalImg = new Image(); crystalImg.src = 'crystal.png';
const platformImg = new Image(); platformImg.src = 'platform.png';
const grassImg = new Image(); grassImg.src = 'grass.png';
const bgImg = new Image(); bgImg.src = 'background.png';
const batImg = new Image(); batImg.src = 'bat.png';

const treeImages = [];
for (let i = 1; i <= 4; i++) {
    let img = new Image();
    img.src = `tree${i}.png`;
    treeImages.push(img);
}

// Состояние игры
let player = { x: 50, y: 100, width: 30, height: 30, dx: 0, dy: 0, speed: 5, grounded: false, canDoubleJump: false };
let score = 0;
let killedEnemies = 0; // Счетчик врагов
let highScore = localStorage.getItem("highScore") || 0; // Получаем рекорд
let gameRunning = true;
let platforms = [{ x: 0, y: 350, width: 2005, height: 50, isFloor: true }];
let crystals = [];
let trees = [];
let enemies = [];

for (let i = 0; i < 12; i++) {
    trees.push({ imgIndex: Math.floor(Math.random() * 4), x: Math.random() * canvas.width * 2, speed: 0.1 + Math.random() * 0.2, y: 180 });
}

let keys = {};
document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

function generatePlatform() {
    let lastX = platforms[platforms.length - 1].x + platforms[platforms.length - 1].width;
    let newX = lastX + 250 + Math.random() * 100;
    let newY = 150 + Math.random() * 150;
    platforms.push({ x: newX, y: newY, width: 150, height: 20, isFloor: false });
    crystals.push({ x: newX + 60, y: newY - 40, active: true });
    
    if (Math.random() < 0.3) {
        enemies.push({ x: newX + 50, y: newY - 30, baseY: newY - 30, active: true });
    }
}

function update() {
    if (!gameRunning) {
        // Проверка и сохранение рекорда
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("highScore", highScore);
        }

        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2, 150);
        ctx.font = "20px Arial";
        ctx.fillText("Кристаллов: " + score + " | Врагов: " + killedEnemies, canvas.width / 2, 200);
        ctx.fillText("Лучший рекорд: " + highScore, canvas.width / 2, 230);
        ctx.fillText("Нажми ENTER для перезапуска", canvas.width / 2, 280);
        
        if (keys["Enter"]) location.reload();
        requestAnimationFrame(update);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Физика
    player.dx = (keys["ArrowRight"] ? player.speed : 0) - (keys["ArrowLeft"] ? player.speed : 0);
    if (keys["Space"]) {
        if (player.grounded) {
            player.dy = -12;
            player.grounded = false;
            player.canDoubleJump = true;
            keys["Space"] = false;
        } else if (player.canDoubleJump) {
            player.dy = -10;
            player.canDoubleJump = false;
            keys["Space"] = false;
        }
    }
    player.dy += 0.8;
    player.x += player.dx;
    player.y += player.dy;

    if (player.y > canvas.height) gameRunning = false;

    // 2. Коллизии
    player.grounded = false;
    platforms.forEach(plat => {
        if (player.x + player.width > plat.x + 5 && player.x < plat.x + plat.width - 5 &&
            player.y + player.height > plat.y && player.y + player.height < plat.y + 40 && player.dy > 0) {
            player.y = plat.y - player.height;
            player.dy = 0;
            player.grounded = true;
            player.canDoubleJump = false;
        }
    });

    // 3. Враги
    enemies.forEach(e => {
        if (!e.active) return;
        e.y = e.baseY + Math.sin(Date.now() / 300) * 20;
        if (player.x < e.x + 30 && player.x + player.width > e.x &&
            player.y < e.y + 30 && player.y + player.height > e.y) {
            if (player.dy > 0) { 
                e.active = false; 
                player.dy = -8; 
                killedEnemies++; // Увеличиваем счетчик врагов
            } else { gameRunning = false; }
        }
    });
    enemies = enemies.filter(e => e.active);

    // 4. Кристаллы
    crystals.forEach(c => {
        if (c.active) {
            let dx = (player.x + player.width/2) - (c.x + 10);
            let dy = (player.y + player.height/2) - (c.y + 10);
            if (Math.sqrt(dx*dx + dy*dy) < 35) {
                c.active = false;
                score += 1;
                if (score % 5 === 0 && player.speed < 12) player.speed += 0.5;
            }
        }
    });

    // 5. Мир
    if (player.x > 300) {
        let diff = player.x - 300;
        player.x = 300;
        platforms.forEach(p => p.x = Math.round(p.x - diff));
        crystals.forEach(c => c.x = Math.round(c.x - diff));
        enemies.forEach(e => e.x -= diff);
        trees.forEach(t => { t.x -= diff * t.speed; if (t.x < -200) t.x = canvas.width + Math.random() * 200; });
    }

    if (platforms[0].x <= -1000) platforms[0].x = 0;
    platforms = platforms.filter((p, index) => index === 0 || p.x > -200);
    crystals = crystals.filter(c => c.x > -200);
    enemies = enemies.filter(e => e.x > -100);
    if (platforms.length < 6) generatePlatform();

    // 6. Отрисовка
    if (bgImg.complete) ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    trees.forEach(t => { if (treeImages[t.imgIndex].complete) ctx.drawImage(treeImages[t.imgIndex], t.x, t.y, 120, 200); });
    
    let pattern = ctx.createPattern(grassImg, 'repeat-x');
    ctx.fillStyle = pattern || "#228B22";
    ctx.fillRect(platforms[0].x, platforms[0].y, platforms[0].width, platforms[0].height);
    platforms.forEach((p, index) => { if (index > 0) ctx.drawImage(platformImg, p.x, p.y, p.width, p.height); });
    crystals.forEach(c => { if (c.active) ctx.drawImage(crystalImg, c.x, c.y, 20, 20); });
    enemies.forEach(e => { 
        if (batImg.complete && batImg.naturalWidth > 0) ctx.drawImage(batImg, e.x, e.y, 35, 35); 
        else { ctx.fillStyle = "red"; ctx.fillRect(e.x, e.y, 30, 30); }
    });
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    
    ctx.textAlign = "start";
    ctx.fillStyle = "black"; ctx.font = "20px Arial";
    ctx.fillText("Кристаллы: " + score, 20, 30);
    ctx.fillText("Враги: " + killedEnemies, 20, 60);
    ctx.fillText("Рекорд: " + highScore, 20, 90);
    
    requestAnimationFrame(update);
}
update();