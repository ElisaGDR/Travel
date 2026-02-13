const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const overlay = document.getElementById("overlay");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

canvas.width = 800; canvas.height = 400;

const imgNoviaIcon = new Image(); imgNoviaIcon.src = 'eli icon.png';
const imgNoviaFull = new Image(); imgNoviaFull.src = 'eli full.webp';
const imgNovio = new Image(); imgNovio.src = 'luis.webp';

// CONFIGURACIÓN
const MODO_PRUEBA = false; // CAMBIA A FALSE PARA JUGAR EN SERIO
const worldWidth = 13500; 
let gameStarted = false, gameActive = true, isPaused = false;
let cameraX = 0, lives = 3, invincibilityFrames = 0;
let hasReachedEnd = false;

const car = {
    x: 150, y: 300, w: 75, h: 35,
    baseSpeed: 5,
    currentSpeed: 5,
    vy: 0, 
    gravity: 0.9,
    jumpPower: -17,
    grounded: true, 
    color: "#800000"
};

const bride = {
    x: 0, y: 0, targetX: 0, targetY: 320, moving: false
};

const clouds = Array.from({length: 40}, () => ({
    x: Math.random() * worldWidth, y: Math.random() * 120, s: 0.6 + Math.random()
}));

const obstacleTypes = [
    { emoji: "🚧", w: 40, h: 40, tipo: "alto" },
    { emoji: "🕳️", w: 60, h: 25, tipo: "suelo" }, 
    { emoji: "📦", w: 45, h: 45, tipo: "alto" },
    { emoji: "🪵", w: 55, h: 35, tipo: "alto" }
];

const obstacles = [];
const isMobile = window.innerWidth < 768; 
const numObstacles = isMobile ? 35 : 40;
const spacing = isMobile ? 330 : 245; 

for (let i = 0; i < numObstacles; i++) {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    let yPos = (type.tipo === "suelo") ? 338 : 310; 

    obstacles.push({ 
        x: 1200 + (i * spacing) + Math.random() * 100, 
        y: yPos, 
        ...type, 
        hit: false 
    });
}
const tunnelStart = 8200;
const tunnelEnd = 9800;
const finishArea = 11200; 
const groomX = 11800; 

const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if(e.code === "KeyP") togglePause();
});
window.addEventListener("keyup", (e) => keys[e.code] = false);

window.addEventListener("touchstart", (e) => {
    if (gameStarted && !isPaused && !hasReachedEnd) {
        const touchX = e.touches[0].clientX;
        const screenWidth = window.innerWidth;

        // Si toca el lado IZQUIERDO (menos del 30% de la pantalla) -> FRENA
        if (touchX < screenWidth * 0.3) {
            keys["ArrowLeft"] = true;
            keys["ArrowUp"] = false;
            keys["ArrowRight"] = false;
        } 
        // Si toca el resto de la pantalla -> SALTA Y ACELERA
        else {
            keys["ArrowUp"] = true;
            keys["ArrowRight"] = false;
            keys["ArrowLeft"] = false;
        }
    }
}, {passive: false});

window.addEventListener("touchend", () => {
    // Al soltar el dedo, reseteamos todas las teclas
    keys["ArrowUp"] = false;
    keys["ArrowRight"] = false;
    keys["ArrowLeft"] = false;
});

startBtn.onclick = () => { overlay.style.display = "none"; gameStarted = true; update(); };
pauseBtn.onclick = () => togglePause();

function togglePause() {
    if(!gameStarted || !gameActive) return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Reanudar" : "Pausar";
    if(!isPaused) update();
}

