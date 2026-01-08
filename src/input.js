
export class InputHandler {
    constructor(canvas, width, height) {
        this.aimX = width / 2;
        this.aimY = height / 2;
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        
        this.init();
    }

    init() {
        // Mouse Move
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.aimX = (e.clientX - rect.left) * (this.width / rect.width);
            this.aimY = (e.clientY - rect.top) * (this.height / rect.height);
        });

        // Touch Move (prevent scrolling)
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.aimX = (e.touches[0].clientX - rect.left) * (this.width / rect.width);
            this.aimY = (e.touches[0].clientY - rect.top) * (this.height / rect.height);
        }, { passive: false });
    }

    getAim() {
        return { x: this.aimX, y: this.aimY };
    }
}
