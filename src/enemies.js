// Enemy Configuration
const ENEMY_TYPES = [
    { 
        id: 'imp', symbol: '👿', hp: 1, speed: 0.6, 
        size: 0.8, // Smaller than normal
        flyHeight: 0, // Walks on ground
        minWave: 1, // Can spawn from Wave 1
        xp: 5 
    },
    { 
        id: 'zombie', symbol: '🧟', hp: 2, speed: 0.25, 
        size: 1.0, 
        flyHeight: 0, 
        minWave: 1, 
        xp: 10 
    },
    { 
        id: 'ghost', symbol: '👻', hp: 2, speed: 0.35, 
        size: 1.0, 
        flyHeight: 40, // Hovers 40px in the air!
        minWave: 3, 
        xp: 15 
    },
    { 
        id: 'ogre', symbol: '👹', hp: 5, speed: 0.15, 
        size: 1.5, // 1.5x bigger
        flyHeight: 0, 
        minWave: 4, 
        xp: 25 
    },
    { 
        id: 'golem', symbol: '🗿', hp: 10, speed: 0.1, 
        size: 1.8, // Huge
        flyHeight: 0, 
        minWave: 6, 
        xp: 50 
    },
    { 
        id: 'dragon', symbol: '🐉', hp: 20, speed: 0.15, 
        size: 2.2, // Massive Boss
        flyHeight: 80, // Flies high
        minWave: 10, 
        xp: 200 
    }
];

export class Enemy {
    constructor(width, height, wave) {
        // 1. Filter enemies allowed in this wave
        const allowedTypes = ENEMY_TYPES.filter(t => wave >= t.minWave);
        
        // 2. Pick a random type from the allowed list
        // (Logic: Higher waves have a higher chance of stronger enemies)
        const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

        // 3. Set Properties
        this.symbol = type.symbol;
        this.maxHp = type.hp + Math.floor(wave / 5); // HP scales slightly with waves
        this.hp = this.maxHp;
        this.baseSpeed = type.speed;
        this.sizeMult = type.size;
        this.flyHeight = type.flyHeight;
        this.xpValue = type.xp;

        // Position Logic
        this.possibleViews = ['N', 'E', 'S', 'W'];
        this.viewIndex = Math.floor(Math.random() * 4);
        this.view = this.possibleViews[this.viewIndex];

        this.x = Math.random() * width;
        this.y = height / 2; 
        this.distance = 100; // 100% away
        
        // Speed increases slightly every wave
        this.speed = this.baseSpeed + (wave * 0.02);
    }

    update() {
        this.distance -= this.speed;
    }

    draw(ctx, width, height) {
        let scale = (100 - this.distance) / 10; 
        if (scale < 0) scale = 0;
        
        // Apply Fly Height (Simulated 3D height)
        // We subtract flyHeight scaled by distance to make it look like they are above the floor
        let drawY = (this.y - (this.flyHeight * scale * 0.1)) + ((100 - this.distance) * (height/300)); 
        
        // Apply Size Multiplier
        let fontSize = 25 * scale * this.sizeMult;
        
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillText(this.symbol, this.x, drawY);

        // HP Bar (Adjusted for size)
        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            let barWidth = 20 * scale * this.sizeMult;
            let barHeight = 3 * scale;
            ctx.fillRect(this.x - (barWidth/2), drawY - (fontSize/2) - 10, barWidth * (this.hp/this.maxHp), barHeight);
        }
    }
}
