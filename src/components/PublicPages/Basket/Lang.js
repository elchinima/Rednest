export const translations = {
  ru: {
    "basket_hero_title": "Ваша корзина",
    "basket_hero_subtitle": "Проверьте выбранные позиции перед оформлением заказа.",
    "basket_empty_title": "Ваша корзина пуста",
    "basket_empty_subtitle": "Похоже, вы еще ничего не добавили. Откройте наше меню и найдите идеальный напиток.",
    "basket_empty_btn": "Смотреть меню",
    "basket_unit_price": "за шт.",
    "basket_summary_title": "Сумма заказа",
    "basket_promo_label": "Применить промокод",
    "basket_promo_active": "активно",
    "basket_promo_none": "Не использовать промокод",
    "basket_subtotal": "Подытог",
    "basket_total": "Итого",
    "basket_btn_checkout": "Оформить заказ",
    "basket_btn_continue": "Продолжить покупки",

    "prize_super_prize": "Супер приз",
    "prize_free_drink": "Бесплатный напиток",
    "prize_free_dessert": "Бесплатный десерт",
    "prize_discount_25": "Скидка до 25%",
    "prize_cashback": "Кэшбэк на покупки",
    "prize_discount_50": "Скидка до 50%"
  },
  en: {
    "basket_hero_title": "Your Basket",
    "basket_hero_subtitle": "Review your selections before placing an order.",
    "basket_empty_title": "Your basket is empty",
    "basket_empty_subtitle": "Looks like you haven't added anything yet. Browse our menu and find your perfect drink.",
    "basket_empty_btn": "Explore Menu",
    "basket_unit_price": "each",
    "basket_summary_title": "Order Summary",
    "basket_promo_label": "Apply Promo Code",
    "basket_promo_active": "active",
    "basket_promo_none": "Don't use any promo code",
    "basket_subtotal": "Subtotal",
    "basket_total": "Total",
    "basket_btn_checkout": "Place Order",
    "basket_btn_continue": "Continue Shopping",

    "prize_super_prize": "Super Prize",
    "prize_free_drink": "Free Drink",
    "prize_free_dessert": "Free Dessert",
    "prize_discount_25": "Discount up to 25%",
    "prize_cashback": "Cashback on Purchases",
    "prize_discount_50": "Discount up to 50%"
  },
  az: {
    "basket_hero_title": "Səbətiniz",
    "basket_hero_subtitle": "Sifariş verməzdən əvvəl seçimlərinizi nəzərdən keçirin.",
    "basket_empty_title": "Səbətiniz boşdur",
    "basket_empty_subtitle": "Deyəsən, hələ heç bir məhsul əlavə etməmisiniz. Menyumuzu kəşf edin və sevimli içkinizi seçin.",
    "basket_empty_btn": "Menyuya baxın",
    "basket_unit_price": "ədəd",
    "basket_summary_title": "Sifarişin xülasəsi",
    "basket_promo_label": "Promokod tətbiq et",
    "basket_promo_active": "aktiv",
    "basket_promo_none": "Promokod istifadə etmə",
    "basket_subtotal": "Aralıq cəmi",
    "basket_total": "Yekun",
    "basket_btn_checkout": "Sifarişi rəsmiləşdir",
    "basket_btn_continue": "Alış-verişə davam et",

    "prize_super_prize": "Super hədiyyə",
    "prize_free_drink": "Pulsuz içki",
    "prize_free_dessert": "Pulsuz desert",
    "prize_discount_25": "25%-dək endirim",
    "prize_cashback": "Alışlara keşbek",
    "prize_discount_50": "50%-dək endirim"
  }
};

export const getBasketTranslation = (lang, dataId) => {
  const dict = translations[lang] || translations.az || translations.ru;
  return dict[dataId] || translations.en[dataId] || dataId;
};

export const formatLocalizedPrizeName = (name, lang) => {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  const t = (id) => getBasketTranslation(lang, id);

  if (upper.includes('SUPER PRIZE')) return t('prize_super_prize');
  if (upper.includes('FREE DRINK')) return t('prize_free_drink');
  if (upper.includes('FREE DESSERT')) return t('prize_free_dessert');
  if (upper.includes('25%')) return t('prize_discount_25');
  if (upper.includes('CASHBACK')) return t('prize_cashback');
  if (upper.includes('50%')) return t('prize_discount_50');

  return name;
};
