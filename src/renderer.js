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
        // Sky
        this.ctx.fillStyle = "#1a1a1a"; 
        this.ctx.fillRect(0, 0, this.width, this.height / 2);
        // Ground
        this.ctx.fillStyle = "#050505"; 
        this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
        
        this.ctx.strokeStyle = '#333'; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.moveTo(0, this.height/2); this.ctx.lineTo(this.width, this.height/2);
        this.ctx.stroke();
    }

    // NEW: Draw distinctive landmarks per direction
    drawEnvironment(dir, castleProgress, castleDir) {
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        this.ctx.save();
        this.ctx.fillStyle = "#0a0a0a"; // Silhouette color (Darker than sky, lighter than ground)
        
        if (dir === castleDir) {
            // --- CASTLE (Goal) ---
            const size = 15 + (castleProgress * 20); 
            this.ctx.beginPath();
            if (castleProgress < 1) {
                this.ctx.fillRect(cx - 15, cy - 10, 30, 10);
            } else if (castleProgress < 3) {
                this.ctx.fillRect(cx - size/2, cy - size, size, size);
                this.ctx.moveTo(cx - size/2, cy - size); this.ctx.lineTo(cx, cy - size - (size/2)); this.ctx.lineTo(cx + size/2, cy - size);
            } else {
                this.ctx.fillRect(cx - size, cy - size/2, size*2, size/2); 
                this.ctx.fillRect(cx - size, cy - size, size/3, size); 
                this.ctx.fillRect(cx + size*0.66, cy - size, size/3, size); 
            }
            this.ctx.fill();
        } 
        else if (dir === 'E') {
            // --- FOREST (East) ---
            // Draw simple pine trees
            this.ctx.beginPath();
            [ -100, -40, 20, 90 ].forEach(offset => {
                let h = 40 + (Math.random() * 20); // Random height variance visual
                let x = cx + offset;
                this.ctx.moveTo(x, cy);
                this.ctx.lineTo(x - 10, cy);
                this.ctx.lineTo(x, cy - h);
                this.ctx.lineTo(x + 10, cy);
                this.ctx.lineTo(x, cy);
            });
            this.ctx.fill();
        }
        else if (dir === 'W') {
            // --- MOUNTAINS (West) ---
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 200, cy);
            this.ctx.lineTo(cx - 100, cy - 60);
            this.ctx.lineTo(cx, cy);
            this.ctx.lineTo(cx + 80, cy - 90);
            this.ctx.lineTo(cx + 200, cy);
            this.ctx.fill();
        }
        else if (dir === 'S') {
            // --- GRAVEYARD (South) ---
            // Small tombstones
            [ -80, -20, 50, 120 ].forEach(offset => {
                let x = cx + offset;
                this.ctx.fillRect(x, cy - 15, 10, 15); // Stone
                this.ctx.fillRect(x - 5, cy - 25, 20, 5); // Cross bar? Or just boxy stones
                // Cross shape
                this.ctx.fillRect(x + 2, cy - 30, 6, 30);
                this.ctx.fillRect(x - 5, cy - 20, 20, 6);
            });
        }

        this.ctx.restore();
    }

drawDarkness(x, y, radius, recoil, lightLevel = 0) {
    this.ctx.save();
    
    // 1. Define the Shape: A screen-sized rectangle...
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.width, this.height);
    
    // 2. ...minus the Scope Circle (drawn counter-clockwise to create a hole)
    // The 'true' at the end is vital—it reverses the drawing direction
    this.ctx.arc(x, y - recoil, radius, 0, Math.PI * 2, true);
    
    // 3. Fill the shape. The "hole" will remain transparent, showing the game world.
    this.ctx.fillStyle = "black";
    this.ctx.fill();

    // 4. Draw the Flashlight Tint (If unlocked)
    if (lightLevel > 0) {
        let lightRadius = radius + (lightLevel * 60);
        
        this.ctx.beginPath();
        // Outer edge of flashlight (Clockwise)
        this.ctx.arc(x, y - recoil, lightRadius, 0, Math.PI * 2, false);
        // Inner edge of flashlight (Counter-Clockwise hole)
        this.ctx.arc(x, y - recoil, radius, 0, Math.PI * 2, true);
        
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; // Dim gray
        this.ctx.fill();
    }

    this.ctx.restore();
}

drawEnemyGuides(enemies, currentDirIndex, directions, aim, radius) {
        // REMOVED: const scopeRadius = (this.height * 0.17) * scopeSize;
        // The 'radius' passed in is already the correct size in pixels.
        
        this.ctx.save();
        this.ctx.beginPath(); 
        
        // Create the "Hole" clipping mask (Everything BUT the circle)
        this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(aim.x, aim.y, radius, 0, Math.PI*2, true); 
        this.ctx.clip(); 

        this.ctx.shadowBlur = 10; this.ctx.shadowColor = "#ffff00"; 

        enemies.forEach(e => {
            if (e.view === directions[currentDirIndex] && e.distance > 0) {
                let drawY = e.y + ((100 - e.distance) * (this.height/300));
                let dx = e.x - aim.x;
                let dy = drawY - aim.y;
                let distToCenter = Math.hypot(dx, dy);

                if (distToCenter < radius * 1.1) return; // Hide if in scope

                let intensity = 0;
                if (e.distance < 100) intensity = 1 - (e.distance / 100);
                intensity = Math.pow(intensity, 2); 

                if (intensity > 0.05) {
                    let nx = dx / distToCenter;
                    let ny = dy / distToCenter;
                    let lineLength = 10 + (80 * intensity); 
                    let startOffset = radius + 5; 

                    this.ctx.strokeStyle = `rgba(255, 255, 0, ${intensity})`; 
                    this.ctx.lineWidth = 2 + (2 * intensity); 
                    this.ctx.beginPath();
                    this.ctx.moveTo(aim.x + (nx * startOffset), aim.y + (ny * startOffset)); 
                    this.ctx.lineTo(aim.x + (nx * (startOffset + lineLength)), aim.y + (ny * (startOffset + lineLength))); 
                    this.ctx.stroke();
                }
            }
        });
        this.ctx.restore();
    }

drawScopeUI(aimX, aimY, radius, recoilY, isLocked) {
        // REMOVED: const radius = (this.height * 0.17) * scopeSize;
        // Use 'radius' directly from arguments
        
        const rx = aimX; 
        const ry = aimY - recoilY; 

        // 1. Thick Green Ring
        this.ctx.strokeStyle = "#002200"; 
        this.ctx.lineWidth = 10;
        this.ctx.beginPath(); 
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2); 
        this.ctx.stroke();

        // 2. Lock-on Highlight (Yellow Outer Glow)
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

        // 3. Thin Inner Ring
        this.ctx.strokeStyle = "#0f0"; 
        this.ctx.lineWidth = 1;
        this.ctx.beginPath(); 
        this.ctx.arc(rx, ry, radius - 5, 0, Math.PI*2); 
        this.ctx.stroke();

        // 4. Crosshairs
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
