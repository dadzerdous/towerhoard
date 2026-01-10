export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        // FIX: Force CSS to match pixels prevents "Ovals" on mobile
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
    }

    clear() {
        // SKY (Dark Grey)
        this.ctx.fillStyle = "#222"; 
        this.ctx.fillRect(0, 0, this.width, this.height / 2);

        // GROUND (Pitch Black)
        this.ctx.fillStyle = "#000"; 
        this.ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
        
        // Horizon Line
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height/2); 
        this.ctx.lineTo(this.width, this.height/2);
        this.ctx.stroke();
    }

drawScope(aimX, aimY, scopeSize, recoilY, isLocked) {
        const radius = (this.height * 0.22) * scopeSize;
        const rx = aimX;
        const ry = aimY - recoilY; 

        // Draw Scope Mask (Same as before)
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2, true); 
        this.ctx.clip();
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();

        // Scope Rim
        this.ctx.strokeStyle = "#002200"; 
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2);
        this.ctx.stroke();

        // --- NEW: YELLOW LOCK INDICATOR ---
        if (isLocked) {
            this.ctx.strokeStyle = "rgba(255, 255, 0, 0.8)"; // Yellow Glow
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(rx, ry, radius + 8, 0, Math.PI*2); // Outside rim
            this.ctx.stroke();
        }

        // Inner Green Line
        this.ctx.strokeStyle = "#0f0"; 
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(rx, ry, radius - 5, 0, Math.PI*2);
        this.ctx.stroke();

        // Crosshair
        this.ctx.strokeStyle = isLocked ? "yellow" : "rgba(255, 0, 0, 0.9)"; // Turn crosshair yellow too
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(rx - 10, ry); this.ctx.lineTo(rx + 10, ry);
        this.ctx.moveTo(rx, ry - 10); this.ctx.lineTo(rx, ry + 10);
        this.ctx.stroke();
    }

    drawParticles(particles) {
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            
            this.ctx.globalAlpha = Math.max(0, p.life);
            
            if (p.type === 0) { // Text
                this.ctx.fillStyle = p.color;
                this.ctx.font = "bold 20px Arial";
                this.ctx.fillText(p.text, p.x, p.y);
            } else { // Explosion Chunk
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(p.x, p.y, 8, 8);
            }

            this.ctx.globalAlpha = 1.0;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    drawMuzzleFlash() {
        this.ctx.fillStyle = "rgba(255, 255, 220, 0.3)";
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGameOver(towerDead) {
        this.ctx.fillStyle = "red";
        this.ctx.font = "40px Courier";
        this.ctx.textAlign = "center";
        this.ctx.fillText(towerDead ? "TOWER DESTROYED" : "YOU DIED", this.width/2, this.height/2 - 50);
        document.getElementById('restart-btn').style.display = 'block';
    }

    updateUI(player, state, enemiesToSpawn) {
        document.getElementById('lvlVal').innerText = player.level;
        document.getElementById('xpVal').innerText = player.xp;
        document.getElementById('scoreVal').innerText = `$${state.gold}`;
        document.getElementById('waveVal').innerText = state.wave;
        document.getElementById('towerHpVal').innerText = state.towerHp;
        document.getElementById('playerHpVal').innerText = state.playerHp;
        
        let left = (enemiesToSpawn - state.enemiesSpawned) + state.enemies.length;
        document.getElementById('enemiesLeftVal').innerText = left;
    }

    updateIndicators(enemies, currentDirIndex, directions) {
        let closestL = 0, closestR = 0, closestB = 0;
        
        enemies.forEach(e => {
            let diff = directions.indexOf(e.view) - currentDirIndex;
            if (diff === -3) diff = 1; 
            if (diff === 3) diff = -1; 
            
            let danger = (e.distance < 70) ? 1 - (e.distance / 70) : 0;
            
            if (diff === 1) closestR = Math.max(closestR, danger);
            else if (diff === -1) closestL = Math.max(closestL, danger);
            else if (Math.abs(diff) === 2) closestB = Math.max(closestB, danger);
        });

        document.getElementById('danger-left').style.opacity = closestL;
        document.getElementById('danger-right').style.opacity = closestR;
        document.getElementById('danger-behind').style.opacity = closestB;
    }
}
