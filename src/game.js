import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';
import { Storage } from './storage.js';
import { Renderer } from './renderer.js';
import { AudioMgr } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const renderer = new Renderer(canvas, ctx);

window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight);
});
renderer.resize(window.innerWidth, window.innerHeight);

// --- HAIKUS (Story Data) ---
const HAIKUS = [
    ["You see them coming", "Hungry for your fluffy pet", "Don't let them get close"], // Wave 1
    ["More of them appear", "The smell of rot in the air", "Keep your aim steady"],   // Wave 2
    ["Ghosts float in the mist", "Bullets pass right through the fog", "Wait for the clear shot"], // Wave 3
    ["The earth shakes below", "Giants walk upon the land", "Strike them down quickly"], // Wave 4
    ["Darkness falls harder", "They are learning how to hunt", "You must be faster"], // Wave 5
    ["A shadow above", "Wings of death beat in the sky", "The Dragon is here"] // Boss
];

const COST_DAMAGE = 100;
const COST_TURRET = 100;

const WEAPONS = {
    rifle: { name: "Rifle", damageMult: 1, cooldown: 0, recoil: 15, scopeScale: 1.0 },
    shotgun: { name: "Shotgun", damageMult: 0.5, cooldown: 800, recoil: 80, scopeScale: 1.3 },
    sniper: { name: "50 Cal", damageMult: 5, cooldown: 1500, recoil: 60, scopeScale: 0.8 }
};

const defaultStats = {
    xp: 0, level: 1, highWave: 1, unlockedWeapons: ['rifle'],
    stats: { damage: 1, scopeSize: 1.0 }
};

let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));
if (!player.unlockedWeapons) player.unlockedWeapons = ['rifle'];

let state = {
    gameStarted: false, storyOpen: false, // NEW STATE
    gold: 0, towerHp: 100, playerHp: 100,
    wave: 1, waveActive: false, shopOpen: false, // Start inactive for story
    enemiesSpawned: 0, enemiesToSpawn: 10,
    enemies: [], particles: [],
    dirIndex: 0, directions: ['N', 'E', 'S', 'W'],
    turrets: { 'N': false, 'E': false, 'S': false, 'W': false },
    turretTimer: 0, gameOver: false,
    currentWeapon: 'rifle', lastShotTime: 0, recoilY: 0,
    targetLocked: false
};

const input = new InputHandler(canvas);

document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
document.getElementById('nav-down').addEventListener('click', () => turn(2));
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

// --- NEW STORY FUNCTIONS ---
window.startStoryMode = () => {
    document.getElementById('start-screen').style.display = 'none';
    state.gameStarted = true;
    showHaiku(0); // Show Wave 1 Haiku
};

window.dismissStory = () => {
    document.getElementById('story-overlay').style.display = 'none';
    state.storyOpen = false;
    state.waveActive = true; // Start the wave!
};

function showHaiku(waveIndex) {
    state.storyOpen = true;
    state.waveActive = false;
    const overlay = document.getElementById('story-overlay');
    const lines = HAIKUS[Math.min(waveIndex, HAIKUS.length - 1)]; // Loop last haiku if out of bounds
    
    document.getElementById('line1').innerText = lines[0];
    document.getElementById('line2').innerText = lines[1];
    document.getElementById('line3').innerText = lines[2];
    
    overlay.style.display = 'flex';
    // Re-trigger animations
    document.querySelectorAll('.haiku-line').forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; /* trigger reflow */
        el.style.animation = null; 
    });
}

// (Keep toggleWeaponMenu, selectWeapon, buyWeapon, buyUpgrade, buyTurret...)
window.toggleWeaponMenu = () => {
    const list = document.getElementById('weapon-list');
    list.classList.toggle('open');
};

window.selectWeapon = (id) => {
    if (player.unlockedWeapons.includes(id)) {
        state.currentWeapon = id;
        document.getElementById('weapon-list').classList.remove('open');
        let icon = "🔫";
        if(id === 'shotgun') icon = "💥";
        if(id === 'sniper') icon = "🔭";
        document.getElementById('weapon-toggle').innerText = icon;
    }
};

