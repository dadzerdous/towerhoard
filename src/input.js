export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.aimX = window.innerWidth / 2;
        this.aimY = window.innerHeight / 2;
        
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.isDragging = false;
        
        // GAMEPAD STATE
        this.gamepadIndex = null;
        this.firePressed = false;

        this.init();
    }

    init() {
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            this.aimX = e.clientX;
            this.aimY = e.clientY;
        });

        // Touch
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isDragging) return;
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            this.aimX += (touchX - this.lastTouchX) * 1.2;
            this.aimY += (touchY - this.lastTouchY) * 1.2;
            this.lastTouchX = touchX;
            this.lastTouchY = touchY;
            this.clampAim();
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // Gamepad Connection
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected:", e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
        });
    }

    // Call this every frame in game.js
    update() {
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Left Stick (Axes 0, 1)
                if (Math.abs(gp.axes[0]) > 0.1) this.aimX += gp.axes[0] * 10;
                if (Math.abs(gp.axes[1]) > 0.1) this.aimY += gp.axes[1] * 10;
                
                // Right Trigger (Button 7) or A Button (Button 0)
                // We track pressed state to avoid machine-gunning instantly
                const isFiring = gp.buttons[7].pressed || gp.buttons[0].pressed;
                
                // Simple latch: returns true only on the frame it is pressed
                if (isFiring && !this.firePressed) {
                    this.firePressed = true;
                    return true; // SIGNAL TO SHOOT
                }
                if (!isFiring) this.firePressed = false;
                
                this.clampAim();
            }
        }
        return false;
    }

    clampAim() {
        if (this.aimX < 0) this.aimX = 0;
        if (this.aimY < 0) this.aimY = 0;
        if (this.aimX > window.innerWidth) this.aimX = window.innerWidth;
        if (this.aimY > window.innerHeight) this.aimY = window.innerHeight;
    }

    getAim() {
        return { x: this.aimX, y: this.aimY };
    }
}
