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
        if (!isActiveDirection || progress === 0) return;
        const cx = this.width / 2; const cy = this.height / 2;
        const size = 10 + (progress * 15); 
        this.ctx.save();
        this.ctx.fillStyle = "#111"; this.ctx.strokeStyle = "#333";
        this.ctx.beginPath();
        if (progress < 3) {
            this.ctx.fillRect(cx - size/2, cy - size, size, size);
            this.ctx.moveTo(cx - size/2, cy - size); this.ctx.lineTo(cx, cy - size - (size/2)); this.ctx.lineTo(cx + size/2, cy - size);
        } else {
            this.ctx.fillRect(cx - size, cy - size/2, size*2, size/2); 
            this.ctx.fillRect(cx - size, cy - size, size/3, size); 
            this.ctx.fillRect(cx + size*0.66, cy - size, size/3, size); 
        }
        this.ctx.stroke(); this.ctx.fill();
        this.ctx.restore();
    }

    // UPDATED: 0.17 Size
    drawScope(aimX, aimY, scopeSize, recoilY, isLocked) {
        const radius = (this.height * 0.17) * scopeSize; // SMALLER
        const rx = aimX; const ry = aimY - recoilY; 

        this.ctx.save();
        this.ctx.beginPath(); this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(rx, ry, radius, 0, Math.PI*2, true); 
        this.ctx.clip();
        
        this.ctx.fillStyle = "#000"; this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.damageFlashTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlashTimer * 0.3})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.damageFlashTimer -= 0.05; 
        }
        this.ctx.restore();

        this.ctx.strokeStyle = "#002200"; this.ctx.lineWidth = 10;
        this.ctx.beginPath(); this.ctx.arc(rx, ry, radius, 0, Math.PI*2); this.ctx.stroke();

        if (isLocked) {
            this.ctx.strokeStyle = "rgba(255, 255, 0, 0.8)"; this.ctx.lineWidth = 4;
            this.ctx.beginPath(); this.ctx.arc(rx, ry, radius + 8, 0, Math.PI*2); this.ctx.stroke();
        }

        this.ctx.strokeStyle = "#0f0"; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.arc(rx, ry, radius - 5, 0, Math.PI*2); this.ctx.stroke();

        this.ctx.strokeStyle = isLocked ? "yellow" : "rgba(255, 0, 0, 0.9)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(rx - 10, ry); this.ctx.lineTo(rx + 10, ry);
        this.ctx.moveTo(rx, ry - 10); this.ctx.lineTo(rx, ry + 10);
        this.ctx.stroke();
    }

    drawEnemyGuides(enemies, currentDirIndex, directions, aim, scopeSize) {
        const radius = (this.height * 0.17) * scopeSize; // SMALLER
        this.ctx.save();
        this.ctx.beginPath(); this.ctx.rect(0, 0, this.width, this.height); 
        this.ctx.arc(aim.x, aim.y, radius, 0, Math.PI*2, true); 
        this.ctx.clip();

        this.ctx.shadowBlur = 15; this.ctx.shadowColor = "yellow";

        enemies.forEach(e => {
            if (e.view === directions[currentDirIndex] && e.distance > 0) {
                let scale = (100 - e.distance) / 10;
                let drawY = e.y + ((100 - e.distance) * (this.height/300));
                this.ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"; this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.moveTo(this.width / 2, this.height); 
                this.ctx.lineTo(e.x, drawY + 20); this.ctx.stroke();
            }
        });
        this.ctx.restore();
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
