const suggestCategory = (text) => {
    const content = text.toLowerCase();
    
    const keywords = {
        'Electricity': [
            'fan', 'light', 'bulb', 'switch', 'current', 'wire', 'short circuit', 
            'socket', 'plug', 'power', 'ac', 'projector', 'computer', 'lab', 'ups'
        ],
        'Water': [
            'tap', 'leak', 'drain', 'overflow', 'plumbing', 'shower', 'sink', 
            'tank', 'ro', 'filter', 'toilet', 'washroom'
        ],
        'Internet': [
            'wifi', 'router', 'connection', 'slow', 'bandwidth', 'ethernet', 
            'login', 'network', 'cable', 'portal'
        ],
        'Furniture': [
            'desk', 'bench', 'chair', 'table', 'whiteboard', 'door', 'window', 
            'lock', 'handle', 'drawer', 'cupboard'
        ],
        'Hygiene': [
            'dirty', 'smell', 'dust', 'cleaning', 'garbage', 'bin', 'insect', 
            'pest', 'litter'
        ]
    };

    for (const [category, words] of Object.entries(keywords)) {
        if (words.some(word => content.includes(word))) {
            return category;
        }
    }

    return 'Other';
};

module.exports = { suggestCategory };