window.buyWeapon = (id) => {
    let cost = (id === 'shotgun') ? 200 : 500;
    if (player.xp >= cost && !player.unlockedWeapons.includes(id)) {
        player.xp -= cost;
        player.unlockedWeapons.push(id);
        saveGame();
        updateWeaponUI();
    }
};
window.buyUpgrade = (type) => { if (type === 'damage' && player.xp >= COST_DAMAGE) { player.xp -= COST_DAMAGE; player.stats.damage++; saveGame(); }};
window.buyTurret = () => { let currentDir = state.directions[state.dirIndex]; if (!state.turrets[currentDir] && state.gold >= COST_TURRET) { state.gold -= COST_TURRET; state.turrets[currentDir] = true; updateNavLabels(); updateShopButtons(); }};

window.nextWave = () => {
    document.getElementById('shop-overlay').style.display = 'none';
    state.shopOpen = false;
    startNextWave();
};

function startNextWave() {
    state.wave++;
    state.enemiesSpawned = 0;
    state.enemiesToSpawn = 10 + (state.wave * 2); 
    state.enemies = [];
    
    // Show Story BEFORE wave starts
    showHaiku(state.wave - 1);
    saveGame();
}

function turn(dirChange) {
    state.dirIndex = (state.dirIndex + dirChange + 4) % 4;
    updateNavLabels();
    if (state.shopOpen) updateShopButtons();
}

function shoot() {
    if (!state.gameStarted || state.storyOpen || state.gameOver || !state.waveActive || state.shopOpen) return;

    let now = Date.now();
    let weapon = WEAPONS[state.currentWeapon];
    if (now - state.lastShotTime < weapon.cooldown) return;

    state.lastShotTime = now;
    AudioMgr.playShoot(); 
    state.recoilY = weapon.recoil;
    renderer.drawMuzzleFlash(); 

    const aim = input.getAim();
    let baseDmg = player.stats.damage;
    let finalDmg = Math.max(1, Math.floor(baseDmg * weapon.damageMult));
    let hitRadiusMult = (state.currentWeapon === 'shotgun') ? 3.0 : 1.0; 

    checkHit(aim.x, aim.y, finalDmg, true, hitRadiusMult);
}

function checkHit(x, y, dmg, isPlayer, radiusMult = 1.0) {
    let piercing = (state.currentWeapon === 'sniper');
    let hitCount = 0;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (isPlayer && e.view !== state.directions[state.dirIndex]) continue;
        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (canvas.height/300));
        let size = (8 * scale) * radiusMult; 
        
        let hit = false;
        if (isPlayer) {
            let dist = Math.hypot(e.x - x, drawY - y);
            if (dist < size) hit = true;
        } else { hit = true; } 

        if (hit) {
            e.hp -= dmg; 
            if (e.hp <= 0) {
                spawnExplosion(e.x, drawY, e.color);
                state.enemies.splice(i, 1);
                player.xp += e.xpValue;
                state.gold += 10;
                spawnFloatingText(`+${e.xpValue}XP`, e.x, drawY - 20, "#0ff");
                spawnFloatingText(`+$10`, e.x, drawY - 40, "#ff0");
                saveGame();
            }
            hitCount++;
            if (!piercing) break; 
            if (piercing && hitCount >= 3) break; 
        }
    }
}

function checkTargetLock(aimX, aimY) {
    state.targetLocked = false;
    for (let i = 0; i < state.enemies.length; i++) {
        let e = state.enemies[i];
        if (e.view !== state.directions[state.dirIndex]) continue;
        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (canvas.height/300));
        let size = (12 * scale); 
        let dist = Math.hypot(e.x - aimX, drawY - aimY);
        if (dist < size) {
            state.targetLocked = true;
            return;
        }
    }
}

function fireTurrets() {
    state.directions.forEach(dir => {
        if (state.turrets[dir]) {
            let target = null;
            let maxDist = 0;
            state.enemies.forEach(e => {
                if (e.view === dir && e.distance > maxDist && e.distance < 25) {
                    target = e;
                    maxDist = e.distance;
                }
            });
            if (target) {
                target.hp -= 2;
                if (target.hp <= 0) {
                     spawnExplosion(target.x, canvas.height/2 + 50, target.color);
                     state.enemies = state.enemies.filter(e => e !== target);
                     player.xp += 5; state.gold += 5;
                }
            }
        }
    });
}

