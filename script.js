const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const overlay = document.getElementById("overlay");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

canvas.width = 800; canvas.height = 400;

// CONFIGURACIÓN
const MODO_PRUEBA = true; // CAMBIA A FALSE PARA JUGAR EN SERIO
const worldWidth = 12000; 
let gameStarted = false, gameActive = true, isPaused = false;
let cameraX = 0, lives = 3, invincibilityFrames = 0;

const car = {
    x: 150, y: 300, w: 75, h: 35,
    baseSpeed: 5, currentSpeed: 5,
    vy: 0, gravity: 0.8, jumpPower: -17,
    grounded: true, color: "#800000"
};

const clouds = Array.from({length: 25}, () => ({
    x: Math.random() * worldWidth, y: Math.random() * 120, s: 0.6 + Math.random()
}));

const obstacleTypes = [
    { emoji: "🚧", w: 40, h: 40, tipo: "alto" },
    { emoji: "🕳️", w: 60, h: 25, tipo: "suelo" }, 
    { emoji: "📦", w: 45, h: 45, tipo: "alto" },
    { emoji: "🪵", w: 55, h: 35, tipo: "alto" }
];

const obstacles = [];
for (let i = 0; i < 55; i++) {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    let yPos = (type.tipo === "suelo") ? 338 : 310; // Posición exacta en carretera
    obstacles.push({ x: 1200 + (i * 190) + Math.random() * 100, y: yPos, ...type, hit: false });
}

const tunnelStart = 8200;
const tunnelEnd = 9800;
const finishArea = 11200;

const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if(e.code === "KeyP") togglePause();
});
window.addEventListener("keyup", (e) => keys[e.code] = false);

startBtn.onclick = () => { overlay.style.display = "none"; gameStarted = true; update(); };
pauseBtn.onclick = () => togglePause();

function togglePause() {
    if(!gameStarted || !gameActive) return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Reanudar" : "Pausar";
    if(!isPaused) update();
}

function update() {
    if (!gameActive || !gameStarted || isPaused) return;

    if (keys["ArrowRight"]) car.currentSpeed = car.baseSpeed + 5;
    else if (keys["ArrowLeft"]) car.currentSpeed = car.baseSpeed - 3;
    else car.currentSpeed = car.baseSpeed;
    
    car.x += car.currentSpeed;
    if ((keys["ArrowUp"] || keys["Space"]) && car.grounded) { car.vy = car.jumpPower; car.grounded = false; }
    car.vy += car.gravity; car.y += car.vy;
    if (car.y >= 300) { car.y = 300; car.vy = 0; car.grounded = true; }

    cameraX = car.x - 150;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > worldWidth - canvas.width) cameraX = worldWidth - canvas.width;

    if (invincibilityFrames > 0) invincibilityFrames--;
    obstacles.forEach(obs => {
        if (!obs.hit && invincibilityFrames === 0) {
            // Hitbox mejorada para baches (más profunda)
            let hitboxY = (obs.tipo === "suelo") ? obs.y - 10 : obs.y;
            if (car.x < obs.x + obs.w - 15 && car.x + car.w > obs.x + 15 && 
                car.y + car.h > hitboxY && car.y < obs.y + obs.h) {
                if (!MODO_PRUEBA) lives--;
                obs.hit = true; invincibilityFrames = 60;
                if (lives <= 0) endGame("💔 ¡Vuelve a intentarlo! Altea te espera.");
            }
        }
    });

    let prog = Math.min(Math.floor((car.x / (worldWidth - 500)) * 100), 100);
    statusText.innerHTML = `Vidas: ${MODO_PRUEBA ? "♾️" : "❤️".repeat(lives)} | ${prog}% del viaje`;
    
    if (car.x >= worldWidth - 450) endGame("❤️ ¡LLEGASTE A ALTEA! Vuestra historia solo acaba de empezar.");

    draw();
    requestAnimationFrame(update);
}

