const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const FIELD_WIDTH = 1800; // 1.5x Bigger Ground
const FIELD_HEIGHT = 600;
const GROUND_Y = 500;
const PLAYER_RADIUS = 40;
const BALL_RADIUS = 25;
const GOAL_WIDTH = 100;
const GOAL_HEIGHT = 180;
const GOAL_DEPTH = 0;  // At the very edge

// Assets
const bgImage = new Image();
bgImage.src = './static/Gemini_Generated_Image_123rod123rod123r.png';

const p1Image = new Image();
p1Image.src = './static/WhatsApp Image 2025-12-17 at 13.26.23_582abfb4.png'; // P1 Character

const p2Image = new Image();
p2Image.src = './static/WhatsApp Image 2025-12-17 at 13.26.22_3457fcf7.png'; // P2 Character

// Physics
const GRAVITY = 0.7;
const MOVE_SPEED = 9;
const JUMP_FORCE = -16;
const BALL_BOUNCE = 0.6;
const BALL_FRICTION = 0.98;

// State
let roomId = null;
let gameActive = false;
let scores = { 1: 0, 2: 0 };
let shakeIntensity = 0;

const inputs = {
    1: { dir: 0 },
    2: { dir: 0 }
};

const players = {
    1: {
        x: 400, y: GROUND_Y,
        vx: 0, vy: 0,
        color: '#e74c3c',
        skin: '#f1c27d',
        facing: 1,
        grounded: true,
        lastJump: 0,
        shoeOffset: 0
    },
    2: {
        x: FIELD_WIDTH - 400, y: GROUND_Y,
        vx: 0, vy: 0,
        color: '#3498db',
        skin: '#8d5524',
        facing: -1,
        grounded: true,
        lastJump: 0,
        shoeOffset: 0
    }
};

const ball = {
    x: FIELD_WIDTH / 2,
    y: 200,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    rotation: 0
};

// --- Setup ---

function resize() {
    const scale = Math.min(window.innerWidth / FIELD_WIDTH, window.innerHeight / FIELD_HEIGHT);
    canvas.width = FIELD_WIDTH * scale;
    canvas.height = FIELD_HEIGHT * scale;
    ctx.scale(scale, scale);
}
window.addEventListener('resize', resize);
resize();

// Socket & QR
socket.emit('create-room', generateRoomId());

function generateRoomId() {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('room-id-display').innerText = `Room: ${roomId}`;
    return roomId;
}

const host = window.location.origin;
new QRCode(document.getElementById("qrcode-p1"), { text: `${host}/controller.html?room=${roomId}&player=1`, width: 150, height: 150 });
new QRCode(document.getElementById("qrcode-p2"), { text: `${host}/controller.html?room=${roomId}&player=2`, width: 150, height: 150 });

