import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';
import { Storage } from './storage.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AUDIO ---
const shootSound = new Audio('./assets/sounds/shoot.wav');
shootSound.volume = 0.4;
function playBang() {
    const s = shootSound.cloneNode(); 
    s.volume = 0.4;
    s.play().catch(e => {});
}

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

const COST_DAMAGE = 100;
const COST_TURRET = 100;

// WEAPON CONFIG
const WEAPONS = {
    rifle: { name: "Rifle", damageMult: 1, cooldown: 0, recoil: 5, spread: 0 },
    shotgun: { name: "Shotgun", damageMult: 0.5, cooldown: 800, recoil: 20, spread: 60 },
    sniper: { name: "50 Cal", damageMult: 5, cooldown: 1500, recoil: 40, spread: 0 }
};

const defaultStats = {
    xp: 0,
    level: 1,
    highWave: 1,
    unlockedWeapons: ['rifle'], // Start with Rifle
    stats: {
        damage: 1,
        scopeSize: 1.0, 
    }
};

let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));

let state = {
    gold: 0,
    towerHp: 100,
    playerHp: 100,
    wave: 1,
    waveActive: true,
    shopOpen: false,
    enemiesSpawned: 0,
    enemiesToSpawn: 10,
    enemies: [],
    particles: [],
    dirIndex: 0, 
    directions: ['N', 'E', 'S', 'W'],
    turrets: { 'N': false, 'E': false, 'S': false, 'W': false },
    turretTimer: 0,
    gameOver: false,
    
    // NEW STATE
    currentWeapon: 'rifle',
    lastShotTime: 0,
    recoilY: 0
};

const input = new InputHandler(canvas);

document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
document.getElementById('nav-down').addEventListener('click', () => turn(2));
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

// --- WEAPON UI & LOGIC ---
window.selectWeapon = (id) => {
    if (player.unlockedWeapons.includes(id)) {
        state.currentWeapon = id;
        
        // Update UI
        document.querySelectorAll('.weapon-slot').forEach(el => el.classList.remove('active'));
        document.getElementById(`slot-${id}`).classList.add('active');
    }
};

window.buyWeapon = (id) => {
    let cost = (id === 'shotgun') ? 200 : 500;
    if (player.xp >= cost && !player.unlockedWeapons.includes(id)) {
        player.xp -= cost;
        player.unlockedWeapons.push(id);
        saveGame();
        updateUI();
        updateWeaponUI();
    }
};

function updateWeaponUI() {
    player.unlockedWeapons.forEach(id => {
        document.getElementById(`slot-${id}`).classList.remove('locked');
    });
    
    // Hide shop items if bought
    if(player.unlockedWeapons.includes('shotgun')) document.getElementById('shop-shotgun').style.display = 'none';
    if(player.unlockedWeapons.includes('sniper')) document.getElementById('shop-sniper').style.display = 'none';
}

// Initial check
updateWeaponUI();

// --- SHOP LOGIC ---
window.buyUpgrade = (type) => {
    if (type === 'damage') {
        if (player.xp >= COST_DAMAGE) {
            player.xp -= COST_DAMAGE;
            player.stats.damage++;
            saveGame();
            updateUI();
        }
    }
};

window.buyTurret = () => {
    let currentDir = state.directions[state.dirIndex];
    if (state.turrets[currentDir]) return; 
    
    if (state.gold >= COST_TURRET) {
        state.gold -= COST_TURRET;
        state.turrets[currentDir] = true;
        updateUI();
        updateNavLabels();
        updateShopButtons(); 
    }
};

function updateShopButtons() {
    let currentDir = state.directions[state.dirIndex];
    const btn = document.getElementById('btn-turret');
    if (state.turrets[currentDir]) {
        btn.innerText = "OWNED";
        btn.disabled = true;
        btn.style.color = "#888";
        btn.style.borderColor = "#888";
    } else {
        btn.innerText = `${COST_TURRET} G`;
        btn.disabled = false;
        btn.style.color = "#0f0";
        btn.style.borderColor = "#0f0";
    }
}

window.nextWave = () => {
    document.getElementById('shop-overlay').style.display = 'none';
    state.shopOpen = false;
    startNextWave();
};

