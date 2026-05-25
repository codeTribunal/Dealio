import { InlineKeyboard } from 'grammy';
import { MyContext, ApiProduct } from '../lib/types.js';
import { getCatalog } from '../lib/api.js';
import { formatUZS, buildCartSummary } from '../lib/format.js';

const BOT_TOKEN = process.env.BOT_TOKEN ?? '';

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
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(BOT_TOKEN);
  } catch {
    await ctx.reply('Could not load catalog. Please try again later.');
    return;
  }

  if (catalog.products.length === 0) {
    await ctx.reply('No products available at the moment.');
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const product of catalog.products) {
    keyboard.text(`${product.name} — ${formatUZS(product.price)}`, `product:${product.id}`).row();
  }

  const cartCount = ctx.session.cart.reduce((sum, i) => sum + i.quantity, 0);
  if (cartCount > 0) {
    keyboard.text(`🛒 Cart (${cartCount} items)`, 'cart');
  }

  await ctx.reply('Choose a product:', { reply_markup: keyboard });
}

async function showProduct(ctx: MyContext, productId: string) {
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(BOT_TOKEN);
  } catch {
    await ctx.reply('Could not load product. Please try again later.');
    return;
  }

  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply('Product not found.');
    return;
  }

  const stockText =
    product.unlimited
      ? ''
      : product.stockQty === 0
      ? '\n⚠️ Out of stock'
      : product.stockQty != null
      ? `\n📦 In stock: ${product.stockQty}`
      : '';

  const prepText = product.prepTime ? `\n⏱ Prep time: ${product.prepTime}` : '';

  const caption =
    `<b>${product.name}</b>\n\n` +
    (product.description ? `${product.description}\n\n` : '') +
    `💰 <b>${formatUZS(product.price)}</b>` +
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

  qtyKeyboard.text('« Back to catalog', 'catalog');

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
  let catalog: { products: ApiProduct[] };
  try {
    catalog = await getCatalog(BOT_TOKEN);
  } catch {
    await ctx.reply('Could not add to cart. Please try again.');
    return;
  }

  const product = catalog.products.find((p) => p.id === productId);
  if (!product) {
    await ctx.reply('Product not found.');
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

  const total = ctx.session.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = ctx.session.cart.reduce((sum, i) => sum + i.quantity, 0);

  const keyboard = new InlineKeyboard()
    .text('🛒 View cart', 'cart')
    .text('🛍 Continue shopping', 'catalog')
    .row()
    .text('✅ Checkout', 'checkout');

  await ctx.reply(
    `✅ Added ${qty}× <b>${product.name}</b> to cart.\n\n` +
      `Cart: ${cartCount} items — <b>${formatUZS(total)}</b>`,
    { parse_mode: 'HTML', reply_markup: keyboard },
  );
}

export async function showCart(ctx: MyContext) {
  const cart = ctx.session.cart;
  const summary = buildCartSummary(cart);

  const keyboard = new InlineKeyboard();

  if (cart.length > 0) {
    for (const item of cart) {
      keyboard.text(`Remove: ${item.name}`, `remove:${item.productId}`).row();
    }
    keyboard.text('🛍 Continue shopping', 'catalog').text('✅ Checkout', 'checkout');
  } else {
    keyboard.text('🛍 Browse catalog', 'catalog');
  }

  await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: keyboard });
}
