const express = require('express');
const router = express.Router();
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);
const userAuth = require('../middleware/userAuth');

// GET /checkout/cart - Podsumowanie koszyka (Kasa)
router.get('/checkout/cart', userAuth, async (req, res) => {
    const userId = req.session.userId;
    try {
        // 1. Pobieramy dane użytkownika
        const user = await knex('users').where('id', userId).first();
        
        // 2. Pobieramy domyślny adres
        const address = await knex('addresses')
            .where('user_id', userId)
            .orderBy('is_default', 'desc') 
            .first();

        // Łączenie danych adresu z użytkownikiem dla widoku
        if (address && user) {
            Object.assign(user, address);
        }

        // 3. Pobieramy zawartość koszyka
        const cartItems = await knex('cart_items')
            .select(
                'cart_items.*', 
                'books.title', 
                'books.cover_image_url', 
                'books.digital_price', 
                'books.physical_price'
            )
            .join('books', 'cart_items.book_id', 'books.id')
            .where('cart_items.user_id', userId);

        if (cartItems.length === 0) {
            return res.redirect('/browse');
        }

        // 4. Obliczenia (suma, dostawa)
        let total = 0;
        let hasPhysicalItems = false;

        cartItems.forEach(item => {
            const price = item.format === 'digital' ? item.digital_price : item.physical_price;
            item.price = price; 
            total += Number(price) * item.quantity;

            // Sprawdzamy czy koszyk zawiera fizyczne produkty
            if (item.format === 'physical') {
                hasPhysicalItems = true;
            }
        });

        // Koszt dostawy: 15 PLN tylko jeśli są fizyczne produkty
        const shippingCost = hasPhysicalItems ? 15.00 : 0.00;

        res.render('checkout', {
            type: 'cart',
            items: cartItems,
            total: total.toFixed(2),
            user: user,
            address: address || {},
            isLoggedIn: true, 
            username: req.session.username,
            shippingCost: shippingCost.toFixed(2),
            hasPhysicalItems: hasPhysicalItems
        });

    } catch (error) {
        console.error("Błąd ładowania koszyka:", error);
        res.redirect('/browse');
    }
});

// POST /orders/create-from-cart - Finalizacja zamówienia
router.post('/orders/create-from-cart', userAuth, async (req, res) => {
    const userId = req.session.userId;
    const { 
        email, first_name, last_name, street, house_number, city, postal_code, 
        payment_method 
    } = req.body;

    // Podstawowa walidacja danych adresowych
    const textRegex = /^[A-Za-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż\s\-]+$/;
    const postalRegex = /^[0-9]{2}-[0-9]{3}$/;

    if (!textRegex.test(first_name) || !textRegex.test(last_name) || !textRegex.test(city)) {
        console.error("Błąd walidacji: Imię, nazwisko lub miasto zawiera niedozwolone znaki.");
        return res.status(400).redirect('/checkout/cart');
    }

    if (!postalRegex.test(postal_code)) {
        console.error("Błąd walidacji: Nieprawidłowy kod pocztowy.");
        return res.status(400).redirect('/checkout/cart');
    }

    try {
        await knex.transaction(async (trx) => {
            const cartItems = await trx('cart_items')
                .join('books', 'cart_items.book_id', 'books.id')
                .select('cart_items.*', 'books.digital_price', 'books.physical_price')
                .where('cart_items.user_id', userId);

            if (cartItems.length === 0) {
                throw new Error("Pusty koszyk");
            }

            // Weryfikacja stanów magazynowych przed utworzeniem zamówienia
            for (const item of cartItems) {
                if (item.format === 'physical') {
                    // Pobranie aktualnego stanu magazynowego z blokadą wiersza do końca transakcji
                    const book = await trx('books')
                        .select('title', 'physical_stock')
                        .where('id', item.book_id)
                        .forUpdate()
                        .first();

                    if (!book) {
                        throw new Error(`Książka o ID ${item.book_id} nie istnieje.`);
                    }

                    // Przerwanie transakcji w przypadku braku wystarczającej ilości sztuk
                    if (book.physical_stock < item.quantity) {
                        throw new Error(`Brak wystarczającej ilości w magazynie dla: "${book.title}".`);
                    }

                    // Dekrementacja stanu magazynowego po udanej weryfikacji
                    await trx('books')
                        .where('id', item.book_id)
                        .decrement('physical_stock', item.quantity);
                }
            }

            // Przygotowanie danych do tabeli zamówień
            const ordersToInsert = cartItems.map(item => {
                const price = item.format === 'digital' ? item.digital_price : item.physical_price;
                
                let status = 'new';
                if (item.format === 'digital') {
                    status = 'completed'; 
                } else {
                    status = payment_method === 'cod' ? 'new' : 'paid';
                }

                return {
                    user_id: userId,
                    book_id: item.book_id,
                    email, first_name, last_name, street, house_number, city, postal_code,
                    total_price: Number(price) * item.quantity,
                    status: status,
                    created_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                };
            });

            // Rejestracja zamówień i czyszczenie koszyka w ramach tej samej transakcji
            await trx('orders').insert(ordersToInsert);
            await trx('cart_items').where('user_id', userId).del();
        });

        res.redirect('/order-history?status=success');

    } catch (error) {
        console.error("Błąd tworzenia zamówienia:", error.message);
        res.status(500).redirect('/checkout/cart');
    }
});

module.exports = router;