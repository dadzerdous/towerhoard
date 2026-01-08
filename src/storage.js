export const Storage = {
    save: (data) => {
        localStorage.setItem('sniper_defense_save', JSON.stringify(data));
    },
    
    load: () => {
        const data = localStorage.getItem('sniper_defense_save');
        return data ? JSON.parse(data) : null;
    },

    reset: () => {
        localStorage.removeItem('sniper_defense_save');
        location.reload();
    }
};