function spawnFloatingText(text, x, y, color) { state.particles.push({ type: 0, text, x, y, life: 1.0, color, vy: -1, vx: 0 }); }
function spawnExplosion(x, y, color) { for(let k=0; k<15; k++) { state.particles.push({ type: 1, x, y, life: 1.0, color, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 }); }}
function openShop() { state.shopOpen = true; document.getElementById('shop-overlay').style.display = 'flex'; document.getElementById('btn-damage').innerText = `${COST_DAMAGE} XP`; updateShopButtons(); updateWeaponUI(); }
function updateWeaponUI() { if (!player.unlockedWeapons) return; player.unlockedWeapons.forEach(id => { const el = document.getElementById(`slot-${id}`); if(el) el.classList.remove('locked'); }); if(player.unlockedWeapons.includes('shotgun')) document.getElementById('shop-shotgun').style.display = 'none'; if(player.unlockedWeapons.includes('sniper')) document.getElementById('shop-sniper').style.display = 'none'; }
function updateShopButtons() { let currentDir = state.directions[state.dirIndex]; const btn = document.getElementById('btn-turret'); if (state.turrets[currentDir]) { btn.innerText = "OWNED"; btn.disabled = true; btn.style.color = "#888"; btn.style.borderColor = "#888"; } else { btn.innerText = `${COST_TURRET} G`; btn.disabled = false; btn.style.color = "#0f0"; btn.style.borderColor = "#0f0"; } }
function updateNavLabels() { let cur = state.directions[state.dirIndex]; const getIcon = (dir) => state.turrets[dir] ? "🤖" : ""; document.getElementById('current-dir').innerHTML = cur + (state.turrets[cur] ? " <span style='font-size:20px'>🤖</span>" : ""); const leftIndex = (state.dirIndex + 3) % 4; const rightIndex = (state.dirIndex + 1) % 4; const backIndex = (state.dirIndex + 2) % 4; document.getElementById('nav-left').innerText = state.directions[leftIndex] + getIcon(state.directions[leftIndex]); document.getElementById('nav-right').innerText = state.directions[rightIndex] + getIcon(state.directions[rightIndex]); document.getElementById('nav-down').innerText = state.directions[backIndex] + getIcon(state.directions[backIndex]); }
function saveGame() { player.highWave = Math.max(player.highWave, state.wave); Storage.save(player); }

// --- MAIN LOOP ---
let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    if (input.update()) shoot();

    if (state.shopOpen || state.storyOpen || !state.gameStarted) {
        requestAnimationFrame(gameLoop);
        return; 
    }

    renderer.clear();

    if (state.gameOver) {
        renderer.drawGameOver(state.towerHp <= 0);
        return;
    }

    if (state.waveActive) {
        if (state.enemiesSpawned < state.enemiesToSpawn) {
            spawnTimer += dt;
            if (spawnTimer > spawnRate) {
                state.enemies.push(new Enemy(renderer.width, renderer.height, state.wave));
                state.enemiesSpawned++;
                spawnTimer = 0;
                spawnRate = Math.max(500, 2000 - (state.wave * 100)); 
            }
        } else if (state.enemies.length === 0) {
            state.waveActive = false;
            openShop();
        }
        state.turretTimer += dt;
        if (state.turretTimer > 2000) { fireTurrets(); state.turretTimer = 0; }
    }

    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();
        if (e.distance <= 0) {
            let enemyDir = e.view;
            let currentDir = state.directions[state.dirIndex];
            state.towerHp -= 10;
            spawnFloatingText("-10 TOWER", renderer.width/2, renderer.height/2 - 20, "orange");
            if (enemyDir !== currentDir) {
                state.playerHp -= 10; 
                spawnFloatingText("-10 HP", renderer.width/2, renderer.height/2 + 30, "red");
            }
            state.enemies.splice(i, 1);
            if (state.towerHp <= 0 || state.playerHp <= 0) state.gameOver = true;
        }
        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, renderer.width, renderer.height);
        }
    }

    renderer.drawParticles(state.particles);
    renderer.updateIndicators(state.enemies, state.dirIndex, state.directions);
    renderer.updateUI(player, state, state.enemiesToSpawn);
    
    // GUIDE LINE
    renderer.drawEnemyGuides(state.enemies, state.dirIndex, state.directions, input.getAim());

    if (state.recoilY > 0) state.recoilY *= 0.8; 
    const aim = input.getAim();
    const weaponScale = WEAPONS[state.currentWeapon].scopeScale || 1.0;
    
    checkTargetLock(aim.x, aim.y);
    renderer.drawScope(aim.x, aim.y, player.stats.scopeSize * weaponScale, state.recoilY, state.targetLocked);

    requestAnimationFrame(gameLoop);
}

updateWeaponUI();
updateNavLabels();
requestAnimationFrame(gameLoop);
