export const translations = {
  ru: {
    "rules_badge": "Правила и политики",
    "rules_title": "Условия использования",
    "rules_subtitle": "Ознакомьтесь с правилами предоставления услуг, политиками и рекомендациями.",
    "rules_section_title": "Пользовательское соглашение",
    "rules_placeholder": "Содержимое условий использования в данный момент обновляется. Пожалуйста, зайдите позже для ознакомления с подробными правилами, условиями сервиса и соглашением.",
    "rules_status_draft": "Статус: Черновик",
    "rules_last_modified": "Последнее обновление:",
    "rules_btn_home": "На главную",
    "rules_btn_menu": "Смотреть меню"
  },
  en: {
    "rules_badge": "Legal & Policies",
    "rules_title": "Terms of Use",
    "rules_subtitle": "Please review our terms of service, policies, and guidelines.",
    "rules_section_title": "Terms of Service",
    "rules_placeholder": "The content for the Terms of Use is currently being updated. Please check back soon for our comprehensive rules, terms of service, and user agreements.",
    "rules_status_draft": "Status: Draft",
    "rules_last_modified": "Last modified:",
    "rules_btn_home": "Back to Home",
    "rules_btn_menu": "Explore Menu"
  },
  az: {
    "rules_badge": "Hüquqi qaydalar və siyasət",
    "rules_title": "İstifadə qaydaları",
    "rules_subtitle": "Xidmət şərtlərimiz, siyasətlərimiz və qaydalarımızla tanış olun.",
    "rules_section_title": "İstifadəçi razılaşması",
    "rules_placeholder": "İstifadə qaydalarının məzmunu hazırda yenilənir. Ətraflı qaydalar, xidmət şərtləri və istifadəçi razılaşmaları ilə tanış olmaq üçün tezliklə yenidən baxın.",
    "rules_status_draft": "Status: Qaralama",
    "rules_last_modified": "Son yenilənmə:",
    "rules_btn_home": "Ana səhifəyə qayıt",
    "rules_btn_menu": "Menyuya baxın"
  }
};

export const getRulesTranslation = (lang, dataId) => {
  const dict = translations[lang] || translations.az || translations.ru;
  return dict[dataId] || translations.en[dataId] || dataId;
};