function update() {
    if (!gameStarted || isPaused) return;

    if (!hasReachedEnd && gameActive) {
        if (keys["ArrowRight"]) car.currentSpeed = car.baseSpeed + 5;
        else if (keys["ArrowLeft"]) car.currentSpeed = car.baseSpeed - 3;
        else car.currentSpeed = car.baseSpeed;
        car.x += car.currentSpeed;
    } else if (bride.moving) {
        bride.x += (bride.targetX - bride.x) * 0.03;
        bride.y += (bride.targetY - bride.y) * 0.03;
        if (Math.abs(bride.x - bride.targetX) < 2) {
            bride.moving = false;
            endGame("❤️ ¡MISIÓN CUMPLIDA! ¡Novio encontrado!.");
        }
    }

    if ((keys["ArrowUp"] || keys["Space"]) && car.grounded && !hasReachedEnd && gameActive) { 
        car.vy = car.jumpPower; 
        car.grounded = false; 
    }
    car.vy += car.gravity; car.y += car.vy;
    if (car.y >= 300) { car.y = 300; car.vy = 0; car.grounded = true; }

    if (!hasReachedEnd) {
        cameraX = car.x - 150;
    } else {
        cameraX = 11150; 
    }

    if (cameraX < 0) cameraX = 0;
    if (cameraX > worldWidth - canvas.width) cameraX = worldWidth - canvas.width;

    if (invincibilityFrames > 0) invincibilityFrames--;
    
    if (gameActive && !hasReachedEnd) {
        obstacles.forEach(obs => {
            if (!obs.hit && invincibilityFrames === 0) {
                // LOGICA DE BACHES CORREGIDA: Detecta colisión si el coche los pisa
                let hitboxY = (obs.tipo === "suelo") ? obs.y - 45 : obs.y;
                let hitboxMargin = (obs.tipo === "suelo") ? 0 : 15;
                
                if (car.x < obs.x + obs.w - hitboxMargin && car.x + car.w > obs.x + hitboxMargin && 
                    car.y + car.h > hitboxY && car.y < obs.y + obs.h) {
                    if (!MODO_PRUEBA) lives--;
                    obs.hit = true; invincibilityFrames = 60;
                    if (lives <= 0) endGame("💔 El viaje es duro... ¡Inténtalo de nuevo!");
                }
            }
        });
    }

    let prog = Math.min(Math.floor((car.x / (worldWidth - 1500)) * 100), 100);
    if (gameActive) {
        statusText.innerHTML = `Vidas: ${MODO_PRUEBA ? "♾️" : "❤️".repeat(lives)} | ${prog}% del viaje`;
    }
    
    if (car.x >= 11350 && !hasReachedEnd) {
        hasReachedEnd = true;
        car.x = 11350; 
        bride.x = car.x + 30;
        bride.y = car.y;
        bride.targetX = groomX - 25; // Eli pegadita a Luis
        bride.targetY = 320;
        bride.moving = true;
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    let prog = car.x / worldWidth;
    let r = 70 + (135 - 70) * prog;
    let g = 80 + (215 - 80) * prog;
    let b = 95 + (250 - 95) * prog;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Nubes
    let cloudBright = 100 + (155 * prog);
    ctx.fillStyle = `rgba(${cloudBright},${cloudBright},${cloudBright},0.9)`;
    clouds.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x + (cameraX * 0.3), c.y, 25 * c.s, 0, Math.PI*2);
        ctx.arc(c.x + 20 + (cameraX * 0.3), c.y - 10, 25 * c.s, 0, Math.PI*2);
        ctx.fill();
    });

    // Valencia
    ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 90px Arial";
    ctx.fillText("VALENCIA", 100, 320); 
    ctx.font = "120px Arial"; ctx.fillText("🥘", 150, 180);

    // Mar Altea
    if (car.x > tunnelEnd - 800) {
        ctx.fillStyle = "#0077be"; ctx.fillRect(tunnelEnd, 240, worldWidth - tunnelEnd, 160);
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 3;
        for(let j=0; j<5; j++) {
            for(let i=tunnelEnd; i<worldWidth; i+=250) {
                ctx.beginPath(); ctx.moveTo(i + (j*40), 260 + (j*20)); 
                ctx.lineTo(i + 60 + (j*40), 260 + (j*20)); ctx.stroke();
            }
        }
        ctx.fillStyle = "#2ecc71"; ctx.fillRect(tunnelEnd, 320, worldWidth - tunnelEnd, 35);
    }

    if (car.x > tunnelEnd - 500) {
    let sunX = finishArea + 400; // Posicionado entre el cartel y el novio
    let sunY = 100; // En mitad del cielo
    
    // Resplandor exterior (opcional para que luzca más bonito)
    ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();

    // El cuerpo del Sol
    ctx.fillStyle = "#FFD700"; // Color Oro/Amarillo brillante
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Rayos del sol (detallito extra)
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        let angle = (Math.PI * 2 / 8) * i;
        ctx.lineTo(sunX + Math.cos(angle) * 70, sunY + Math.sin(angle) * 70);
        ctx.stroke();
    }
}

    // Montaña y Túnel
    ctx.fillStyle = "#4a4a4a"; ctx.beginPath();
    ctx.moveTo(tunnelStart - 400, 340); ctx.lineTo(tunnelStart, 50);
    ctx.lineTo(tunnelEnd, 50); ctx.lineTo(tunnelEnd + 400, 340); ctx.fill();

    ctx.fillStyle = "white"; ctx.strokeStyle = "red"; ctx.lineWidth = 6;
    const signX = tunnelStart - 350, signY = 130, signW = 220, signH = 90;
    ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "black"; ctx.font = "bold 18px Arial";
    ctx.fillText("TÚNEL DE", signX + 65, 165); ctx.fillText("MASCARAT", signX + 60, 195);
    ctx.fillStyle = "#333"; ctx.fillRect(signX + 105, 220, 12, 120);

    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(tunnelStart, 90, tunnelEnd - tunnelStart, 250);
    for(let i=0; i< (tunnelEnd-tunnelStart)/200; i++) {
        ctx.fillStyle = "#ffd700"; ctx.fillRect(tunnelStart + 100 + (i*200), 100, 40, 8);
    }

    // Carretera
    ctx.fillStyle = "#333"; ctx.fillRect(0, 340, worldWidth, 60);
    ctx.fillStyle = "white"; 
    for(let i=0; i<worldWidth; i+=100) ctx.fillRect(i, 365, 45, 4);

    // ESCENA FINAL: ALTEA
    ctx.fillStyle = "white"; ctx.font = "bold 90px Arial";
    ctx.fillText("ALTEA", 11250, 200);
    
    // Novio
    ctx.drawImage(imgNovio, groomX, 155, 180, 180);
    
    if (hasReachedEnd) {
        // Novia
        ctx.drawImage(imgNoviaFull, bride.x, bride.y - 140, 155, 155);
        
        if (!bride.moving) {
            // CENTRADO DEL CORAZÓN MEJORADO
            let coupleMidX = (bride.x + groomX + 160) / 2;
            let heartY = 120 + Math.sin(Date.now() / 300) * 10;
            ctx.textAlign = "center"
            ctx.save();
            ctx.font = "60px Arial";
            ctx.fillText("💘", coupleMidX, heartY);
            ctx.restore();
        }
    }

    // Obstáculos
    obstacles.forEach(obs => {
        if (obs.tipo === "alto") {
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath();
            ctx.ellipse(obs.x + obs.w/2, obs.y + obs.h + 2, obs.w/2.5, 4, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "black"; ctx.font = `${obs.h + 15}px Arial`;
        ctx.fillText(obs.emoji, obs.x, obs.y + obs.h);
    });

    // Coche
    if (!hasReachedEnd || invincibilityFrames > 0) {
        if (invincibilityFrames % 10 < 5) {
            ctx.fillStyle = car.color; ctx.fillRect(car.x, car.y, car.w, car.h);
            ctx.fillRect(car.x + 15, car.y - 15, 40, 20); 
            ctx.fillStyle = "#b3e5fc"; ctx.fillRect(car.x + 35, car.y - 12, 16, 14); 
            if (!hasReachedEnd) {
                ctx.drawImage(imgNoviaIcon, car.x + 18, car.y - 15, 45, 45);
            }
            ctx.fillStyle = "#111"; ctx.beginPath();
            ctx.arc(car.x + 15, car.y + car.h, 11, 0, Math.PI*2); ctx.arc(car.x + 60, car.y + car.h, 11, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#ffd700"; ctx.fillRect(car.x + car.w - 5, car.y + 5, 6, 12); 
        }
    } else {
        ctx.fillStyle = car.color; ctx.fillRect(car.x, car.y, car.w, car.h);
        ctx.fillRect(car.x + 15, car.y - 15, 40, 20); 
        ctx.fillStyle = "#b3e5fc"; ctx.fillRect(car.x + 35, car.y - 12, 16, 14); 
        ctx.fillStyle = "#111"; ctx.beginPath();
        ctx.arc(car.x + 15, car.y + car.h, 11, 0, Math.PI*2); ctx.arc(car.x + 60, car.y + car.h, 11, 0, Math.PI*2); ctx.fill();
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