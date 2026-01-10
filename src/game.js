// Change the first line to import ENEMY_TYPES too
import { Enemy, ENEMY_TYPES } from './enemies.js';
import { InputHandler } from './input.js';
import { Storage } from './storage.js';
import { Renderer } from './renderer.js';
import { AudioMgr } from './audio.js';

const BESTIARY_DATA = {};
ENEMY_TYPES.forEach(type => {
    BESTIARY_DATA[type.id] = {
        name: type.name,
        icon: type.symbol,
        desc: type.desc,
        hp: type.hp < 3 ? "Low" : (type.hp > 10 ? "High" : "Med"),
        speed: type.speed > 0.1 ? "Fast" : "Slow"
    };
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const renderer = new Renderer(canvas, ctx);


window.addEventListener('resize', () => { renderer.resize(window.innerWidth, window.innerHeight); });
renderer.resize(window.innerWidth, window.innerHeight);

const HAIKUS = [ ["You see them coming", "Hungry for your fluffy pet", "Don't let them get close"], ["More of them appear", "The smell of rot in the air", "Keep your aim steady"], ["Ghosts float in the mist", "Bullets pass right through the fog", "Wait for the clear shot"], ["The earth shakes below", "Giants walk upon the land", "Strike them down quickly"], ["Darkness falls harder", "They are learning how to hunt", "You must be faster"], ["A shadow above", "Wings of death beat in the sky", "The Dragon is here"] ];
const COST_DAMAGE = 100; const COST_TURRET = 100;
const WEAPONS = {
    rifle: { name: "Rifle", damageMult: 1, cooldown: 0, recoil: 15, scopeScale: 1.0 },
    shotgun: { name: "Shotgun", damageMult: 0.5, cooldown: 800, recoil: 80, scopeScale: 1.3 },
    sniper: { name: "50 Cal", damageMult: 5, cooldown: 1500, recoil: 60, scopeScale: 0.8 }
};
const defaultStats = { 
    xp: 0, level: 1, highWave: 1, 
    unlockedWeapons: ['rifle'], 
  stats: { damage: 1, scopeSize: 1.0, reloadSpeed: 1.0, lightLevel: 0, moveSpeed: 1 },// NEW TRACKING DATA
    totalKills: 0,
    bestiary: {} // Will look like { "basic": 50, "tank": 2 }
};

let savedData = Storage.load();
let player = savedData ? savedData : JSON.parse(JSON.stringify(defaultStats));
if (!player.unlockedWeapons) player.unlockedWeapons = ['rifle'];

let state = {
    gameStarted: false, storyOpen: false, gold: 0, towerHp: 100, playerHp: 100, wave: 1, waveActive: false, shopOpen: false, 
    enemiesSpawned: 0, enemiesToSpawn: 10, enemies: [], particles: [],
    dirIndex: 0, directions: ['N', 'E', 'S', 'W'], turrets: { 'N': false, 'E': false, 'S': false, 'W': false },
    turretTimer: 0, gameOver: false, currentWeapon: 'rifle', lastShotTime: 0, recoilY: 0, targetLocked: false,
    castleDir: 'N', castleProgress: 0 
};
state.castleDir = 'N'; 

const input = new InputHandler(canvas);

document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
document.getElementById('nav-down').addEventListener('click', () => turn(2));
canvas.addEventListener('mousedown', shoot);
canvas.addEventListener('touchend', shoot);

function updateGameUI() { renderer.updateUI(player, state, state.enemiesToSpawn); }

window.startStoryMode = () => { AudioMgr.playSelect(); document.getElementById('start-screen').style.display = 'none'; state.gameStarted = true; showHaiku(0); };
window.dismissStory = () => { AudioMgr.playSelect(); document.getElementById('story-overlay').style.display = 'none'; state.storyOpen = false; state.waveActive = true; };
window.skipStoryTypewriter = () => { document.querySelectorAll('.haiku-line').forEach(el => el.style.opacity = 1); document.getElementById('story-continue-btn').style.display = 'block'; };
function showHaiku(waveIndex) { state.storyOpen = true; state.waveActive = false; const overlay = document.getElementById('story-overlay'); const lines = HAIKUS[Math.min(waveIndex, HAIKUS.length - 1)]; document.getElementById('line1').innerText = lines[0]; document.getElementById('line2').innerText = lines[1]; document.getElementById('line3').innerText = lines[2]; document.getElementById('story-continue-btn').style.display = 'none'; document.querySelectorAll('.haiku-line').forEach((el, i) => { el.style.opacity = 0; setTimeout(() => el.style.opacity = 1, 500 + (i * 1000)); }); setTimeout(() => { if(state.storyOpen) document.getElementById('story-continue-btn').style.display = 'block'; }, 3500); overlay.style.display = 'flex'; }
window.switchTab = (tabName) => { AudioMgr.playSelect(); document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active')); document.getElementById(`tab-${tabName}`).classList.add('active'); document.getElementById(`btn-tab-${tabName}`).classList.add('active'); };
window.toggleAccordion = (id) => { AudioMgr.playSelect(); const el = document.getElementById(id); if (el.classList.contains('show')) { el.classList.remove('show'); } else { document.querySelectorAll('.accordion-content').forEach(e => e.classList.remove('show')); el.classList.add('show'); } };
window.buyRepair = () => { if (state.gold >= 50 && state.towerHp < 100) { AudioMgr.playSelect(); state.gold -= 50; state.towerHp = Math.min(100, state.towerHp + 20); updateGameUI(); } };
window.toggleWeaponMenu = () => { AudioMgr.playSelect(); const list = document.getElementById('weapon-list'); list.classList.toggle('open'); if (list.classList.contains('open')) { document.querySelectorAll('.weapon-slot').forEach(el => el.classList.remove('active')); const el = document.getElementById(`slot-${state.currentWeapon}`); if(el) el.classList.add('active'); } };
window.openProfile = () => {
    AudioMgr.playSelect();
    document.getElementById('profile-overlay').style.display = 'flex';
    window.switchProfileTab('stats'); // Default to stats
};

window.closeProfile = () => {
    AudioMgr.playSelect();
    document.getElementById('profile-overlay').style.display = 'none';
};

window.openOptions = () => {
    window.openProfile();
    window.switchProfileTab('options');
};

window.switchProfileTab = (tab) => {
    document.querySelectorAll('#profile-overlay .tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('#profile-overlay .tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(`p-tab-${tab}`).classList.add('active');
    document.getElementById(`btn-p-${tab}`).classList.add('active');
    
    if (tab === 'stats') updateStatsTab();
    if (tab === 'bestiary') updateBestiaryTab();
};

function updateStatsTab() {
    document.getElementById('p-highwave').innerText = player.highWave;
    document.getElementById('p-totalkills').innerText = player.totalKills || 0;
    document.getElementById('p-stat-dmg').innerText = player.stats.damage;
    document.getElementById('p-stat-reload').innerText = player.stats.reloadSpeed.toFixed(1) + "x";
    document.getElementById('p-stat-scope').innerText = player.stats.scopeSize.toFixed(1) + "x";
    // Simple Rank Logic
    let rank = "Rookie";
    let move = player.stats.moveSpeed || 1;
    let k = player.totalKills || 0;
    if (k > 50) rank = "Survivor";
    if (k > 200) rank = "Veteran";
    if (k > 1000) rank = "Sniper Elite";
    document.getElementById('p-rank').innerText = rank;
    document.getElementById('p-stat-move').innerText = move + " squares";
}

function updateBestiaryTab() {
    const grid = document.getElementById('bestiary-grid');
    grid.innerHTML = ""; // Clear
    
    // Loop through our data definitions
    for (let type in BESTIARY_DATA) {
        let kills = player.bestiary[type] || 0;
        let info = BESTIARY_DATA[type];
        
        let div = document.createElement('div');
        div.className = "beast-icon";
        
        // UNLOCK LOGIC
        // 0 Kills = Locked (?)
        // 1+ Kill = Icon Visible
        // 10+ Kills = Info Unlocked
        
        if (kills > 0) {
            div.innerText = info.icon;
            div.classList.add('unlocked');
            div.onclick = () => showEnemyDetails(type, kills);
        } else {
            div.innerText = "?";
            div.style.color = "#555";
            div.onclick = () => {
                document.getElementById('b-name').innerText = "???";
                document.getElementById('b-desc').innerText = "Encouter this enemy to reveal its form.";
                document.getElementById('b-stats').innerText = "";
            };
        }
        grid.appendChild(div);
    }
}

function showEnemyDetails(type, kills) {
    const info = BESTIARY_DATA[type];
    document.getElementById('b-name').innerText = info.name;
    
    if (kills >= 10) {
        document.getElementById('b-desc').innerText = info.desc;
        document.getElementById('b-stats').innerHTML = `
            <div style="margin-top:10px; color:#aaa; font-size:12px;">
                HP: <span style="color:#fff">${info.hp}</span> | 
                SPEED: <span style="color:#fff">${info.speed}</span> | 
                KILLS: <span style="color:#0f0">${kills}</span>
            </div>
        `;
    } else {
        document.getElementById('b-desc').innerText = `Analysis in progress... (${kills}/10 kills)`;
        document.getElementById('b-stats').innerText = "Defeat more to unlock tactical data.";
    }
}

window.resetData = () => {
    if(confirm("WIPE ALL DATA? This cannot be undone.")) {
        localStorage.clear();
        location.reload();
    }
};
window.selectWeapon = (id) => {
    if (player.unlockedWeapons.includes(id)) {
        AudioMgr.playSelect();
        state.currentWeapon = id;
        document.getElementById('weapon-list').classList.remove('open');
        
        let icon = "🔫";
        if (id === 'shotgun') icon = "💥";
        if (id === 'sniper') icon = "🔭";
        
        // --- FIX IS HERE ---
        // OLD: document.getElementById('weapon-toggle').innerText = icon; 
        // NEW: Target the span specifically so we don't delete the cooldown bar
        document.getElementById('weapon-icon').innerText = icon; 
    }
};
// BUG FIX: Wrapped buyWeapon in try/catch to avoid freezing loop
window.buyWeapon = (id) => { 
    try {
        let cost = (id === 'shotgun') ? 200 : 500; 
        if (player.xp >= cost && !player.unlockedWeapons.includes(id)) { 
            AudioMgr.playSelect(); 
            player.xp -= cost; 
            player.unlockedWeapons.push(id); 
            saveGame(); 
            updateWeaponUI(); 
        }
    } catch (e) { console.error("Buy Weapon Error:", e); }
};

window.buyUpgrade = (type) => { 
    const costs = { damage: 100, rof: 150, scope: 120, light: 200 };
    
    if (player.xp >= costs[type]) {
        // Validation: Limit scope and light so they don't break the game
        if (type === 'scope' && player.stats.scopeSize >= 2.0) return; 
        if (type === 'light' && player.stats.lightLevel >= 3) return;

        AudioMgr.playSelect(); 
        player.xp -= costs[type]; 
        
        if (type === 'damage') player.stats.damage++;
        if (type === 'rof') player.stats.reloadSpeed += 0.1; // 10% faster each time
        if (type === 'scope') player.stats.scopeSize += 0.1; // 10% bigger scope
        if (type === 'light') player.stats.lightLevel++;     // 1 extra ring of light

        // Update Button Text to show "MAX" if needed
        const btn = document.getElementById(`btn-${type}`);
        if(btn) btn.innerText = `${costs[type]} XP`; // You can add logic here to show "MAX"
        
        saveGame(); 
        updateGameUI();
    } 
};
window.buyTurret = (dir) => { if (!state.turrets[dir] && state.gold >= COST_TURRET) { AudioMgr.playSelect(); state.gold -= COST_TURRET; state.turrets[dir] = true; updateNavLabels(); updateShopButtons(); } };
window.nextWave = () => { AudioMgr.playSelect(); document.getElementById('shop-overlay').style.display = 'none'; state.shopOpen = false; startNextWave(); };
function startNextWave() { state.wave++; state.enemiesSpawned = 0; state.enemiesToSpawn = 10 + (state.wave * 2); state.enemies = []; showHaiku(state.wave - 1); saveGame(); }
function turn(dirChange) {
    state.dirIndex = (state.dirIndex + dirChange + 4) % 4;
    
    // --- ADD THIS TRANSITION LOGIC ---
    canvas.classList.add('turning');
    setTimeout(() => {
        canvas.classList.remove('turning');
    }, 100);
    // ---------------------------------

    updateNavLabels();
    if (state.shopOpen) updateShopButtons();
}
function shoot() {
    if (!state.gameStarted || state.storyOpen || state.gameOver || !state.waveActive || state.shopOpen) return;
    let now = Date.now();
    let weapon = WEAPONS[state.currentWeapon];
    let realCooldown = weapon.cooldown / player.stats.reloadSpeed;
    
    if (now - state.lastShotTime < realCooldown) return;
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
        if (isPlayer) { let dist = Math.hypot(e.x - x, drawY - y); if (dist < size) hit = true; } else { hit = true; } 
        if (hit) {
            e.hp -= dmg; 
            AudioMgr.playThud(); 
    if (e.hp <= 0) {
    spawnExplosion(e.x, drawY, e.color);
    state.enemies.splice(i, 1);
    
    // Stats Update
    player.totalKills = (player.totalKills || 0) + 1;
    player.xp += e.xpValue;
    state.gold += 10;
    
    spawnFloatingText(`+${e.xpValue}XP`, e.x, drawY - 20, "#0ff");

    // --- FIX IS HERE ---
    // Use the ID we added to enemies.js
    let enemyId = e.id || 'imp'; 
    player.bestiary[enemyId] = (player.bestiary[enemyId] || 0) + 1;
    // -------------------

    saveGame();
}
            hitCount++;
            if (!piercing) break; 
            if (piercing && hitCount >= 3) break; 
        }
    }
}

function checkTargetLock(aimX, aimY, scopeRadius) {
    state.targetLocked = false;
    for (let i = 0; i < state.enemies.length; i++) {
        let e = state.enemies[i];
        if (e.view !== state.directions[state.dirIndex]) continue;
        let drawY = e.y + ((100 - e.distance) * (canvas.height/300));
        let dist = Math.hypot(e.x - aimX, drawY - aimY);
        if (dist < scopeRadius * 0.95) { state.targetLocked = true; return; }
    }
}

function fireTurrets() {
    state.directions.forEach(dir => {
        if (state.turrets[dir]) {
            let target = null;
            let maxDist = 0;
            state.enemies.forEach(e => {
                if (e.view === dir && e.distance > maxDist && e.distance < 25) { target = e; maxDist = e.distance; }
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
function openShop() { state.shopOpen = true; document.getElementById('shop-overlay').style.display = 'flex'; const btn = document.getElementById('btn-damage'); if(btn) btn.innerText = `${COST_DAMAGE} XP`; const currentDir = state.directions[state.dirIndex]; if (currentDir === state.castleDir) { state.castleProgress++; spawnFloatingText("PROGRESS!", renderer.width/2, renderer.height/2, "yellow"); } updateShopButtons(); updateWeaponUI(); window.switchTab('weapons'); }
function updateWeaponUI() { if (!player.unlockedWeapons) return; player.unlockedWeapons.forEach(id => { const el = document.getElementById(`slot-${id}`); if(el) el.classList.remove('locked'); }); if(player.unlockedWeapons.includes('shotgun')) document.getElementById('shop-shotgun').style.display = 'none'; if(player.unlockedWeapons.includes('sniper')) document.getElementById('shop-sniper').style.display = 'none'; }
function updateShopButtons() { ['N','E','S','W'].forEach(dir => { const btn = document.getElementById(`btn-turret-${dir}`); if(btn) { if (state.turrets[dir]) { btn.innerText = "OWNED"; btn.className = "turret-btn owned"; } else { btn.innerText = dir; btn.className = "turret-btn"; } } }); }
function updateNavLabels() { let cur = state.directions[state.dirIndex]; const getIcon = (dir) => state.turrets[dir] ? "🤖" : ""; document.getElementById('current-dir').innerHTML = cur + (state.turrets[cur] ? " <span style='font-size:20px'>🤖</span>" : ""); const leftIndex = (state.dirIndex + 3) % 4; const rightIndex = (state.dirIndex + 1) % 4; const backIndex = (state.dirIndex + 2) % 4; document.getElementById('nav-left').innerText = state.directions[leftIndex] + getIcon(state.directions[leftIndex]); document.getElementById('nav-right').innerText = state.directions[rightIndex] + getIcon(state.directions[rightIndex]); document.getElementById('nav-down').innerText = state.directions[backIndex] + getIcon(state.directions[backIndex]); }
function saveGame() { player.highWave = Math.max(player.highWave, state.wave); Storage.save(player); }
function triggerDamageFeedback(enemyDir) { renderer.triggerDamageFlash(); let diff = state.directions.indexOf(enemyDir) - state.dirIndex; if (diff === -3) diff = 1; if (diff === 3) diff = -1; let el = null; if (diff === 1) el = document.getElementById('danger-right'); else if (diff === -1) el = document.getElementById('danger-left'); else if (Math.abs(diff) === 2) el = document.getElementById('danger-behind'); if(el) { el.style.opacity = 1.0; el.style.transition = 'none'; setTimeout(() => el.style.transition = 'opacity 0.2s', 50); } }

// --- MAIN LOOP ---
let lastTime = 0;
let spawnTimer = 1500; // Start fast
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    renderer.clear();
    
    // Draw Environment (New!)
    const currentDir = state.directions[state.dirIndex];
    renderer.drawEnvironment(currentDir, state.castleProgress, state.castleDir);

    const isPaused = state.shopOpen || state.storyOpen || !state.gameStarted;
    const actions = input.update();
    
    if (!isPaused) {
        if (actions.turn !== 0) turn(actions.turn);
        if (actions.fire) shoot();

        if (state.waveActive) {
            if (state.enemiesSpawned < state.enemiesToSpawn) {
                spawnTimer += dt;
                if (spawnTimer > spawnRate) {
                    state.enemies.push(new Enemy(renderer.width, renderer.height, state.wave));
                    state.enemiesSpawned++;
                    spawnTimer = 0;
                    spawnRate = Math.max(500, 2000 - (state.wave * 100)); 
                }
            } else if (state.enemies.length === 0) { state.waveActive = false; openShop(); }
            state.turretTimer += dt;
            if (state.turretTimer > 2000) { fireTurrets(); state.turretTimer = 0; }
        }

        // MEDIC LOGIC: Heal nearby enemies every 1s
        state.enemies.forEach(e => {
            if (e.isMedic) {
                e.healTimer += dt;
                if (e.healTimer > 1000) {
                    e.healTimer = 0;
                    // Heal neighbors
                    state.enemies.forEach(other => {
                        if (e !== other && Math.abs(e.x - other.x) < 100 && other.view === e.view) {
                            other.hp = Math.min(other.maxHp, other.hp + 1);
                            // Visual Pulse
                            spawnFloatingText("❤️", other.x, 100, "pink");
                        }
                    });
                }
            }
        });

        let weapon = WEAPONS[state.currentWeapon];
        let timeSinceShot = Date.now() - state.lastShotTime;
        let cooldownPct = 0;
        if (timeSinceShot < weapon.cooldown) { cooldownPct = 1 - (timeSinceShot / weapon.cooldown); }
        document.getElementById('weapon-cooldown').style.height = (cooldownPct * 100) + '%';

        state.enemies.sort((a, b) => b.distance - a.distance);
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let e = state.enemies[i];
            e.update();
            if (e.distance <= 0) {
                let enemyDir = e.view;
                let currentDir = state.directions[state.dirIndex];
                state.towerHp -= 10;
                triggerDamageFeedback(enemyDir); 
                if (enemyDir !== currentDir) state.playerHp -= 10; 
                state.enemies.splice(i, 1);
                if (state.towerHp <= 0 || state.playerHp <= 0) state.gameOver = true;
            }
        }
    }

    if (state.gameOver) { renderer.drawGameOver(state.towerHp <= 0); return; }

    // RENDER ORDER
    // 1. Draw Enemies (Behind Darkness)
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (e.view === state.directions[state.dirIndex]) { e.draw(ctx, renderer.width, renderer.height); }
    }

    const aim = input.getAim();
    const weaponScale = WEAPONS[state.currentWeapon].scopeScale || 1.0;
    const scopeRadius = player.stats.scopeSize * weaponScale; 
    
    if (state.recoilY > 0) state.recoilY *= 0.8; 

    // 2. Draw Darkness (Hides enemies outside scope)
    renderer.drawDarkness(aim.x, aim.y, scopeRadius, state.recoilY, player.stats.lightLevel);

    // 3. Draw Yellow Guides
    renderer.drawEnemyGuides(state.enemies, state.dirIndex, state.directions, aim, scopeRadius);

    // 4. Draw Scope UI
    checkTargetLock(aim.x, aim.y, renderer.height * 0.17 * scopeRadius); 
    renderer.drawScopeUI(aim.x, aim.y, scopeRadius, state.recoilY, state.targetLocked);

    renderer.drawParticles(state.particles);
    renderer.updateIndicators(state.enemies, state.dirIndex, state.directions);
    updateGameUI(); 

    requestAnimationFrame(gameLoop);
}

updateWeaponUI();
updateNavLabels();
requestAnimationFrame(gameLoop);