socket.on('player-joined', ({ player }) => {
    const box = document.getElementById(`p${player}-box`);
    box.classList.add('joined');
    box.querySelector('.status').innerText = 'READY!';
    if (document.getElementById('p1-box').classList.contains('joined') &&
        document.getElementById('p2-box').classList.contains('joined')) {
        document.getElementById('start-btn').disabled = false;
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('waiting-screen').style.display = 'none';
    gameActive = true;
    resetPositions();
    loop();
});

// --- Inputs ---

socket.on('player-move', ({ player, direction, active }) => {
    if (active) {
        inputs[player].dir = direction;
        if (direction !== 0) players[player].facing = direction;
    } else {
        inputs[player].dir = 0;
    }
});

socket.on('player-action', ({ player, type }) => {
    if (!gameActive) return;

    if (type === 'jump') {
        const p = players[player];
        if (p.grounded) {
            p.vy = JUMP_FORCE;
            p.grounded = false;
        }
    } else if (type === 'kick') {
        kickBall(player, 'kick');
    } else if (type === 'air-hit') {
        kickBall(player, 'air-hit');
    }
});

function kickBall(pid, type) {
    const p = players[pid];
    const dx = ball.x - p.x;
    const dy = ball.y - (p.y - 30);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const range = 130;

    if (dist < range) {
        const goalDir = (pid == 1) ? 1 : -1;
        let powerX = 0;
        let powerY = 0;

        if (type === 'kick') {
            if (p.grounded || p.y > GROUND_Y - 10) {
                powerX = 13 * goalDir; // Reduced
                powerY = 0;
            } else {
                return;
            }
        } else if (type === 'air-hit') {
            // Chip/Lob
            powerX = 14 * goalDir; // Reduced
            powerY = -13;
        }

        ball.vx = powerX;
        ball.vy = powerY;

        triggerShake(5);
        socket.emit('feedback-event', { roomId, target: pid, type: 'ball-hit', data: { speed: 10 } });

        p.shoeOffset = 20;
        setTimeout(() => { p.shoeOffset = 0; }, 150);
    }
}

// --- Update ---

function update() {
    if (!gameActive) return;

    // Players
    for (let id of [1, 2]) {
        const p = players[id];

        // Move
        if (inputs[id].dir !== 0) {
            p.vx += inputs[id].dir * 1.5;
            p.vx = Math.max(Math.min(p.vx, MOVE_SPEED), -MOVE_SPEED);
            p.facing = inputs[id].dir;
        } else {
            p.vx *= 0.8;
        }

        p.x += p.vx;
        p.vy += GRAVITY;
        p.y += p.vy;

        // Ground collision
        if (p.y > GROUND_Y) {
            p.y = GROUND_Y;
            p.vy = 0;
            p.grounded = true;
        }

        // Constraints
        if (p.x < 50) p.x = 50;
        if (p.x > FIELD_WIDTH - 50) p.x = FIELD_WIDTH - 50;
    }

    // Ball Physics
    ball.vy += GRAVITY * 0.8;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.rotation += ball.vx * 0.1;

    // Ball Floor
    if (ball.y > GROUND_Y - BALL_RADIUS) {
        ball.y = GROUND_Y - BALL_RADIUS;
        ball.vx *= BALL_FRICTION;
        ball.vy *= -BALL_BOUNCE;
        if (Math.abs(ball.vy) < 1) ball.vy = 0;
    }

    // Ceiling
    if (ball.y < BALL_RADIUS) {
        ball.y = BALL_RADIUS;
        ball.vy *= -1;
    }

    // --- GOAL PHYSICS (OBSTACLES) ---
    const goalTop = GROUND_Y - GOAL_HEIGHT;

    // LEFT GOAL
    if (ball.x < GOAL_WIDTH && ball.y > goalTop + BALL_RADIUS) {
        score(2); // P2 Scores
        return;
    }

    // Left Obstacle: Crossbar & Top Netting
    if (ball.x < GOAL_WIDTH + BALL_RADIUS) {
        if (Math.abs(ball.y - goalTop) < BALL_RADIUS) {
            ball.vy *= -0.8;
            if (ball.y < goalTop) ball.y = goalTop - BALL_RADIUS;
            else ball.y = goalTop + BALL_RADIUS;
        }
    }
    // Left Post Tip
    if (Math.abs(ball.x - GOAL_WIDTH) < BALL_RADIUS && ball.y < goalTop) {
        ball.vx *= -0.8;
        ball.x = GOAL_WIDTH + BALL_RADIUS;
    }


    // RIGHT GOAL
    const rightPostX = FIELD_WIDTH - GOAL_WIDTH;
    if (ball.x > rightPostX && ball.y > goalTop + BALL_RADIUS) {
        score(1); // P1 Scores
        return;
    }

    // Right Crossbar
    if (ball.x > rightPostX - BALL_RADIUS) {
        if (Math.abs(ball.y - goalTop) < BALL_RADIUS) {
            ball.vy *= -0.8;
            if (ball.y < goalTop) ball.y = goalTop - BALL_RADIUS;
            else ball.y = goalTop + BALL_RADIUS;
        }
    }
    // Right Post Tip
    if (Math.abs(ball.x - rightPostX) < BALL_RADIUS && ball.y < goalTop) {
        ball.vx *= -0.8;
        ball.x = rightPostX - BALL_RADIUS;
    }


    // Player <> Ball Collision
    for (let id of [1, 2]) {
        const p = players[id];
        checkCircleCollision(p, p.x, p.y - PLAYER_RADIUS, PLAYER_RADIUS); // Head
        checkCircleCollision(p, p.x, p.y - 25, 30); // Body
    }
}

function checkCircleCollision(p, cx, cy, radius) {
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const distSq = dx * dx + dy * dy;
    const minDist = radius + ball.radius;

    if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const angle = Math.atan2(dy, dx);

        const overlap = minDist - dist;
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;

        ball.vx += p.vx * 0.5;

        const force = 5;
        ball.vx += Math.cos(angle) * force;
        ball.vy += Math.sin(angle) * force;

        ball.vx *= 0.9;
        ball.vy *= 0.9;
    }
}

