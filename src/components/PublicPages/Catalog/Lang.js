export const translations = {
  ru: {
    "catalog_hero_title": "Наше меню",
    "catalog_hero_subtitle": "Попробуйте наши авторские напитки и изысканные десерты.",
    "catalog_category_main_drinks": "Основные напитки",
    "catalog_category_specialty_drinks": "Особые напитки",
    "catalog_category_desserts": "Десерты",
    "catalog_add_btn": "В корзину",
    "catalog_added_label": "Добавлено"
  },
  en: {
    "catalog_hero_title": "Our Menu",
    "catalog_hero_subtitle": "Discover our carefully crafted beverages and delightful desserts.",
    "catalog_category_main_drinks": "Main Drinks",
    "catalog_category_specialty_drinks": "Specialty Drinks",
    "catalog_category_desserts": "Desserts",
    "catalog_add_btn": "Add to cart",
    "catalog_added_label": "Added"
  },
  az: {
    "catalog_hero_title": "Menyumuz",
    "catalog_hero_subtitle": "Özəl olaraq hazırlanmış içkilərimizi və ləzzətli desertlərimizi kəşf edin.",
    "catalog_category_main_drinks": "Əsas içkilər",
    "catalog_category_specialty_drinks": "Xüsusi içkilər",
    "catalog_category_desserts": "Desertlər",
    "catalog_add_btn": "Səbətə əlavə et",
    "catalog_added_label": "Əlavə edildi"
  }
};

export const getCatalogTranslation = (lang, dataId) => {
  const dict = translations[lang] || translations.ru;
  return dict[dataId] || translations.en[dataId] || dataId;
};

export const getCategoryTitle = (lang, originalCat) => {
  const normalized = (originalCat || '').trim().toLowerCase();
  if (normalized === 'main drinks') {
    return getCatalogTranslation(lang, 'catalog_category_main_drinks');
  }
  if (normalized === 'specialty drinks') {
    return getCatalogTranslation(lang, 'catalog_category_specialty_drinks');
  }
  if (normalized === 'desserts') {
    return getCatalogTranslation(lang, 'catalog_category_desserts');
  }
  return originalCat;
};
