const shootSound = new Audio('./assets/sounds/shoot.wav');
shootSound.volume = 0.4;

export const AudioMgr = {
    playShoot: () => {
        // Clone allows rapid fire overlapping
        const s = shootSound.cloneNode(); 
        s.volume = 0.4;
        s.play().catch(e => {});
    }
};
