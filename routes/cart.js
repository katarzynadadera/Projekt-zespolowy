const express = require('express');
const router = express.Router();
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);
const userAuth = require('../middleware/userAuth');

// POST /cart/add - Dodawanie produktu do koszyka
router.post('/add', async (req, res) => {
    // Sprawdzenie sesji
    if (!req.session.userId) {
        return res.status(401).json({ success: false, redirectUrl: '/login' });
    }

    const { book_id, format } = req.body;

    try {
        // Sprawdź czy przedmiot już istnieje w koszyku
        const existingItem = await knex('cart_items')
            .where({ user_id: req.session.userId, book_id: book_id, format: format })
            .first();

        let currentItemQuantity = 1;

        if (existingItem) {
            await knex('cart_items')
                .where('id', existingItem.id)
                .increment('quantity', 1);
            currentItemQuantity = existingItem.quantity + 1;
        } else {
            await knex('cart_items').insert({
                user_id: req.session.userId, 
                book_id: book_id, 
                format: format, 
                quantity: 1
            });
        }
        
        // Pobierz aktualny stan całego koszyka (do licznika w nagłówku)
        const allItems = await knex('cart_items')
            .join('books', 'cart_items.book_id', 'books.id')
            .select(
                'cart_items.book_id',
                'cart_items.quantity', 
                'cart_items.format', 
                'books.digital_price', 
                'books.physical_price', 
                'books.title', 
                'books.cover_image_url'
            )
            .where('cart_items.user_id', req.session.userId);

        let totalQty = 0;
        let totalVal = 0;
        let addedItemData = {}; // Dane konkretnie dodanego przedmiotu
        
        allItems.forEach(item => {
            totalQty += item.quantity;
            const price = item.format === 'digital' ? item.digital_price : item.physical_price;
            totalVal += Number(price) * item.quantity;

            // Wyłap dane dodanego przedmiotu, aby wyświetlić je w modalu
            if (item.book_id == book_id && item.format == format) {
                addedItemData = {
                    title: item.title,
                    price: price,
                    quantity: item.quantity,
                    cover: item.cover_image_url,
                    format: item.format,
                    id: item.book_id
                };
            }
        });

        res.json({ 
            success: true, 
            cartCount: totalQty,
            cartTotal: totalVal.toFixed(2),
            addedItem: addedItemData
        });

    } catch (error) {
        console.error("Błąd operacji koszyka:", error);
        res.status(500).json({ success: false, message: 'Wystąpił błąd serwera.' });
    }
});

// POST /cart/remove - Usuwanie produktu z koszyka
router.post('/remove', userAuth, async (req, res) => {
    try {
        let cartItemId = req.body.cart_item_id;
        
        // Sprawdzenie czy to ID numeryczne czy złożony string z frontendu
        if (cartItemId.toString().startsWith('cart-item-')) {
            // Parsowanie: cart-item-12-physical -> bookId=12, format=physical
            const parts = cartItemId.split('-');
            const bookId = parts[2];
            const format = parts[3];

            await knex('cart_items')
                .where({
                    user_id: req.session.userId,
                    book_id: bookId,
                    format: format
                })
                .del();
        } else {
            // Standardowe usuwanie po ID
             await knex('cart_items')
                .where('id', cartItemId)
                .andWhere('user_id', req.session.userId)
                .del();
        }
            
        res.redirect(req.get('referer') || '/');
    } catch (error) {
        console.error("Błąd usuwania z koszyka:", error);
        res.redirect('/');
    }
});

module.exports = router;