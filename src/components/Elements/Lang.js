export const translations = {
  ru: {
    "widget_buynow_cart": "В корзину",
    "widget_buynow_write_review": "Написать отзыв",
    "widget_fortune_aria": "Колесо фортуны",
    "widget_fortune_tooltip": "Вращайте колесо и получайте подарки!",
    "widget_support_aria": "Чат поддержки",
    "widget_support_tooltip": "Готовы помочь вам с выбором",
    "nav_home": "Главная",
    "nav_menu": "Меню",
    "nav_review": "Отзывы"
  },
  en: {
    "widget_buynow_cart": "Buy Now",
    "widget_buynow_write_review": "Write a Review",
    "widget_fortune_aria": "Wheel of Fortune",
    "widget_fortune_tooltip": "Spin the wheel for a gift!",
    "widget_support_aria": "Support chat",
    "widget_support_tooltip": "Ready to help you with your choice",
    "nav_home": "Home",
    "nav_menu": "Menu",
    "nav_review": "Review"
  },
  az: {
    "widget_buynow_cart": "İndi al",
    "widget_buynow_write_review": "Rəy yazın",
    "widget_fortune_aria": "Hədiyyə çarxı",
    "widget_fortune_tooltip": "Hədiyyə üçün çarxı fırladın!",
    "widget_support_aria": "Dəstək çatı",
    "widget_support_tooltip": "Seçiminizdə sizə kömək etməyə hazırıq",
    "nav_home": "Ana səhifə",
    "nav_menu": "Menyu",
    "nav_review": "Rəylər"
  }
};

export const getWidgetTranslation = (lang, dataId) => {
  const dict = translations[lang] || translations.ru;
  return dict[dataId] || translations.en[dataId] || dataId;
};
