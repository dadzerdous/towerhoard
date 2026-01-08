export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        // Start in the center of the screen
        this.aimX = window.innerWidth / 2;
        this.aimY = window.innerHeight / 2;
        
        // Touch tracking
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.isDragging = false;

        this.init();
    }

    init() {
        // --- MOUSE (Desktop) ---
        // Mouse stays absolute because that feels better on PC
        this.canvas.addEventListener('mousemove', (e) => {
            this.aimX = e.clientX;
            this.aimY = e.clientY;
        });

        // --- TOUCH (Mobile) ---
        // We use "Relative" movement (Touchpad style)
        
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

            // Calculate how far the finger moved
            const deltaX = touchX - this.lastTouchX;
            const deltaY = touchY - this.lastTouchY;

            // Apply that movement to the aim (Sensitivity 1.2x for faster feeling)
            this.aimX += deltaX * 1.2;
            this.aimY += deltaY * 1.2;

            // Update last pos for next frame
            this.lastTouchX = touchX;
            this.lastTouchY = touchY;

            // Keep aim inside the screen
            this.clampAim();
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
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
