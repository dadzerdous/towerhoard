
export class Enemy {
    constructor(width, height, wave) {
        // Random View (N, E, S, W)
        this.possibleViews = ['N', 'E', 'S', 'W'];
        this.viewIndex = Math.floor(Math.random() * 4);
        this.view = this.possibleViews[this.viewIndex];

        this.x = Math.random() * width;
        this.y = height / 2; 
        this.distance = 100; // 100% away
        
        // Difficulty Logic
        this.speed = 0.2 + (wave * 0.05);
        this.type = Math.random() > 0.85 ? 'ogre' : 'zombie';
        this.symbol = this.type === 'ogre' ? '👹' : '🧟';
        this.hp = this.type === 'ogre' ? 3 : 1;
        this.maxHp = this.hp;
    }

    update() {
        this.distance -= this.speed;
    }

    draw(ctx, width, height) {
        let scale = (100 - this.distance) / 10; 
        if (scale < 0) scale = 0;
        
        let drawY = this.y + ((100 - this.distance) * (height/300)); 
        
        ctx.font = `${25 * scale}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillText(this.symbol, this.x, drawY);

        // HP Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x - 10*scale, drawY - 20*scale, 20*scale * (this.hp/this.maxHp), 3*scale);
        }
    }
}
