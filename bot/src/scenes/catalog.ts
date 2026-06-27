import { InlineKeyboard } from 'grammy';
import { MyContext, ApiProduct } from '../lib/types.js';
import { getCatalog, SuspendedError } from '../lib/api.js';
import { buildCartSummary } from '../lib/format.js';
import { t, formatMoney } from '../lib/i18n.js';
import { getLang } from '../lib/lang.js';

export function registerCatalogHandlers(bot: import('grammy').Bot<MyContext>) {
  // "Browse catalog" button → show product list
  bot.callbackQuery('catalog', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCatalog(ctx);
  });

  // Product detail
  bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const productId = ctx.match[1];
    await showProduct(ctx, productId);
  });

  // Add to cart (no variants)
  bot.callbackQuery(/^add:(.+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const productId = ctx.match[1];
    const qty = parseInt(ctx.match[2], 10);
    await addToCart(ctx, productId, qty);
  });

  // Remove from cart
  bot.callbackQuery(/^remove:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const productId = ctx.match[1];
    ctx.session.cart = ctx.session.cart.filter((i) => i.productId !== productId);
    ctx.session.orderIdemKey = undefined; // cart changed → next order is distinct
    await showCart(ctx);
  });

  // View cart
  bot.callbackQuery('cart', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCart(ctx);
  });

  // Back to catalog from cart
  bot.callbackQuery('back_catalog', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCatalog(ctx);
  });
}

export async function showCatalog(ctx: MyContext) {
  const lang = await getLang(ctx);
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(ctx.botUsername);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'catalogLoadError'));
    return;
  }

  if (catalog.products.length === 0) {
    await ctx.reply(t(lang, 'catalogEmpty'));
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const product of catalog.products) {
    keyboard.text(`${product.name} — ${formatMoney(lang, product.price)}`, `product:${product.id}`).row();
  }

  const cartCount = ctx.session.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (cartCount > 0) {
    keyboard.text(t(lang, 'cartButton', { count: cartCount }), 'cart');
  }

  await ctx.reply(t(lang, 'chooseProduct'), { reply_markup: keyboard });
}

async function showProduct(ctx: MyContext, productId: string) {
  const lang = await getLang(ctx);
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(ctx.botUsername);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'catalogLoadError'));
    return;
  }

  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply(t(lang, 'productNotFound'));
    return;
  }

  const stockText =
    product.unlimited
      ? ''
      : product.stockQty === 0
      ? t(lang, 'outOfStockLine')
      : product.stockQty != null
      ? t(lang, 'inStock', { qty: product.stockQty })
      : '';

  const prepText = product.prepTime ? t(lang, 'prepTimeLabel', { time: product.prepTime }) : '';

  const caption =
    `<b>${product.name}</b>\n\n` +
    (product.description ? `${product.description}\n\n` : '') +
    `💰 <b>${formatMoney(lang, product.price)}</b>` +
    stockText +
    prepText;

  const qtyKeyboard = new InlineKeyboard();
  const isOutOfStock = !product.unlimited && product.stockQty === 0;

  if (!isOutOfStock) {
    // Quantity selection row
    for (const qty of [1, 2, 3, 5]) {
      qtyKeyboard.text(`+${qty}`, `add:${product.id}:${qty}`);
    }
    qtyKeyboard.row();
  }

  qtyKeyboard.text(t(lang, 'backToCatalogText'), 'catalog');

  // Send photo if available, otherwise just text
  if (product.photos.length > 0) {
    try {
      await ctx.replyWithPhoto(product.photos[0], {
        caption,
        parse_mode: 'HTML',
        reply_markup: qtyKeyboard,
      });
      return;
    } catch {
      // Photo failed (e.g. URL expired), fall through to text
    }
  }

  await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: qtyKeyboard });
}

async function addToCart(ctx: MyContext, productId: string, qty: number) {
  const lang = await getLang(ctx);
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(ctx.botUsername);
  } catch (err) {
    if (err instanceof SuspendedError) {
      await ctx.reply(t(lang, 'suspended'));
      return;
    }
    await ctx.reply(t(lang, 'catalogLoadError'));
    return;
  }

  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply(t(lang, 'productNotFound'));
    return;
  }

  const existing = ctx.session.cart.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    ctx.session.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      photoUrl: product.photos[0],
    });
  }
  ctx.session.orderIdemKey = undefined; // cart changed → next order is distinct

  const total = ctx.session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = ctx.session.cart.reduce((sum, i) => sum + i.quantity, 0);

  const keyboard = new InlineKeyboard()
    .text(t(lang, 'viewCart'), 'cart')
    .text(t(lang, 'continueShopping'), 'catalog')
    .row()
    .text(t(lang, 'checkout'), 'checkout');

  await ctx.reply(
    t(lang, 'addedToCartFull', {
      qty,
      name: product.name,
      count: cartCount,
      total: formatMoney(lang, total),
    }),
    { parse_mode: 'HTML', reply_markup: keyboard },
  );
}

export async function showCart(ctx: MyContext) {
  const lang = await getLang(ctx);
  const cart = ctx.session.cart;
  const summary = buildCartSummary(cart, lang);

  const keyboard = new InlineKeyboard();

  if (cart.length > 0) {
    for (const item of cart) {
      keyboard.text(t(lang, 'removeItem', { name: item.name }), `remove:${item.productId}`).row();
    }
    keyboard.text(t(lang, 'continueShopping'), 'catalog').text(t(lang, 'checkout'), 'checkout');
  } else {
    keyboard.text(t(lang, 'browseCatalog'), 'catalog');
  }

  await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: keyboard });
}