function score(winner) {
    gameActive = false;
    scores[winner]++;
    document.getElementById('p1-score').innerText = scores[1];
    document.getElementById('p2-score').innerText = scores[2];

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 100px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'black';
    ctx.fillText(`GOAL P${winner}!`, FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
    ctx.shadowBlur = 0;

    triggerShake(20);
    socket.emit('feedback-event', { roomId, target: 'all', type: 'goal', data: { winner } });

    // Emit Game Over / Win event for Music
    socket.emit('game-over', { roomId, winner });

    setTimeout(() => {
        resetPositions();
        gameActive = true;
    }, 2000);
}

function resetPositions() {
    ball.x = FIELD_WIDTH / 2;
    ball.y = 200;
    ball.vx = 0; ball.vy = 0;

    players[1].x = FIELD_WIDTH / 2 - 200; players[1].y = GROUND_Y; players[1].vx = 0; players[1].vy = 0;
    players[2].x = FIELD_WIDTH / 2 + 200; players[2].y = GROUND_Y; players[2].vx = 0; players[2].vy = 0;
}

function triggerShake(amt) {
    shakeIntensity = amt;
}

// --- Draw ---

function draw() {
    let sx = 0, sy = 0;
    if (shakeIntensity > 0) {
        sx = (Math.random() - 0.5) * shakeIntensity;
        sy = (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9;
        if (shakeIntensity < 0.5) shakeIntensity = 0;
    }

    ctx.save();
    ctx.translate(sx, sy);

    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 0. Background Image
    try {
        if (bgImage.complete) {
            ctx.drawImage(bgImage, 0, 0, FIELD_WIDTH, GROUND_Y);

            // Dim Overlay
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; // 30% Darker
            ctx.fillRect(0, 0, FIELD_WIDTH, GROUND_Y);
        } else {
            ctx.fillStyle = '#3498db';
            ctx.fillRect(0, 0, FIELD_WIDTH, GROUND_Y);
        }
    } catch (e) { }

    // 1. Field
    drawField();

    // 2. Goals
    const goalY = GROUND_Y - GOAL_HEIGHT;
    drawGoal(GOAL_DEPTH, goalY, true); // Left Goal
    drawGoal(FIELD_WIDTH - GOAL_DEPTH - GOAL_WIDTH, goalY, false); // Right Goal

    // 3. Players (Custom Images)
    for (let id of [1, 2]) {
        drawPlayer(players[id]);
    }

    // 4. Ball
    drawBall(ball);

    ctx.restore();
}

function drawField() {
    // Grass
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, GROUND_Y, FIELD_WIDTH, FIELD_HEIGHT - GROUND_Y);

    // White Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, GROUND_Y);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(FIELD_WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(FIELD_WIDTH / 2, GROUND_Y + 40, 70, 20, 0, 0, Math.PI * 2);
    ctx.stroke();

    // No box rects
}

function drawGoal(x, y, isLeft) {
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();

    ctx.moveTo(x, y);
    ctx.lineTo(x + GOAL_WIDTH, y);
    ctx.lineTo(x + GOAL_WIDTH, GROUND_Y);

    if (!isLeft) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, GROUND_Y);
    } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x, GROUND_Y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = x; i <= x + GOAL_WIDTH; i += 15) {
        ctx.moveTo(i, y);
        ctx.lineTo(i - (isLeft ? -20 : 20), GROUND_Y);
    }
    ctx.stroke();
}

function drawPlayer(p) {
    const isP1 = (p === players[1]);
    const img = isP1 ? p1Image : p2Image;

    // Size: 2x Radius roughly
    const w = 120; // Slightly larger for visual pop
    const h = 120;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Flip check: P2 faces left (-1)
    if (p.facing === -1) {
        ctx.scale(-1, 1);
    }

    if (img.complete && img.width > 0) {
        // Draw centered at feet (0,0) -> image bottom is 0. Top is -h.
        ctx.drawImage(img, -w / 2, -h + 10, w, h); // +10 sink slightly into grass
    } else {
        // Fallback
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, -40, 40, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawBall(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#000';
    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 15, Math.sin(angle) * 15, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
