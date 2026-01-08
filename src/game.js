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

// --- STATS CONFIG ---
const COST_DAMAGE = 100;
const COST_SCOPE = 50;
const COST_TURRET = 100;

const defaultStats = {
    xp: 0,
    level: 1,
    highWave: 1,
    stats: {
        damage: 1,
        scopeSize: 1.0, 
    }
};

let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));

// Session State (Resets every game)
let state = {
    gold: 0,
    towerHp: 100,
    playerHp: 100, // New HP Bar
    wave: 1,
    waveActive: true,
    shopOpen: false,
    enemiesSpawned: 0,
    enemiesToSpawn: 10,
    enemies: [],
    particles: [],
    dirIndex: 0, 
    directions: ['N', 'E', 'S', 'W'],
    turrets: { 'N': false, 'E': false, 'S': false, 'W': false }, // Turrets per wall
    turretTimer: 0,
    gameOver: false
};

const input = new InputHandler(canvas);

// --- NAVIGATION & INPUT ---
document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
document.getElementById('nav-down').addEventListener('click', () => turn(2));
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

// Global window functions for HTML buttons
window.buyUpgrade = (type) => {
    if (type === 'damage') {
        if (player.xp >= COST_DAMAGE) {
            player.xp -= COST_DAMAGE;
            player.stats.damage++;
            saveGame();
            updateUI();
        }
    } else if (type === 'scope') {
        if (player.xp >= COST_SCOPE) {
            player.xp -= COST_SCOPE;
            player.stats.scopeSize += 0.1;
            saveGame();
            updateUI();
        }
    }
};

window.buyTurret = () => {
    let currentDir = state.directions[state.dirIndex];
    if (state.turrets[currentDir]) return; // Already have one
    
    if (state.gold >= COST_TURRET) {
        state.gold -= COST_TURRET;
        state.turrets[currentDir] = true;
        updateUI();
        updateNavLabels();
    }
};

window.nextWave = () => {
    document.getElementById('shop-overlay').style.display = 'none';
    state.shopOpen = false;
    startNextWave();
};

function turn(dirChange) {
    state.dirIndex = (state.dirIndex + dirChange + 4) % 4;
    updateNavLabels();
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function updateNavLabels() {
    let cur = state.directions[state.dirIndex];
    document.getElementById('current-dir').innerHTML = cur + (state.turrets[cur] ? " 🤖" : "");
    
    const leftIndex = (state.dirIndex + 3) % 4;
    const rightIndex = (state.dirIndex + 1) % 4;
    const backIndex = (state.dirIndex + 2) % 4;
    
    document.getElementById('nav-left').innerText = state.directions[leftIndex] + (state.turrets[state.directions[leftIndex]] ? "🤖" : "");
    document.getElementById('nav-right').innerText = state.directions[rightIndex] + (state.turrets[state.directions[rightIndex]] ? "🤖" : "");
    document.getElementById('nav-down').innerText = state.directions[backIndex] + (state.turrets[state.directions[backIndex]] ? "🤖" : "");
}

function shoot(e) {
    if (state.gameOver || !state.waveActive || state.shopOpen) return;
    const aim = input.getAim();
    
    // Muzzle Flash
    ctx.fillStyle = "rgba(255, 255, 220, 0.3)";
    ctx.fillRect(0, 0, width, height);

    checkHit(aim.x, aim.y, player.stats.damage, true);
}

// Unified hit logic for Player and Turrets
function checkHit(x, y, dmg, isPlayer) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        
        // Player can only hit current view. Turrets hit their own view.
        // But for click shooting, we only check current view.
        if (isPlayer && e.view !== state.directions[state.dirIndex]) continue;

        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = 30 * scale; 
        
        // If turret, we skip aim check and just hit closest
        let hit = false;
        if (isPlayer) {
            let dist = Math.hypot(e.x - x, drawY - y);
            if (dist < size) hit = true;
        } else {
            hit = true; // Auto-hit
        }

        if (hit) {
            e.hp -= dmg; 
            if (isPlayer) {
                ctx.fillStyle = "red";
                ctx.beginPath(); ctx.arc(e.x, drawY, 5, 0, Math.PI*2); ctx.fill();
            }

            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                let xpGain = 10 * state.wave;
                let goldGain = 10;
                player.xp += xpGain;
                state.gold += goldGain;
                
                spawnFloatingText(`+${xpGain}XP`, e.x, drawY - 20, "#0ff");
                spawnFloatingText(`+$${goldGain}`, e.x, drawY - 40, "#ff0");
                updateUI();
                saveGame();
            }
            break; // One shot one kill
        }
    }
}

function fireTurrets() {
    // Check every direction
    state.directions.forEach(dir => {
        if (state.turrets[dir]) {
            // Find closest enemy in this direction
            let target = null;
            let maxDist = 0;
            
            state.enemies.forEach(e => {
                if (e.view === dir && e.distance > maxDist) {
                    target = e;
                    maxDist = e.distance;
                }
            });

            if (target) {
                target.hp -= 1; // Turret damage fixed at 1 for now
                if (target.hp <= 0) {
                     // Kill logic duplicated for simplicity (should refactor later)
                     state.enemies = state.enemies.filter(e => e !== target);
                     player.xp += 5;
                     state.gold += 5;
                     updateUI();
                }
            }
        }
    });
}

function startNextWave() {
    state.wave++;
    state.enemiesSpawned = 0;
    state.enemiesToSpawn = 10 + (state.wave * 2); 
    state.enemies = [];
    state.waveActive = true;
    updateUI();
    saveGame();
}

