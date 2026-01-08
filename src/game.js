import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';
import { Storage } from './storage.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIG & SETUP ---
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

// Default Starting Stats
const defaultStats = {
    gold: 0,
    xp: 0,
    level: 1,
    highWave: 1,
    stats: {
        damage: 1,
        fireRate: 0, // 0 means manual fire (click as fast as you want)
        scopeSize: 1.0, // Multiplier
        towerHp: 100
    }
};

// Load Save or use Defaults
let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));

// Runtime State (Things that reset every game session, not saved)
let state = {
    hp: player.stats.towerHp,
    wave: 1,
    waveActive: true,
    enemiesSpawned: 0,
    enemiesToSpawn: 10, // Enemies per wave
    enemies: [],
    particles: [], // For floating text
    dirIndex: 0, 
    directions: ['N', 'E', 'S', 'W'],
    gameOver: false
};

// Init Input
const input = new InputHandler(canvas);

// Navigation
document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

// --- SYSTEMS ---

function saveGame() {
    // Only save persistent stuff, not current HP
    player.highWave = Math.max(player.highWave, state.wave);
    Storage.save(player);
}

function turn(dir) {
    state.dirIndex += dir;
    if (state.dirIndex < 0) state.dirIndex = 3;
    if (state.dirIndex > 3) state.dirIndex = 0;
    
    document.getElementById('current-dir').innerText = state.directions[state.dirIndex];
    // Visual "Swipe" effect
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function spawnFloatingText(text, x, y, color) {
    state.particles.push({
        text: text,
        x: x,
        y: y,
        life: 1.0, // 1 second
        color: color
    });
}

function shoot(e) {
    if (state.gameOver || !state.waveActive) return;

    const aim = input.getAim();
    
    // Muzzle Flash
    ctx.fillStyle = "rgba(255, 255, 200, 0.3)";
    ctx.fillRect(0, 0, width, height);

    let hitMade = false;

    // Check Hits
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (e.view !== state.directions[state.dirIndex]) continue;

        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = 30 * scale; 
        
        let dist = Math.hypot(e.x - aim.x, drawY - aim.y);

        if (dist < size) {
            hitMade = true;
            e.hp -= player.stats.damage; 
            
            // Critical Hit Visual
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(e.x, drawY, 5, 0, Math.PI*2);
            ctx.fill();

            if (e.hp <= 0) {
                // Enemy Killed
                state.enemies.splice(i, 1);
                
                // Rewards
                let xpGain = 10 * state.wave;
                let goldGain = 5;
                player.xp += xpGain;
                player.gold += goldGain;
                
                spawnFloatingText(`+${xpGain}XP`, e.x, drawY - 20, "#0ff");
                spawnFloatingText(`+$${goldGain}`, e.x, drawY - 40, "#ff0");
                
                updateUI();
                saveGame();
            }
            break; // One shot, one hit
        }
    }
}

function startNextWave() {
    state.wave++;
    state.enemiesSpawned = 0;
    state.enemiesToSpawn = 10 + (state.wave * 2); // Harder every wave
    state.enemies = [];
    state.waveActive = true;
    state.hp = player.stats.towerHp; // Heal tower between waves?
    updateUI();
    saveGame();
}

function updateUI() {
    document.getElementById('scoreVal').innerText = `$${player.gold}`; // Replaced Score with Gold
    document.getElementById('waveVal').innerText = state.wave;
    document.getElementById('hpVal').innerText = state.hp;
}

function checkIndicators() {
    let dangerL = false, dangerR = false, dangerB = false;

    state.enemies.forEach(e => {
        if (e.distance > 50) return; 
        let enemyViewIndex = state.directions.indexOf(e.view);
        let diff = enemyViewIndex - state.dirIndex;
        if (diff === -3) diff = 1; 
        if (diff === 3) diff = -1; 
        
        if (diff === 1) dangerR = true;     
        else if (diff === -1) dangerL = true; 
        else if (Math.abs(diff) === 2) dangerB = true; 
    });

    document.getElementById('danger-left').style.opacity = dangerL ? 0.8 : 0;
    document.getElementById('danger-right').style.opacity = dangerR ? 0.8 : 0;
    document.getElementById('danger-behind').style.opacity = dangerB ? 0.8 : 0;
}

// --- MAIN LOOP ---

let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // 1. Black Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    if (state.gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Courier";
        ctx.textAlign = "center";
        ctx.fillText("TOWER LOST", width/2, height/2);
        ctx.font = "20px Courier";
        ctx.fillText("Tap to Retry", width/2, height/2 + 50);
        
        // Simple retry click
        if (input.isDragging) location.reload(); 
        requestAnimationFrame(gameLoop);
        return;
    }

    // 2. Horizon Line (Very subtle now)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

    // 3. Wave Logic
    if (state.waveActive) {
        // Spawning
        if (state.enemiesSpawned < state.enemiesToSpawn) {
            spawnTimer += dt;
            if (spawnTimer > spawnRate) {
                state.enemies.push(new Enemy(width, height, state.wave));
                state.enemiesSpawned++;
                spawnTimer = 0;
                // dynamic difficulty
                spawnRate = Math.max(500, 2000 - (state.wave * 100)); 
            }
        } else if (state.enemies.length === 0) {
            // WAVE COMPLETE
            state.waveActive = false;
            // Auto start next wave after 3 seconds (or show menu later)
            setTimeout(startNextWave, 3000);
        }
    } else {
        // Intermission Text
        ctx.fillStyle = "#0f0";
        ctx.font = "30px Courier";
        ctx.textAlign = "center";
        ctx.fillText("WAVE COMPLETE", width/2, height/2 - 50);
        ctx.font = "16px Courier";
        ctx.fillText("Next wave incoming...", width/2, height/2);
    }

    // 4. Draw Enemies
    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();

        if (e.distance <= 0) {
            state.hp -= 10;
            state.enemies.splice(i, 1);
            updateUI();
            if (state.hp <= 0) {
                state.gameOver = true;
            }
        }

        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, width, height);
        }
    }

    // 5. Draw Floating Text (Particles)
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.life -= 0.02;
        p.y -= 1; // Float up
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.font = "bold 20px Arial";
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1.0;

        if (p.life <= 0) state.particles.splice(i, 1);
    }

    checkIndicators();

    // 6. THE HARD SCOPE (Visual Fix)
    const aim = input.getAim();
    // Base radius + upgrade multiplier
    let scopeRadius = (height * 0.35) * player.stats.scopeSize; 
    
    // Create the "mask"
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height); // Whole screen
    ctx.arc(aim.x, aim.y, scopeRadius, 0, Math.PI*2, true); // Punch a hole
    ctx.clip();
    
    // Fill the outside with PURE BLACK
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 7. Scope Edge Definition (The "Rim")
    ctx.strokeStyle = "#002200"; // Dark green metal rim
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, scopeRadius, 0, Math.PI*2);
    ctx.stroke();
    
    // Thin sharp inner line
    ctx.strokeStyle = "#0f0"; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, scopeRadius - 5, 0, Math.PI*2);
    ctx.stroke();

    // 8. Crosshair (Precision)
    ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(aim.x - 10, aim.y); ctx.lineTo(aim.x + 10, aim.y);
    ctx.moveTo(aim.x, aim.y - 10); ctx.lineTo(aim.x, aim.y + 10);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

// Initial UI Set
updateUI();
requestAnimationFrame(gameLoop);
