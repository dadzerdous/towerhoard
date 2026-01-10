export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
        this.damageFlashTimer = 0;
    }

    resize(w, h) {
        this.width = w; this.height = h;
        this.canvas.width = w; this.canvas.height = h;
        this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    }

    triggerDamageFlash() { this.damageFlashTimer = 1.0; }

    clear() {
        this.ctx.fillStyle = "#222"; this.ctx.fillRect(0, 0, this.width, this.height / 2);
        this.ctx.fillStyle = "#000"; this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
        this.ctx.strokeStyle = '#444'; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.moveTo(0, this.height/2); this.ctx.lineTo(this.width, this.height/2);
        this.ctx.stroke();
    }

    drawCastle(progress, isActiveDirection) {
        // FIX: Removed "progress === 0" check so you can see it immediately
        if (!isActiveDirection) return;

        const cx = this.width / 2;
        const cy = this.height / 2;
        
        // Progress 0 = Foundation (Small Box)
        const size = 10 + (progress * 15); 
        
        this.ctx.save();
        this.ctx.fillStyle = "#111"; 
        this.ctx.strokeStyle = "#333";
        
        this.ctx.beginPath();
        if (progress < 1) {
            // Foundation (Wave 1)
            this.ctx.fillRect(cx - 10, cy - 10, 20, 10);
        } else if (progress < 3) {
            // House
            this.ctx.fillRect(cx - size/2, cy - size, size, size);
            this.ctx.moveTo(cx - size/2, cy - size);
            this.ctx.lineTo(cx, cy - size - (size/2));
            this.ctx.lineTo(cx + size/2, cy - size);
        } else {
            // Castle
            this.ctx.fillRect(cx - size, cy - size/2, size*2, size/2); 
            this.ctx.fillRect(cx - size, cy - size, size/3, size); 
            this.ctx.fillRect(cx + size*0.66, cy - size, size/3, size); 
        }
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.restore();
    }

    // STEP 1: Draw the Black Overlay (Hides Enemies)
    drawDarkness(aimX, aimY, scopeSize, recoilY) {
        const radius = (this.height * 0.17) * scopeSize;
        const rx = aimX; const ry = aimY - recoilY; 

        this.ctx.save();
        this.ctx.beginPath(); 
        this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2, true); // Cut hole
        this.ctx.clip();
        
        this.ctx.fillStyle = "#000"; 
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.damageFlashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlashTimer * 0.3})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.damageFlashTimer -= 0.05; 
        }
        this.ctx.restore();
    }

    // STEP 2: Draw Yellow Guides (On top of darkness)
    drawEnemyGuides(enemies, currentDirIndex, directions, aim, scopeSize) {
        const scopeRadius = (this.height * 0.17) * scopeSize;
        
        this.ctx.save();
        
        // CLIP: Protect the scope circle so lines don't draw inside
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(aim.x, aim.y, scopeRadius, 0, Math.PI*2, true); 
        this.ctx.clip();

        // NEON GLOW
        this.ctx.shadowBlur = 10; 
        this.ctx.shadowColor = "#ffff00"; 

        enemies.forEach(e => {
            // Only draw for enemies in current view
            if (e.view === directions[currentDirIndex] && e.distance > 0) {
                
                // Calculate Position of Enemy Feet
                let drawY = e.y + ((100 - e.distance) * (this.height/300));
                
                // Vector Math: Scope -> Enemy
                let dx = e.x - aim.x;
                let dy = drawY - aim.y;
                let dist = Math.hypot(dx, dy);
                
                // Intensity Calculation (Like Red Indicators)
                // Closer = Brighter & Longer. Farther = Dimmer & Shorter.
                let intensity = 0;
                if (e.distance < 80) intensity = 1 - (e.distance / 80);
                if (intensity < 0) intensity = 0;

                if (intensity > 0) {
                    // Normalize Vector
                    let nx = dx / dist;
                    let ny = dy / dist;

                    // Line Properties
                    let lineLength = 30 + (50 * intensity); // Grows as they get close
                    let startOffset = scopeRadius + 5; // Start just outside rim

                    this.ctx.strokeStyle = `rgba(255, 255, 0, ${intensity})`; 
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    // Start at Scope Edge
                    this.ctx.moveTo(aim.x + (nx * startOffset), aim.y + (ny * startOffset)); 
                    // Point outwards
                    this.ctx.lineTo(aim.x + (nx * (startOffset + lineLength)), aim.y + (ny * (startOffset + lineLength))); 
                    this.ctx.stroke();
                }
            }
        });
        
        this.ctx.restore();
    }

    // STEP 3: Draw Scope UI (Rims & Crosshair)
    drawScopeUI(aimX, aimY, scopeSize, recoilY, isLocked) {
        const radius = (this.height * 0.17) * scopeSize;
        const rx = aimX; const ry = aimY - recoilY; 

        // Outer Rim
        this.ctx.strokeStyle = "#002200"; 
        this.ctx.lineWidth = 10;
        this.ctx.beginPath(); 
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2); 
        this.ctx.stroke();

        // Target Lock Halo (Yellow Rim)
        if (isLocked) {
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = "yellow";
            this.ctx.strokeStyle = "rgba(255, 255, 0, 0.9)"; 
            this.ctx.lineWidth = 6;
            this.ctx.beginPath(); 
            this.ctx.arc(rx, ry, radius + 8, 0, Math.PI*2); 
            this.ctx.stroke();
            this.ctx.restore();
        }

        // Inner Green Line
        this.ctx.strokeStyle = "#0f0"; 
        this.ctx.lineWidth = 1;
        this.ctx.beginPath(); 
        this.ctx.arc(rx, ry, radius - 5, 0, Math.PI*2); 
        this.ctx.stroke();

        // Crosshair (Turns Yellow on Lock)
        this.ctx.strokeStyle = isLocked ? "yellow" : "rgba(255, 0, 0, 0.9)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(rx - 10, ry); this.ctx.lineTo(rx + 10, ry);
        this.ctx.moveTo(rx, ry - 10); this.ctx.lineTo(rx, ry + 10);
        this.ctx.stroke();
    }

    drawParticles(particles) {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.life -= 0.02; p.x += p.vx; p.y += p.vy;
            this.ctx.globalAlpha = Math.max(0, p.life);
            if (p.type === 0) { this.ctx.fillStyle = p.color; this.ctx.font = "bold 20px Arial"; this.ctx.fillText(p.text, p.x, p.y); }
            else { this.ctx.fillStyle = p.color; this.ctx.fillRect(p.x, p.y, 8, 8); }
            this.ctx.globalAlpha = 1.0;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
    
    drawMuzzleFlash() { this.ctx.fillStyle = "rgba(255, 255, 220, 0.3)"; this.ctx.fillRect(0, 0, this.width, this.height); }
    drawGameOver(towerDead) { this.ctx.fillStyle = "red"; this.ctx.font = "40px Courier"; this.ctx.textAlign = "center"; this.ctx.fillText(towerDead ? "TOWER DESTROYED" : "YOU DIED", this.width/2, this.height/2 - 50); document.getElementById('restart-btn').style.display = 'block'; }
    updateUI(player, state, enemiesToSpawn) {
        document.getElementById('lvlVal').innerText = player.level; document.getElementById('xpVal').innerText = player.xp; document.getElementById('scoreVal').innerText = `$${state.gold}`; document.getElementById('waveVal').innerText = state.wave; document.getElementById('towerHpVal').innerText = state.towerHp; document.getElementById('playerHpVal').innerText = state.playerHp;
        let left = (enemiesToSpawn - state.enemiesSpawned) + state.enemies.length; document.getElementById('enemiesLeftVal').innerText = left;
    }
    updateIndicators(enemies, currentDirIndex, directions) {
        let closestL = 0, closestR = 0, closestB = 0;
        enemies.forEach(e => {
            let diff = directions.indexOf(e.view) - currentDirIndex;
            if (diff === -3) diff = 1; if (diff === 3) diff = -1; 
            let danger = (e.distance < 70) ? 1 - (e.distance / 70) : 0;
            if (diff === 1) closestR = Math.max(closestR, danger);
            else if (diff === -1) closestL = Math.max(closestL, danger);
            else if (Math.abs(diff) === 2) closestB = Math.max(closestB, danger);
        });
        let elL = document.getElementById('danger-left'); let elR = document.getElementById('danger-right'); let elB = document.getElementById('danger-behind');
        elL.style.opacity = Math.min(1, parseFloat(elL.style.opacity || 0) * 0.9 + closestL * 0.1); 
        elR.style.opacity = Math.min(1, parseFloat(elR.style.opacity || 0) * 0.9 + closestR * 0.1);
        elB.style.opacity = Math.min(1, parseFloat(elB.style.opacity || 0) * 0.9 + closestB * 0.1);
    }
}
