
import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Config
const width = 375;
const height = 667;
canvas.width = width;
canvas.height = height;

// State
let state = {
    score: 0,
    hp: 100,
    wave: 1,
    enemies: [],
    dirIndex: 0, // 0=N, 1=E, 2=S, 3=W
    directions: ['N', 'E', 'S', 'W'],
    guns: []
};

// Load Guns Data
fetch('./data/guns.json')
    .then(response => response.json())
    .then(data => {
        state.guns = data;
        console.log("Guns loaded:", state.guns);
    });

// Init Input
const input = new InputHandler(canvas, width, height);

// Navigation Logic
document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));
canvas.addEventListener('mousedown', shoot); // Hook up shooting

function turn(dir) {
    state.dirIndex += dir;
    if (state.dirIndex < 0) state.dirIndex = 3;
    if (state.dirIndex > 3) state.dirIndex = 0;
    
    document.getElementById('current-dir').innerText = state.directions[state.dirIndex];
    // Quick flash
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function shoot() {
    const aim = input.getAim();
    
    // Simple flash
    ctx.fillStyle = "rgba(255, 255, 200, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // Hit Logic
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        
        // Must be in current view
        if (e.view !== state.directions[state.dirIndex]) continue;

        // Calculate Hitbox
        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = 25 * scale; 
        
        let dist = Math.hypot(e.x - aim.x, drawY - aim.y);

        if (dist < size) {
            e.hp--; // Use gun damage here later
            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                state.score += 10;
                document.getElementById('scoreVal').innerText = state.score;
            }
            break; 
        }
    }
}

// Indicator Logic
function checkIndicators() {
    let dangerL = false;
    let dangerR = false;
    let dangerB = false;

    state.enemies.forEach(e => {
        if (e.distance > 50) return; 

        // Convert enemy view letter back to index for math
        let enemyViewIndex = state.directions.indexOf(e.view);
        let diff = enemyViewIndex - state.dirIndex;
        
        if (diff === -3) diff = 1; 
        if (diff === 3) diff = -1; 
        
        if (diff === 1) dangerR = true;     
        else if (diff === -1) dangerL = true; 
        else if (Math.abs(diff) === 2) dangerB = true; 
    });

    document.getElementById('danger-left').style.opacity = dangerL ? 0.6 : 0;
    document.getElementById('danger-right').style.opacity = dangerR ? 0.6 : 0;
    document.getElementById('danger-behind').style.opacity = dangerB ? 0.6 : 0;
}

// Main Loop
let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // 1. Clear & Background
    ctx.fillStyle = "#051105";
    ctx.fillRect(0, 0, width, height);

    // 2. Horizon
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

    // 3. Spawn
    spawnTimer += dt;
    if (spawnTimer > spawnRate) {
        state.enemies.push(new Enemy(width, height, state.wave));
        spawnTimer = 0;
        if (spawnRate > 600) spawnRate -= 10;
    }

    // 4. Update & Draw Enemies
    state.enemies.sort((a, b) => b.distance - a.distance);
    
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        e.update();

        if (e.distance <= 0) {
            state.hp -= 10;
            state.enemies.splice(i, 1);
            document.getElementById('hpVal').innerText = state.hp;
            if (state.hp <= 0) {
                alert("GAME OVER");
                location.reload();
            }
        }

        // Draw if in current view
        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, width, height);
        }
    }

    checkIndicators();

    // 5. Scope Overlay
    const aim = input.getAim();
    let gradient = ctx.createRadialGradient(aim.x, aim.y, 100, aim.x, aim.y, 300);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "black");
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,width,height);

    // 6. Crosshair
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 20, 0, Math.PI*2);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
