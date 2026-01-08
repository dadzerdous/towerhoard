import { Enemy } from './enemies.js';
import { InputHandler } from './input.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Config - DYNAMIC SIZE
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// Handle window resizing
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
});

// State
let state = {
    score: 0,
    hp: 100,
    wave: 1,
    enemies: [],
    dirIndex: 0, 
    directions: ['N', 'E', 'S', 'W'],
    guns: []
};

// Load Guns Data
fetch('./data/guns.json')
    .then(response => response.json())
    .then(data => {
        state.guns = data;
    });

// Init Input
const input = new InputHandler(canvas);

// Navigation Logic
document.getElementById('nav-left').addEventListener('click', () => turn(-1));
document.getElementById('nav-right').addEventListener('click', () => turn(1));

// SHOOTING LOGIC
// We separate "Tap" from "Drag". 
// If mouse clicks, shoot. If touch ends quickly without much drag, shoot.
canvas.addEventListener('mousedown', shoot); 
canvas.addEventListener('touchend', shoot); 

function turn(dir) {
    state.dirIndex += dir;
    if (state.dirIndex < 0) state.dirIndex = 3;
    if (state.dirIndex > 3) state.dirIndex = 0;
    document.getElementById('current-dir').innerText = state.directions[state.dirIndex];
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,width,height);
}

function shoot(e) {
    // Prevent shooting if we just finished a long drag (optional, but good for UX)
    // For now, let's keep it simple: any click/lift fires.
    
    const aim = input.getAim();
    
    // Muzzle Flash
    ctx.fillStyle = "rgba(255, 255, 220, 0.4)";
    ctx.fillRect(0, 0, width, height);

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (e.view !== state.directions[state.dirIndex]) continue;

        let scale = (100 - e.distance) / 10;
        let drawY = e.y + ((100 - e.distance) * (height/300));
        let size = 30 * scale; // Hitbox size
        
        let dist = Math.hypot(e.x - aim.x, drawY - aim.y);

        if (dist < size) {
            e.hp--; 
            if (e.hp <= 0) {
                state.enemies.splice(i, 1);
                state.score += 10;
                document.getElementById('scoreVal').innerText = state.score;
            }
            break; 
        }
    }
}

function checkIndicators() {
    let dangerL = false;
    let dangerR = false;
    let dangerB = false;

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

    document.getElementById('danger-left').style.opacity = dangerL ? 0.6 : 0;
    document.getElementById('danger-right').style.opacity = dangerR ? 0.6 : 0;
    document.getElementById('danger-behind').style.opacity = dangerB ? 0.6 : 0;
}

let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 2000;

function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // 1. Clear & Background
    ctx.fillStyle = "#020502"; // Very dark green/black
    ctx.fillRect(0, 0, width, height);

    // 2. Horizon
    ctx.strokeStyle = '#003300';
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

        if (e.view === state.directions[state.dirIndex]) {
            e.draw(ctx, width, height);
        }
    }

    checkIndicators();

    // 5. Scope Overlay (Vignette)
    const aim = input.getAim();
    // Scope size adjusts to screen height
    let scopeRadius = height * 0.35; 
    
    let gradient = ctx.createRadialGradient(aim.x, aim.y, scopeRadius * 0.4, aim.x, aim.y, scopeRadius);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(0.9, "black");
    gradient.addColorStop(1, "black");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,width,height);

    // 6. Crosshair (Smaller & Cleaner)
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Tiny center circle
    ctx.arc(aim.x, aim.y, 8, 0, Math.PI*2);
    // Cross lines
    ctx.moveTo(aim.x - 15, aim.y); ctx.lineTo(aim.x + 15, aim.y);
    ctx.moveTo(aim.x, aim.y - 15); ctx.lineTo(aim.x, aim.y + 15);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
