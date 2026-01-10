const shootSound = new Audio('./assets/sounds/shoot.wav');
shootSound.volume = 0.4;

// NEW: Load the select sound
const selectSound = new Audio('./assets/sounds/select.ogg');
selectSound.volume = 0.6; // Slightly louder than bg elements

export const AudioMgr = {
    playShoot: () => {
        const s = shootSound.cloneNode(); 
        s.volume = 0.4;
        s.play().catch(e => {});
    },
    // NEW: Play Select
    playSelect: () => {
        const s = selectSound.cloneNode();
        s.volume = 0.6;
        s.play().catch(e => {});
    }
};
