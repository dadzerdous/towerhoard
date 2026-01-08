import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';
import { Storage } from './storage.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
});

const defaultStats = {
    gold: 0,
    xp: 0,
    level: 1,
    highWave: 1,
    stats: {
        damage: 1,
        fireRate: 0, 
        scopeSize: 1.0, 
        towerHp: 100
    }
};

let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));

let state = {
    hp: player.stats.towerHp,
    wave: 1,
    waveActive: true,
    enemiesSpawned: 0,
    enemiesToSpawn: 10,
    enemies: [],
    particles: [],
    dirIndex: 0, // 0=N, 1=E, 2=S, 3=W
    directions: ['N', 'E', 'S', 'W'],
    gameOver: false
};

const input = new InputHandler(canvas);

// --- NAVIGATION UPDATES ---
document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
document.getElementById('nav-down').addEventListener('click', () => turn(2)); // Turn 180
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

function turn(dirChange) {
    state.dirIndex = (state.dirIndex + dirChange + 4) % 4; // Wrap around math
    updateNavLabels();
    
    // Quick Swipe Effect
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function updateNavLabels() {
    // Current Facing
    document.getElementById('current-dir').innerText = state.directions[state.dirIndex];
    
    // Calculate relative directions
    const leftIndex = (state.dirIndex + 3) % 4; // -1
    const rightIndex = (state.dirIndex + 1) % 4; // +1
    const backIndex = (state.dirIndex + 2) % 4;  // +2
    
    document.getElementById('nav-left').innerText = state.directions[leftIndex];
    document.getElementById('nav-right').innerText = state.directions[rightIndex];
    document.getElementById('nav-down').innerText = state.directions[backIndex];
}

// Initial Label Set
updateNavLabels();

function spawnFloatingText(text, x, y, color) {
    state.particles.push({ text, x, y, life: 1.0, color });
}

function shoot(e) {
    if (state.gameOver || !state.waveActive) return;
    const aim = input.getAim();
    ctx.fillStyle = "rgba(255, 255, 220, 0.3)";
    ctx.fillRect(0, 0, width, height);

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (e.view !== state.directions[state.dirIndex]) continue;

        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = 30 * scale; 
        
        let dist = Math.hypot(e.x - aim.x, drawY - aim.y);

        if (dist < size) {
            e.hp -= player.stats.damage; 
            ctx.fillStyle = "red";
            ctx.beginPath(); ctx.arc(e.x, drawY, 5, 0, Math.PI*2); ctx.fill();

            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                let xpGain = 10 * state.wave;
                let goldGain = 5;
                player.xp += xpGain;
                player.gold += goldGain;
                spawnFloatingText(`+${xpGain}XP`, e.x, drawY - 20, "#0ff");
                updateUI();
                saveGame();
            }
            break; 
        }
    }
}

function startNextWave() {
    state.wave++;
    state.enemiesSpawned = 0;
    state.enemiesToSpawn = 10 + (state.wave * 2); 
    state.enemies = [];
    state.waveActive = true;
    state.hp = player.stats.towerHp; 
    updateUI();
    saveGame();
}

function updateUI() {
    document.getElementById('scoreVal').innerText = `$${player.gold}`;
    document.getElementById('waveVal').innerText = state.wave;
    document.getElementById('hpVal').innerText = state.hp;
    
    // Enemies Remaining
    let left = (state.enemiesToSpawn - state.enemiesSpawned) + state.enemies.length;
    document.getElementById('enemiesLeftVal').innerText = left;
}

function saveGame() {
    player.highWave = Math.max(player.highWave, state.wave);
    Storage.save(player);
}

// --- DYNAMIC INDICATORS ---
function checkIndicators() {
    let closestL = 0; // 0 to 100
    let closestR = 0;
    let closestB = 0;

    state.enemies.forEach(e => {
        // Find relative direction
        let enemyViewIndex = state.directions.indexOf(e.view);
        let diff = enemyViewIndex - state.dirIndex;
        if (diff === -3) diff = 1; 
        if (diff === 3) diff = -1; 
        
        // Calculate "Danger Level" (0.0 to 1.0)
        // Only start showing when distance < 70
        let danger = 0;
        if (e.distance < 70) {
            danger = 1 - (e.distance / 70);
        }

        if (diff === 1) closestR = Math.max(closestR, danger);
        else if (diff === -1) closestL = Math.max(closestL, danger);
        else if (Math.abs(diff) === 2) closestB = Math.max(closestB, danger);
    });

    // Apply Dynamic Styles (Opacity AND Size)
    const elL = document.getElementById('danger-left');
    elL.style.opacity = closestL;
    elL.style.height = (closestL * 100) + "%"; // Grow vertically

    const elR = document.getElementById('danger-right');
    elR.style.opacity = closestR;
    elR.style.height = (closestR * 100) + "%"; 

    const elB = document.getElementById('danger-behind');
    elB.style.opacity = closestB;
    elB.style.width = (closestB * 100) + "%"; // Grow horizontally
}

// --- MAIN LOOP ---

let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    if (state.gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Courier";
        ctx.textAlign = "center";
        ctx.fillText("TOWER LOST", width/2, height/2);
        if (input.isDragging) location.reload(); 
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

    if (state.waveActive) {
        if (state.enemiesSpawned < state.enemiesToSpawn) {
            spawnTimer += dt;
            if (spawnTimer > spawnRate) {
                state.enemies.push(new Enemy(width, height, state.wave));
                state.enemiesSpawned++;
                spawnTimer = 0;
                spawnRate = Math.max(500, 2000 - (state.wave * 100)); 
                updateUI(); // Update count
            }
        } else if (state.enemies.length === 0) {
            state.waveActive = false;
            setTimeout(startNextWave, 3000);
        }
    } else {
        ctx.fillStyle = "#0f0";
        ctx.font = "30px Courier";
        ctx.textAlign = "center";
        ctx.fillText("WAVE COMPLETE", width/2, height/2);
    }

    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();
        if (e.distance <= 0) {
            state.hp -= 10;
            state.enemies.splice(i, 1);
            updateUI();
            if (state.hp <= 0) state.gameOver = true;
        }
        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, width, height);
        }
    }
    
    // Draw Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.life -= 0.02;
        p.y -= 1; 
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.font = "bold 20px Arial";
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1.0;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    checkIndicators();

    // --- SCOPE RENDER ---
    const aim = input.getAim();
    
    // *** SCOPE SIZE TWEAK HERE ***
    // Changed 0.35 to 0.22 for "Much Smaller"
    let scopeRadius = (height * 0.22) * player.stats.scopeSize; 
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height); 
    ctx.arc(aim.x, aim.y, scopeRadius, 0, Math.PI*2, true); 
    ctx.clip();
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = "#002200"; 
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, scopeRadius, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.strokeStyle = "#0f0"; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, scopeRadius - 5, 0, Math.PI*2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(aim.x - 10, aim.y); ctx.lineTo(aim.x + 10, aim.y);
    ctx.moveTo(aim.x, aim.y - 10); ctx.lineTo(aim.x, aim.y + 10);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

updateUI();
requestAnimationFrame(gameLoop);
