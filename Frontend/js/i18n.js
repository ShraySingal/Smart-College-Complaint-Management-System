const translations = {
    en: {
        "nav.logout": "Logout",
        "tab.complaints": "Complaints",
        "tab.users": "User Management",
        "tab.analytics": "Analytics",
        "tab.logs": "System Logs",
        "btn.new_complaint": "New Complaint",
        "btn.export": "Export",
        "btn.filter": "Filter",
        "table.title": "Title",
        "table.category": "Category",
        "table.status": "Status",
        "table.date": "Date",
        "table.actions": "Actions",
        "stats.total": "Total Complaints",
        "stats.pending": "Pending",
        "stats.resolved": "Resolved",
        "stats.overdue": "Overdue"
    },
    hi: {
        "nav.logout": "लॉग आउट",
        "tab.complaints": "शिकायतें",
        "tab.users": "उपयोगकर्ता प्रबंधन",
        "tab.analytics": "एनालिटिक्स",
        "tab.logs": "सिस्टम लॉग",
        "btn.new_complaint": "नई शिकायत",
        "btn.export": "निर्यात",
        "btn.filter": "फ़िल्टर",
        "table.title": "शीर्षक",
        "table.category": "श्रेणी",
        "table.status": "स्थिति",
        "table.date": "तारीख",
        "table.actions": "क्रियाएँ",
        "stats.total": "कुल शिकायतें",
        "stats.pending": "लंबित",
        "stats.resolved": "हल हो गई",
        "stats.overdue": "अतिदेय"
    }
};

function changeLanguage(lang) {
    localStorage.setItem('preferred_language', lang);
    applyTranslations(lang);
}

function applyTranslations(lang) {
    const dict = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = dict[key];
            } else {
                // If it has FontAwesome icon inside, preserve it
                const icon = el.querySelector('i');
                if (icon) {
                    el.innerHTML = '';
                    el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + dict[key]));
                } else {
                    el.textContent = dict[key];
                }
            }
        }
    });

    // Update language select dropdown to match
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferred_language') || 'en';
    applyTranslations(savedLang);
});
