const socket = io();

class Player {
    constructor(name, x, y, color = 'lime') {
        this.name = name;
        this.x = x;
        this.y = y;
        this.size = 30;
        this.color = color;
        this.speed = 3;
    }

    move(keys) {
        if (keys['w']) this.y -= this.speed;
        if (keys['s']) this.y += this.speed;
        if (keys['a']) this.x -= this.speed;
        if (keys['d']) this.x += this.speed;

        // Giới hạn trong map
        this.x = Math.max(0, Math.min(mapSize, this.x));
        this.y = Math.max(0, Math.min(mapSize, this.y));
    }

    draw(ctx, cam) {
        ctx.beginPath();
        ctx.arc(this.x - cam.x, this.y - cam.y, this.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x - cam.x, this.y - cam.y - 20);
    }
}

class Bullet {
    constructor(x, y, angle, ownerId) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.speed = 6;
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
        this.ownerId = ownerId;
        this.alive = true;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        // Nếu ra khỏi map thì đánh dấu đã chết
        if (this.x < 0 || this.x > mapSize || this.y < 0 || this.y > mapSize) {
            this.alive = false;
        }
    }

    kill() {
        this.alive = false;
    }

    draw(ctx, cam) {
        if (!this.alive) return;
        ctx.beginPath();
        ctx.arc(this.x - cam.x, this.y - cam.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 2 + 1;
        this.speed = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI * 2;
        this.life = 50; // frame tồn tại
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
    }

    draw(ctx, cam) {
        ctx.beginPath();
        ctx.arc(this.x - cam.x, this.y - cam.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    }
}

// ========== Init ==========
const playerName = localStorage.getItem('playerName') || 'Player';
const player = new Player(playerName, 100, 100);
const players = {};
const bullets = [];
const keys = {};
const mapSize = 2000;
const cam = { x: 0, y: 0 };
let isAlive = true;
let isDying = false;
let deathAlpha = 1;
let isDead = false;
const particles = [];

// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Server Sync
socket.emit('join-game', player.name);
socket.on('init-players', (data) => {
    for (let id in data) {
        if (id !== socket.id) {
            players[id] = new Player(data[id].name, data[id].x, data[id].y, 'orange');
        }
    }
});
socket.on('player-joined', (data) => {
    players[data.id] = new Player(data.name, data.x, data.y, 'orange');
});
socket.on('player-left', (id) => delete players[id]);

socket.on('update-players', (data) => {
    for (let id in data) {
        if (id !== socket.id) {
            if (!players[id]) players[id] = new Player(data[id].name, 0, 0, 'orange');
            players[id].x = data[id].x;
            players[id].y = data[id].y;
        }
    }
});

socket.on('player-killed', (data) => {
    if (players[data.id]) {
        spawnBlood(data.x, data.y);
        delete players[data.id];
    }
});

socket.on('bullet-fired', (bulletData) => {
    bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.angle, bulletData.ownerId));
});

socket.on('leaderboard-update', (list) => {
    const ul = document.getElementById('leaderboard-list');
    ul.innerHTML = '';
    list.forEach((p, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${p.name} - ${p.score}`;

        if (i === 0) li.classList.add('gold');
        else if (i === 1) li.classList.add('silver');
        else if (i === 2) li.classList.add('copper');

        ul.appendChild(li);
    });
});

// ========== Input ==========
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('click', e => {
    if (!isAlive) return;
    const angle = Math.atan2(e.clientY - canvas.height / 2, e.clientX - canvas.width / 2);
    socket.emit('shoot', { x: player.x, y: player.y, angle });
    bullets.push(new Bullet(player.x, player.y, angle, socket.id));
});

function checkCollision() {
    if (!isAlive) return;

    for (let b of bullets) {
        if (!b.alive) continue;

        const dx = b.x - player.x;
        const dy = b.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < b.radius + player.size / 2 && b.ownerId !== socket.id) {
            isAlive = false;
            isDying = true;
            b.kill();
            spawnBlood(player.x, player.y);
            socket.emit('player-dead', { x: player.x, y: player.y, killerId: b.ownerId });
            break;
        }
    }
}

function spawnBlood(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y));
    }
}

function showGameOver() {
    document.getElementById('game-over').style.display = 'flex';
}

function goMenu() {
    window.location.href = '/menu';
}

function replayGame() {
    location.reload();
}

// ========== Game Loop ==========
function update() {
    if (!isAlive) return;

    player.move(keys);
    cam.x = player.x - canvas.width / 2;
    cam.y = player.y - canvas.height / 2;

    socket.emit('move', { x: player.x, y: player.y });

    bullets.forEach(b => b.update());
    // Xoá đạn đã chết
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].alive) bullets.splice(i, 1);
    }
}

function drawMap() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Map grid
    ctx.strokeStyle = '#444';
    for (let x = 0; x <= mapSize; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x - cam.x, 0 - cam.y);
        ctx.lineTo(x - cam.x, mapSize - cam.y);
        ctx.stroke();
    }
    for (let y = 0; y <= mapSize; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0 - cam.x, y - cam.y);
        ctx.lineTo(mapSize - cam.x, y - cam.y);
        ctx.stroke();
    }

    // Red border
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.strokeRect(-cam.x, -cam.y, mapSize, mapSize);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
document.getElementById('game-over').style.display = 'none';

function loop() {
    update();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();

    if (isAlive) {
        player.draw(ctx, cam);
        checkCollision();
    } else if (isDying) {
        ctx.globalAlpha = deathAlpha;
        player.draw(ctx, cam);
        ctx.globalAlpha = 1;
        deathAlpha -= 0.02;
        if (deathAlpha <= 0) {
            deathAlpha = 0;
            isDying = false;
            isDead = true;
            showGameOver();
        }
    }

    for (let id in players) {
        players[id].draw(ctx, cam);
    }

    bullets.forEach(b => b.draw(ctx, cam));

    for (let p of particles) {
        p.update();
        p.draw(ctx, cam);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(loop);
}

loop();