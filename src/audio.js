const shootSound = new Audio('./assets/sounds/shoot.wav');
shootSound.volume = 0.4;

const selectSound = new Audio('./assets/sounds/select.ogg');
selectSound.volume = 0.6;

const thudSound = new Audio('./assets/sounds/thud.ogg');
thudSound.volume = 0.9; // BOOSTED to 90%

export const AudioMgr = {
    playShoot: () => {
        const s = shootSound.cloneNode(); 
        s.volume = 0.4;
        s.play().catch(e => {});
    },
    playSelect: () => {
        const s = selectSound.cloneNode();
        s.volume = 0.6;
        s.play().catch(e => {});
    },
    playThud: () => {
        const s = thudSound.cloneNode();
        s.volume = 0.9; // BOOSTED
        s.play().catch(e => {});
    }
};
