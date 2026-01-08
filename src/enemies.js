// Enemy Configuration
const ENEMY_TYPES = [
    { 
        id: 'imp', symbol: '👿', hp: 1, speed: 0.3, // Was 0.6
        size: 0.8, 
        flyHeight: 0, 
        minWave: 1, 
        xp: 5 
    },
    { 
        id: 'zombie', symbol: '🧟', hp: 2, speed: 0.15, // Was 0.25
        size: 1.0, 
        flyHeight: 0, 
        minWave: 1, 
        xp: 10 
    },
    { 
        id: 'ghost', symbol: '👻', hp: 2, speed: 0.2, // Was 0.35
        size: 1.0, 
        flyHeight: 40, 
        minWave: 3, 
        xp: 15 
    },
    { 
        id: 'ogre', symbol: '👹', hp: 5, speed: 0.1, // Was 0.15
        size: 1.5, 
        flyHeight: 0, 
        minWave: 4, 
        xp: 25 
    },
    { 
        id: 'golem', symbol: '🗿', hp: 10, speed: 0.05, // Was 0.1
        size: 1.8, 
        flyHeight: 0, 
        minWave: 6, 
        xp: 50 
    },
    { 
        id: 'dragon', symbol: '🐉', hp: 20, speed: 0.08, // Was 0.15
        size: 2.2, 
        flyHeight: 80, 
        minWave: 10, 
        xp: 200 
    }
];

export class Enemy {
    constructor(width, height, wave) {
        const allowedTypes = ENEMY_TYPES.filter(t => wave >= t.minWave);
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

        this.symbol = type.symbol;
        this.maxHp = type.hp + Math.floor(wave / 5); 
        this.hp = this.maxHp;
        this.baseSpeed = type.speed;
        this.sizeMult = type.size;
        this.flyHeight = type.flyHeight;
        this.xpValue = type.xp;

        this.possibleViews = ['N', 'E', 'S', 'W'];
        this.viewIndex = Math.floor(Math.random() * 4);
        this.view = this.possibleViews[this.viewIndex];

        this.x = Math.random() * width;
        this.y = height / 2; 
        this.distance = 100; 
        this.speed = this.baseSpeed + (wave * 0.02);
    }

    update() {
        this.distance -= this.speed;
    }

    draw(ctx, width, height) {
        let scale = (100 - this.distance) / 10; 
        if (scale < 0) scale = 0;
        
        let drawY = (this.y - (this.flyHeight * scale * 0.1)) + ((100 - this.distance) * (height/300)); 
        let fontSize = 25 * scale * this.sizeMult;
        
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillText(this.symbol, this.x, drawY);

        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            let barWidth = 20 * scale * this.sizeMult;
            let barHeight = 3 * scale;
            ctx.fillRect(this.x - (barWidth/2), drawY - (fontSize/2) - 10, barWidth * (this.hp/this.maxHp), barHeight);
        }
    }
}