function openShop() {
    state.shopOpen = true;
    document.getElementById('shop-overlay').style.display = 'flex';
    
    // Update Shop Buttons
    document.getElementById('btn-damage').innerText = `${COST_DAMAGE} XP`;
    document.getElementById('btn-scope').innerText = `${COST_SCOPE} XP`;
    document.getElementById('btn-turret').innerText = `${COST_TURRET} G`;
}

function updateUI() {
    document.getElementById('lvlVal').innerText = player.level;
    document.getElementById('xpVal').innerText = player.xp;
    document.getElementById('scoreVal').innerText = `$${state.gold}`;
    document.getElementById('waveVal').innerText = state.wave;
    document.getElementById('towerHpVal').innerText = state.towerHp;
    document.getElementById('playerHpVal').innerText = state.playerHp;
    
    let left = (state.enemiesToSpawn - state.enemiesSpawned) + state.enemies.length;
    document.getElementById('enemiesLeftVal').innerText = left;
}

function saveGame() {
    player.highWave = Math.max(player.highWave, state.wave);
    Storage.save(player);
}

function spawnFloatingText(text, x, y, color) {
    state.particles.push({ text, x, y, life: 1.0, color });
}

// --- MAIN LOOP ---

let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    if (state.shopOpen) {
        requestAnimationFrame(gameLoop);
        return; // Pause game loop while shop is open
    }

    // Background
    ctx.fillStyle = "#1a1a1a"; 
    ctx.fillRect(0, 0, width, height);

    if (state.gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Courier";
        ctx.textAlign = "center";
        ctx.fillText(state.towerHp <= 0 ? "TOWER DESTROYED" : "YOU DIED", width/2, height/2 - 50);
        document.getElementById('restart-btn').style.display = 'block';
        return;
    }

    // Horizon
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

    // Game Logic
    if (state.waveActive) {
        // Spawning
        if (state.enemiesSpawned < state.enemiesToSpawn) {
            spawnTimer += dt;
            if (spawnTimer > spawnRate) {
                state.enemies.push(new Enemy(width, height, state.wave));
                state.enemiesSpawned++;
                spawnTimer = 0;
                spawnRate = Math.max(500, 2000 - (state.wave * 100)); 
                updateUI();
            }
        } else if (state.enemies.length === 0) {
            state.waveActive = false;
            openShop(); // Trigger Shop at end of wave
        }
        
        // Turrets Fire (Every 1000ms approx)
        state.turretTimer += dt;
        if (state.turretTimer > 1000) {
            fireTurrets();
            state.turretTimer = 0;
        }
    }

    // Enemy Updates
    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();
        
        // HIT PLAYER / TOWER
        if (e.distance <= 0) {
            let enemyDir = e.view;
            let currentDir = state.directions[state.dirIndex];

            // MECHANIC: If facing enemy, Tower takes hit. If NOT facing, Player takes hit.
            if (enemyDir === currentDir) {
                state.towerHp -= 10;
                spawnFloatingText("-10 TOWER", width/2, height/2, "red");
            } else {
                state.playerHp -= 20; // Hurts more to be backstabbed
                spawnFloatingText("-20 HP", width/2, height/2 + 30, "red");
            }

            state.enemies.splice(i, 1);
            updateUI();
            
            if (state.towerHp <= 0 || state.playerHp <= 0) state.gameOver = true;
        }

        // Draw only if visible
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

    // --- CURVED INDICATORS ---
    drawIndicators();

    // --- SCOPE ---
    drawScope();

    requestAnimationFrame(gameLoop);
}

function drawIndicators() {
    let closestL = 0; 
    let closestR = 0;
    let closestB = 0;

    state.enemies.forEach(e => {
        if (e.distance > 80) return; // Only show when closer
        
        let enemyViewIndex = state.directions.indexOf(e.view);
        let diff = enemyViewIndex - state.dirIndex;
        if (diff === -3) diff = 1; 
        if (diff === 3) diff = -1; 
        
        let intensity = 1 - (e.distance / 80); // 0 to 1

        if (diff === 1) closestR = Math.max(closestR, intensity);
        else if (diff === -1) closestL = Math.max(closestL, intensity);
        else if (Math.abs(diff) === 2) closestB = Math.max(closestB, intensity);
    });

    // Draw Curved Gradients
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.45; // Just inside edge

    if (closestL > 0) drawArcIndicator(cx, cy, radius, Math.PI * 0.75, Math.PI * 1.25, closestL);
    if (closestR > 0) drawArcIndicator(cx, cy, radius, Math.PI * 1.75, Math.PI * 2.25, closestR); // Wrap 0
    // Back indicator is a bar at bottom
    if (closestB > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${closestB * 0.8})`;
        ctx.fillRect(0, height - 20, width, 20);
    }
}

function drawArcIndicator(x, y, r, startAngle, endAngle, intensity) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle, endAngle);
    ctx.lineWidth = 15;
    
    // Create Gradient stroke
    let grad = ctx.createLinearGradient(0, 0, width, 0); // Simple linear for now, radial is complex
    // Actually, just solid color with opacity looks cleaner for "Neon" look
    ctx.strokeStyle = `rgba(255, 0, 0, ${intensity})`;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
}

function drawScope() {
    const aim = input.getAim();
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
}

updateUI();
updateNavLabels();
requestAnimationFrame(gameLoop);
