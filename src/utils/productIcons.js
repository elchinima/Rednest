const SUPABASE_BASE = 'https://tlcehlxztgewbidcvwye.supabase.co/storage/v1/object/public/admin-files/database/';

export const PRODUCT_ICON_URLS = {
  tea: `${SUPABASE_BASE}tea_1787566950.webp`,
  espresso: `${SUPABASE_BASE}espresso_1787567143.webp`,
  americano: `${SUPABASE_BASE}americano_1787567136.webp`,
  latte: `${SUPABASE_BASE}latte_1787567130.webp`,
  cappuccino: `${SUPABASE_BASE}cappuccino_1787567169.webp`,
  red_latte: `${SUPABASE_BASE}red_latte_1787567174.webp`,
  nest_cappuccino: `${SUPABASE_BASE}nest_cappuccino_9876543290_1787567162.webp`,
  hot_chocolate: `${SUPABASE_BASE}hot_chocolate_1787567158.webp`,
  eclair: `${SUPABASE_BASE}eclair_1787567148.webp`,
  croissant: `${SUPABASE_BASE}croissant_1787567119.webp`,
  muffin: `${SUPABASE_BASE}muffin_1787567178.webp`,
};

export const PRODUCT_ID_TO_ICON = {
  'a1b2c3d4-0001-0001-0001-000000000001': PRODUCT_ICON_URLS.tea,
  'a1b2c3d4-0001-0001-0001-000000000002': PRODUCT_ICON_URLS.espresso,
  'a1b2c3d4-0001-0001-0001-000000000003': PRODUCT_ICON_URLS.americano,
  'a1b2c3d4-0001-0001-0001-000000000004': PRODUCT_ICON_URLS.latte,
  'a1b2c3d4-0001-0001-0001-000000000005': PRODUCT_ICON_URLS.cappuccino,
  'a1b2c3d4-0002-0002-0002-000000000001': PRODUCT_ICON_URLS.red_latte,
  'a1b2c3d4-0002-0002-0002-000000000002': PRODUCT_ICON_URLS.nest_cappuccino,
  'a1b2c3d4-0002-0002-0002-000000000003': PRODUCT_ICON_URLS.hot_chocolate,
  'a1b2c3d4-0003-0003-0003-000000000001': PRODUCT_ICON_URLS.eclair,
  'a1b2c3d4-0003-0003-0003-000000000002': PRODUCT_ICON_URLS.croissant,
  'a1b2c3d4-0003-0003-0003-000000000003': PRODUCT_ICON_URLS.muffin,
};

const FILENAME_TO_ICON = {
  'tea_7654329000.webp': PRODUCT_ICON_URLS.tea,
  'tea_1787566950.webp': PRODUCT_ICON_URLS.tea,
  'espresso_6854930222.webp': PRODUCT_ICON_URLS.espresso,
  'espresso_1787567143.webp': PRODUCT_ICON_URLS.espresso,
  'americano_1786885347.webp': PRODUCT_ICON_URLS.americano,
  'americano_1787567136.webp': PRODUCT_ICON_URLS.americano,
  'latte_6543223589.webp': PRODUCT_ICON_URLS.latte,
  'latte_1787567130.webp': PRODUCT_ICON_URLS.latte,
  'cappuccino_8765432354.webp': PRODUCT_ICON_URLS.cappuccino,
  'cappuccino_1787567169.webp': PRODUCT_ICON_URLS.cappuccino,
  'red_latte_9876543221.webp': PRODUCT_ICON_URLS.red_latte,
  'red_latte_1787567174.webp': PRODUCT_ICON_URLS.red_latte,
  'nest_cappuccino_9876543290.webp': PRODUCT_ICON_URLS.nest_cappuccino,
  'nest_cappuccino_9876543290_1787567162.webp': PRODUCT_ICON_URLS.nest_cappuccino,
  'hot_chocolate_7690568000.webp': PRODUCT_ICON_URLS.hot_chocolate,
  'hot_chocolate_1787567158.webp': PRODUCT_ICON_URLS.hot_chocolate,
  'eclair_8439200222.webp': PRODUCT_ICON_URLS.eclair,
  'eclair_1787567148.webp': PRODUCT_ICON_URLS.eclair,
  'croissant_7654320922.webp': PRODUCT_ICON_URLS.croissant,
  'croissant_1787567119.webp': PRODUCT_ICON_URLS.croissant,
  'muffin_7965430339.webp': PRODUCT_ICON_URLS.muffin,
  'muffin_1787567178.webp': PRODUCT_ICON_URLS.muffin,
};

const NAME_TO_ICON = {
  'tea': PRODUCT_ICON_URLS.tea,
  'espresso': PRODUCT_ICON_URLS.espresso,
  'americano': PRODUCT_ICON_URLS.americano,
  'latte': PRODUCT_ICON_URLS.latte,
  'cappuccino': PRODUCT_ICON_URLS.cappuccino,
  'red latte': PRODUCT_ICON_URLS.red_latte,
  'nest cappuccino': PRODUCT_ICON_URLS.nest_cappuccino,
  'hot chocolate': PRODUCT_ICON_URLS.hot_chocolate,
  'eclair': PRODUCT_ICON_URLS.eclair,
  'croissant': PRODUCT_ICON_URLS.croissant,
  'muffin': PRODUCT_ICON_URLS.muffin,
};

export function getProductIconUrl(itemOrUrlOrId) {
  if (!itemOrUrlOrId) return '';

  if (typeof itemOrUrlOrId === 'string') {
    const raw = itemOrUrlOrId.trim();
    if (PRODUCT_ID_TO_ICON[raw]) {
      return PRODUCT_ID_TO_ICON[raw];
    }
    const lowerName = raw.toLowerCase();
    if (NAME_TO_ICON[lowerName]) {
      return NAME_TO_ICON[lowerName];
    }
    for (const [filename, iconUrl] of Object.entries(FILENAME_TO_ICON)) {
      if (raw.includes(filename)) {
        return iconUrl;
      }
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
  }

  if (typeof itemOrUrlOrId === 'object') {
    const id = itemOrUrlOrId.id || itemOrUrlOrId.productId;
    if (id && PRODUCT_ID_TO_ICON[String(id).toLowerCase()]) {
      return PRODUCT_ID_TO_ICON[String(id).toLowerCase()];
    }

    const name = itemOrUrlOrId.name ? String(itemOrUrlOrId.name).trim().toLowerCase() : '';
    if (name && NAME_TO_ICON[name]) {
      return NAME_TO_ICON[name];
    }

    const imgUrl = itemOrUrlOrId.imageUrl || itemOrUrlOrId.product?.imageUrl || '';
    if (imgUrl) {
      for (const [filename, iconUrl] of Object.entries(FILENAME_TO_ICON)) {
        if (imgUrl.includes(filename)) {
          return iconUrl;
        }
      }
      return imgUrl;
    }
  }

  return '';
}

export default getProductIconUrl;
