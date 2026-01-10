const ENEMY_TYPES = [
    { 
        id: 'imp', symbol: '👿', hp: 1, speed: 0.15, 
        size: 0.8, flyHeight: 0, minWave: 1, xp: 5, color: '#f0f' 
    },
    { 
        id: 'zombie', symbol: '🧟', hp: 2, speed: 0.08, 
        size: 1.0, flyHeight: 0, minWave: 1, xp: 10, color: '#0f0'
    },
    { 
        id: 'ghost', symbol: '👻', hp: 2, speed: 0.1, 
        size: 1.0, flyHeight: 40, minWave: 3, xp: 15, color: '#aaf',
        isGhost: true 
    },
    { 
        id: 'medic', symbol: '🧙‍♂️', hp: 3, speed: 0.06, 
        size: 1.1, flyHeight: 0, minWave: 2, xp: 20, color: '#fff',
        isMedic: true // NEW PROPERTY
    },
    { 
        id: 'ogre', symbol: '👹', hp: 5, speed: 0.05, 
        size: 1.5, flyHeight: 0, minWave: 4, xp: 25, color: '#f00'
    },
    { 
        id: 'golem', symbol: '🗿', hp: 10, speed: 0.03, 
        size: 1.8, flyHeight: 0, minWave: 6, xp: 50, color: '#888'
    },
    { 
        id: 'dragon', symbol: '🐉', hp: 20, speed: 0.04, 
        size: 2.2, flyHeight: 80, minWave: 10, xp: 200, color: '#fa0'
    }
];

export class Enemy {
    constructor(width, height, wave) {
        const allowedTypes = ENEMY_TYPES.filter(t => wave >= t.minWave);
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
this.id = type.id;
        this.symbol = type.symbol;
        this.maxHp = type.hp + Math.floor(wave / 5); 
        this.hp = this.maxHp;
        this.baseSpeed = type.speed;
        this.sizeMult = type.size;
        this.flyHeight = type.flyHeight;
        this.xpValue = type.xp;
        this.color = type.color || '#fff';
        this.isGhost = type.isGhost || false;
        this.isMedic = type.isMedic || false;

        this.possibleViews = ['N', 'E', 'S', 'W'];
        this.viewIndex = Math.floor(Math.random() * 4);
        this.view = this.possibleViews[this.viewIndex];

        this.x = Math.random() * width;
        this.y = height / 2; 
        this.distance = 100; 
        this.speed = this.baseSpeed + (wave * 0.015);
        this.animTimer = Math.random() * 100; 
        this.healTimer = 0; // For medics
    }

    update() {
        this.distance -= this.speed;
        this.animTimer += 0.1;
    }

    draw(ctx, width, height) {
        let scale = (100 - this.distance) / 10; 
        if (scale < 0) scale = 0;
        
        let drawY = (this.y - (this.flyHeight * scale * 0.1)) + ((100 - this.distance) * (height/300)); 
        let fontSize = 25 * scale * this.sizeMult;
        
        ctx.save();
        
        if (this.isGhost) ctx.globalAlpha = 0.4 + (Math.sin(this.animTimer) * 0.3);

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20 * (scale / 5); 

        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.symbol, this.x, drawY);

        ctx.restore(); 

        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            let barWidth = 20 * scale * this.sizeMult;
            let barHeight = 3 * scale;
            ctx.fillRect(this.x - (barWidth/2), drawY - (fontSize/2) - 10, barWidth * (this.hp/this.maxHp), barHeight);
        }
    }
}