function draw() {
    let prog = car.x / worldWidth;
    
    // FONDO: De Gris Valencia (70, 80, 90) a Azul Altea (135, 206, 235)
    let r = 70 + (135 - 70) * prog;
    let g = 80 + (206 - 80) * prog;
    let b = 90 + (235 - 90) * prog;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Nubes que aclaran
    let cloudBright = 100 + (155 * prog);
    ctx.fillStyle = `rgba(${cloudBright},${cloudBright},${cloudBright},0.8)`;
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x + (cameraX * 0.3), c.y, 25 * c.s, 0, Math.PI*2);
        ctx.arc(c.x + 20 + (cameraX * 0.3), c.y - 10, 25 * c.s, 0, Math.PI*2);
        ctx.fill();
    });

    // Valencia
    ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.font = "bold 90px Arial";
    ctx.fillText("VALENCIA", 100, 320); ctx.font = "120px Arial"; ctx.fillText("🥘", 150, 180);

    // Mar Altea
    if (car.x > tunnelEnd - 800) {
        ctx.fillStyle = "#1e88e5"; ctx.fillRect(tunnelEnd, 240, worldWidth, 160);
        // Detalles de olas
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
        for(let j=0; j<5; j++) {
            for(let i=tunnelEnd; i<worldWidth; i+=200) {
                ctx.beginPath(); ctx.moveTo(i + (j*30), 260 + (j*20)); 
                ctx.lineTo(i + 40 + (j*30), 260 + (j*20)); ctx.stroke();
            }
        }
        ctx.fillStyle = "#4CAF50"; ctx.fillRect(tunnelEnd, 335, worldWidth - tunnelEnd, 10); // Césped
    }

    // MONTAÑA MASCARAT
    ctx.fillStyle = "#5d5d5d";
    ctx.beginPath();
    ctx.moveTo(tunnelStart - 400, 340);
    ctx.lineTo(tunnelStart, 50);
    ctx.lineTo(tunnelEnd, 50);
    ctx.lineTo(tunnelEnd + 400, 340);
    ctx.fill();

    // SEÑAL REDONDEADA
    const signX = tunnelStart - 350, signY = 130, signW = 220, signH = 90, radius = 15;
    ctx.fillStyle = "white"; ctx.strokeStyle = "red"; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(signX + radius, signY);
    ctx.arcTo(signX + signW, signY, signX + signW, signY + signH, radius);
    ctx.arcTo(signX + signW, signY + signH, signX, signY + signH, radius);
    ctx.arcTo(signX, signY + signH, signX, signY, radius);
    ctx.arcTo(signX, signY, signX + signW, signY, radius);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "black"; ctx.font = "bold 18px Arial";
    ctx.fillText("TÚNEL DE", signX + 65, 165);
    ctx.fillText("MASCARAT", signX + 60, 195);
    ctx.fillStyle = "#444"; ctx.fillRect(signX + 105, 220, 12, 120);

    // EL TÚNEL
    ctx.fillStyle = "#111"; ctx.fillRect(tunnelStart, 90, tunnelEnd - tunnelStart, 250);
    for(let i=0; i< (tunnelEnd-tunnelStart)/200; i++) {
        ctx.fillStyle = "#ffd700"; ctx.fillRect(tunnelStart + 100 + (i*200), 100, 40, 8);
    }

    // CARRETERA
    ctx.fillStyle = "#333"; ctx.fillRect(0, 340, worldWidth, 60);
    ctx.fillStyle = "white"; 
    for(let i=0; i<worldWidth; i+=100) ctx.fillRect(i, 365, 45, 4);

    // ALTEA FINAL
    if (car.x > finishArea - 400) {
        ctx.fillStyle = "white"; ctx.font = "bold 90px Arial";
        ctx.fillText("ALTEA", finishArea, 320);
        ctx.font = "80px Arial"; ctx.fillText("🧔‍♂️", finishArea + 600, 320);
        ctx.fillStyle = "black"; ctx.font = "bold 22px Arial";
        ctx.fillText("¡Te esperaba!", finishArea + 570, 230);
    }

    // OBSTÁCULOS
    obstacles.forEach(obs => {
        if (obs.tipo === "alto") {
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath();
            ctx.ellipse(obs.x + obs.w/2, obs.y + obs.h + 2, obs.w/2.5, 4, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "black"; ctx.font = `${obs.h + 15}px Arial`;
        ctx.fillText(obs.emoji, obs.x, obs.y + obs.h);
    });

    // COCHE + CHICA CASTAÑA
    if (invincibilityFrames % 10 < 5) {
        ctx.fillStyle = car.color; ctx.fillRect(car.x, car.y, car.w, car.h);
        ctx.fillRect(car.x + 15, car.y - 15, 40, 20); 
        ctx.fillStyle = "#b3e5fc"; ctx.fillRect(car.x + 35, car.y - 12, 16, 14); 
        ctx.font = "15px Arial"; ctx.fillText("👧🏽", car.x + 36, car.y - 1);
        ctx.fillStyle = "#111"; ctx.beginPath();
        ctx.arc(car.x + 15, car.y + car.h, 11, 0, Math.PI*2); ctx.arc(car.x + 60, car.y + car.h, 11, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ffd700"; ctx.fillRect(car.x + car.w - 5, car.y + 5, 6, 12); 
    }

    ctx.restore();
}

function endGame(message) {
    gameActive = false;
    pauseBtn.style.display = "none";
    statusText.innerHTML = message;
    statusText.style.color = (lives <= 0) ? "#800000" : "#2e7d32";
    restartBtn.style.display = "inline-block";
}

draw();