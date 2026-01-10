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
        this.leftPressed = false; // NEW
        this.rightPressed = false; // NEW

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousemove', (e) => { this.aimX = e.clientX; this.aimY = e.clientY; });
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.isDragging = true; this.lastTouchX = e.touches[0].clientX; this.lastTouchY = e.touches[0].clientY; }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!this.isDragging) return; const touchX = e.touches[0].clientX; const touchY = e.touches[0].clientY; this.aimX += (touchX - this.lastTouchX) * 1.2; this.aimY += (touchY - this.lastTouchY) * 1.2; this.lastTouchX = touchX; this.lastTouchY = touchY; this.clampAim(); }, { passive: false });
        this.canvas.addEventListener('touchend', () => { this.isDragging = false; });
        window.addEventListener("gamepadconnected", (e) => { console.log("Gamepad connected:", e.gamepad.id); this.gamepadIndex = e.gamepad.index; });
    }

    update() {
        // Returns object with actions
        let actions = { fire: false, turn: 0 };

        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Aim
                if (Math.abs(gp.axes[0]) > 0.1) this.aimX += gp.axes[0] * 10;
                if (Math.abs(gp.axes[1]) > 0.1) this.aimY += gp.axes[1] * 10;
                this.clampAim();

                // Fire (Triggers or Face Buttons)
                const isFiring = gp.buttons[7].pressed || gp.buttons[0].pressed;
                if (isFiring && !this.firePressed) { this.firePressed = true; actions.fire = true; }
                if (!isFiring) this.firePressed = false;

                // Turn Left (L1 / Button 4)
                const isLeft = gp.buttons[4].pressed;
                if (isLeft && !this.leftPressed) { this.leftPressed = true; actions.turn = -1; }
                if (!isLeft) this.leftPressed = false;

                // Turn Right (R1 / Button 5)
                const isRight = gp.buttons[5].pressed;
                if (isRight && !this.rightPressed) { this.rightPressed = true; actions.turn = 1; }
                if (!isRight) this.rightPressed = false;
            }
        }
        return actions;
    }

    clampAim() {
        if (this.aimX < 0) this.aimX = 0; if (this.aimY < 0) this.aimY = 0;
        if (this.aimX > window.innerWidth) this.aimX = window.innerWidth;
        if (this.aimY > window.innerHeight) this.aimY = window.innerHeight;
    }

    getAim() { return { x: this.aimX, y: this.aimY }; }
}
