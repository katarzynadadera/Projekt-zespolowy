module.exports = (knex) => {
    return async (req, res, next) => {
        // Domyślne wartości
        res.locals.isAuthenticated = !!req.session.userId;
        res.locals.username = req.session.username || null;
        res.locals.userId = req.session.userId || null;
        res.locals.userRole = req.session.role || 'user'; 
        res.locals.isAdmin = req.session.role === 'admin';
        res.locals.cartTotal = '0.00';
        res.locals.cartItems = [];
        res.locals.cartCount = 0;

        // Jeśli użytkownik jest zalogowany -> pobierz koszyk używając przekazanego 'knex'
        if (req.session.userId) {
            try {
                const cartItems = await knex('cart_items')
                    .select(
                        'cart_items.id as cart_item_id',
                        'cart_items.quantity', 
                        'cart_items.format',
                        'cart_items.book_id',
                        'books.title', 
                        'books.cover_image_url', 
                        'books.digital_price', 
                        'books.physical_price'
                    )
                    .join('books', 'cart_items.book_id', 'books.id')
                    .where('cart_items.user_id', req.session.userId);

                let total = 0;
                let totalQty = 0;
                cartItems.forEach(item => {
                    const price = item.format === 'digital' ? item.digital_price : item.physical_price;
                    item.price = price;
                    total += Number(price) * item.quantity;
                    totalQty += item.quantity;
                });

                res.locals.cartItems = cartItems;
                res.locals.cartTotal = total.toFixed(2);
                res.locals.cartCount = totalQty;
            } catch (error) {
                console.error("Błąd ładowania koszyka:", error);
            }
        }
        next();
    };
};