function turn(dirChange) {
    state.dirIndex = (state.dirIndex + dirChange + 4) % 4;
    updateNavLabels();
    if (state.shopOpen) updateShopButtons(); 
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function updateNavLabels() {
    let cur = state.directions[state.dirIndex];
    document.getElementById('current-dir').innerHTML = cur + (state.turrets[cur] ? " <span style='font-size:20px'>🤖</span>" : "");
    const leftIndex = (state.dirIndex + 3) % 4;
    const rightIndex = (state.dirIndex + 1) % 4;
    const backIndex = (state.dirIndex + 2) % 4;
    const getIcon = (dir) => state.turrets[dir] ? "🤖" : "";
    document.getElementById('nav-left').innerText = state.directions[leftIndex] + getIcon(state.directions[leftIndex]);
    document.getElementById('nav-right').innerText = state.directions[rightIndex] + getIcon(state.directions[rightIndex]);
    document.getElementById('nav-down').innerText = state.directions[backIndex] + getIcon(state.directions[backIndex]);
}

function shoot(e) {
    if (state.gameOver || !state.waveActive || state.shopOpen) return;

    // COOLDOWN CHECK
    let now = Date.now();
    let weapon = WEAPONS[state.currentWeapon];
    if (now - state.lastShotTime < weapon.cooldown) return;

    state.lastShotTime = now;
    playBang();

    // TRIGGER RECOIL
    state.recoilY = weapon.recoil;

    const aim = input.getAim();
    ctx.fillStyle = "rgba(255, 255, 220, 0.3)";
    ctx.fillRect(0, 0, width, height);

    let baseDmg = player.stats.damage;
    let finalDmg = Math.max(1, Math.floor(baseDmg * weapon.damageMult));

    // SPECIAL LOGIC FOR SHOTGUN (Wide Hit)
    let hitRadiusMult = (state.currentWeapon === 'shotgun') ? 3.0 : 1.0; 

    checkHit(aim.x, aim.y, finalDmg, true, hitRadiusMult);
}

function checkHit(x, y, dmg, isPlayer, radiusMult = 1.0) {
    // If Sniper, can pierce (hit multiple). Others stop at first hit.
    let piercing = (state.currentWeapon === 'sniper');
    let hitCount = 0;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        
        if (isPlayer && e.view !== state.directions[state.dirIndex]) continue;

        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = (30 * scale) * radiusMult; 
        
        let hit = false;
        if (isPlayer) {
            let dist = Math.hypot(e.x - x, drawY - y);
            if (dist < size) hit = true;
        } else {
            hit = true; 
        }

        if (hit) {
            e.hp -= dmg; 
            if (isPlayer) {
                ctx.fillStyle = "red";
                ctx.beginPath(); ctx.arc(e.x, drawY, 5, 0, Math.PI*2); ctx.fill();
            }

            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                let xpGain = e.xpValue; // Use enemy specific XP
                let goldGain = 10;
                player.xp += xpGain;
                state.gold += goldGain;
                
                spawnFloatingText(`+${xpGain}XP`, e.x, drawY - 20, "#0ff");
                spawnFloatingText(`+$${goldGain}`, e.x, drawY - 40, "#ff0");
                updateUI();
                saveGame();
            }
            
            hitCount++;
            if (!piercing) break; // Stop unless sniper
            if (piercing && hitCount >= 3) break; // Limit pierce
        }
    }
}

function fireTurrets() {
    state.directions.forEach(dir => {
        if (state.turrets[dir]) {
            let target = null;
            let maxDist = 0;
            state.enemies.forEach(e => {
                if (e.view === dir && e.distance > maxDist) {
                    target = e;
                    maxDist = e.distance;
                }
            });

            if (target) {
                target.hp -= 1; 
                if (target.hp <= 0) {
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
    document.getElementById('btn-damage').innerText = `${COST_DAMAGE} XP`;
    updateShopButtons(); 
    updateWeaponUI();
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

function checkIndicators() {
    let closestL = 0; 
    let closestR = 0;
    let closestB = 0;
    state.enemies.forEach(e => {
        let enemyViewIndex = state.directions.indexOf(e.view);
        let diff = enemyViewIndex - state.dirIndex;
        if (diff === -3) diff = 1; 
        if (diff === 3) diff = -1; 
        let danger = 0;
        if (e.distance < 70) danger = 1 - (e.distance / 70);
        if (diff === 1) closestR = Math.max(closestR, danger);
        else if (diff === -1) closestL = Math.max(closestL, danger);
        else if (Math.abs(diff) === 2) closestB = Math.max(closestB, danger);
    });
    document.getElementById('danger-left').style.opacity = closestL;
    document.getElementById('danger-right').style.opacity = closestR;
    document.getElementById('danger-behind').style.opacity = closestB;
}

// --- MAIN LOOP ---

let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // --- GAMEPAD CHECK ---
    if (input.update()) shoot();
    // ---------------------

    if (state.shopOpen) {
        requestAnimationFrame(gameLoop);
        return; 
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

    ctx.strokeStyle = '#222';
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
                updateUI();
            }
        } else if (state.enemies.length === 0) {
            state.waveActive = false;
            openShop();
        }
        
        state.turretTimer += dt;
        if (state.turretTimer > 1000) {
            fireTurrets();
            state.turretTimer = 0;
        }
    }

    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();
        
        if (e.distance <= 0) {
            let enemyDir = e.view;
            let currentDir = state.directions[state.dirIndex];
            state.towerHp -= 10;
            spawnFloatingText("-10 TOWER", width/2, height/2 - 20, "orange");
            if (enemyDir !== currentDir) {
                state.playerHp -= 10; 
                spawnFloatingText("-10 HP", width/2, height/2 + 30, "red");
            }
            state.enemies.splice(i, 1);
            updateUI();
            if (state.towerHp <= 0 || state.playerHp <= 0) state.gameOver = true;
        }

        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, width, height);
        }
    }
    
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

    // RECOIL RECOVERY
    if (state.recoilY > 0) state.recoilY *= 0.8; // Recover quickly

    // Scope
    const aim = input.getAim();
    let scopeRadius = (height * 0.22) * player.stats.scopeSize; 
    
    // APPLY RECOIL TO SCOPE RENDER (Visual bounce only)
    let rx = aim.x;
    let ry = aim.y - state.recoilY; // Kick up

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height); 
    ctx.arc(rx, ry, scopeRadius, 0, Math.PI*2, true); 
    ctx.clip();
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = "#002200"; 
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(rx, ry, scopeRadius, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.strokeStyle = "#0f0"; 
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx, ry, scopeRadius - 5, 0, Math.PI*2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx - 10, ry); ctx.lineTo(rx + 10, ry);
    ctx.moveTo(rx, ry - 10); ctx.lineTo(rx, ry + 10);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

updateUI();
updateWeaponUI();
requestAnimationFrame(gameLoop);
