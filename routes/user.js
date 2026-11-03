const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);
const userAuth = require('../middleware/userAuth');

// Importujemy funkcje z naszego nowego pliku walidatorów
const { 
    isValidEmail, 
    isStrongPassword, 
    isValidHouseNumber, 
    isValidPostalCode 
} = require('../utils/validators');

// Profil użytkownika
router.get('/profile', userAuth, (req, res) => {
    res.render('profile', { username: req.session.username });
});

// Ustawienia konta (GET)
router.get('/settings', userAuth, async (req, res) => {
    try {
        const user = await knex('users').where('id', req.session.userId).first();
        const address = await knex('addresses').where('user_id', req.session.userId).orderBy('is_default', 'desc').first();
        res.render('settings', { user, address: address || {} });
    } catch (error) {
        console.error("Błąd ustawień:", error);
        res.redirect('/profile');
    }
});

// Ustawienia konta (POST - Aktualizacja danych)
router.post('/settings', userAuth, async (req, res) => {
    const { username, email, first_name, last_name, street, house_number, apartment_number, city, postal_code, country } = req.body;
    const userId = req.session.userId;

    if (!username || !email || !first_name || !last_name || !street || !house_number || !city || !postal_code) {
        return renderSettingsError(req, res, 'Wypełnij wszystkie wymagane pola.');
    }

    // Użycie wyekstrahowanych walidatorów
    if (!isValidEmail(email)) return renderSettingsError(req, res, 'Nieprawidłowy format adresu email.');
    if (!isValidHouseNumber(house_number)) return renderSettingsError(req, res, 'Nieprawidłowy format numeru domu.');
    if (!isValidPostalCode(postal_code)) return renderSettingsError(req, res, 'Nieprawidłowy format kodu pocztowego (wymagany format: XX-XXX).');

    try {
        await knex('users').where('id', userId).update({
            username, email, first_name, last_name, updated_at: knex.fn.now()
        });

        const existingAddress = await knex('addresses').where('user_id', userId).first();

        if (existingAddress) {
            await knex('addresses').where('id', existingAddress.id).update({
                street, house_number, apartment_number: apartment_number || null, city, postal_code, country, updated_at: knex.fn.now()
            });
        } else {
            await knex('addresses').insert({
                user_id: userId, street, house_number, apartment_number: apartment_number || null, city, postal_code, country, is_default: true
            });
        }

        req.session.username = username;

        const updatedUser = await knex('users').where('id', userId).first();
        const updatedAddress = await knex('addresses').where('user_id', userId).first();

        res.render('settings', {
            user: updatedUser,
            address: updatedAddress,
            successMessage: 'Dane zostały pomyślnie zaktualizowane.',
            errorMessage: null
        });

    } catch (error) {
        console.error("Błąd aktualizacji ustawień:", error);
        if (error.code === '23505') { 
             return renderSettingsError(req, res, 'Użytkownik z podanym emailem lub nazwą już istnieje.');
        }
        renderSettingsError(req, res, 'Wystąpił błąd podczas zapisywania zmian.');
    }
});

// Funkcja pomocnicza do renderowania błędów w ustawieniach
async function renderSettingsError(req, res, message) {
     const user = await knex('users').where('id', req.session.userId).first();
     const address = await knex('addresses').where('user_id', req.session.userId).orderBy('is_default', 'desc').first();
     res.render('settings', { user, address: address || {}, errorMessage: message, successMessage: null });
}

// Zmiana hasła (GET)
router.get('/change-password', userAuth, (req, res) => {
    res.render('change_password');
});

// Zmiana hasła (POST)
router.post('/change-password', userAuth, async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.userId;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.render('change_password', { errorMessage: 'Wypełnij wszystkie pola.' });
    }

    if (newPassword !== confirmNewPassword) {
        return res.render('change_password', { errorMessage: 'Nowe hasła nie są identyczne.' });
    }

    // Użycie wyekstrahowanego walidatora
    if (!isStrongPassword(newPassword)) {
        return res.render('change_password', { errorMessage: 'Hasło musi mieć co najmniej 8 znaków, zawierać dużą i małą literę, cyfrę oraz znak specjalny.' });
    }

    try {
        const user = await knex('users').where('id', userId).first();

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
             return res.render('change_password', { errorMessage: 'Aktualne hasło jest nieprawidłowe.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await knex('users').where('id', userId).update({
            password_hash: hashedPassword,
            updated_at: knex.fn.now()
        });

        res.render('change_password', { successMessage: 'Hasło zostało pomyślnie zmienione.' });

    } catch (error) {
        console.error("Błąd zmiany hasła:", error);
        res.render('change_password', { errorMessage: 'Wystąpił błąd serwera.' });
    }
});

// Biblioteczka użytkownika (Moje książki)
router.get('/my-books', userAuth, async (req, res) => {
    const userId = req.session.userId;

    try {
        const myBooks = await knex('orders')
            .select(
                'books.id',
                'books.title',
                'books.cover_image_url',
                'books.is_digital_available',
                'authors.name as author_name'
            )
            .join('books', 'orders.book_id', 'books.id')
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .where('orders.user_id', userId)
            .whereIn('orders.status', ['paid', 'shipped', 'completed'])
            .groupBy('books.id', 'authors.name');

        res.render('my_books', { 
            username: req.session.username,
            books: myBooks 
        });

    } catch (error) {
        console.error("Błąd ładowania mojej biblioteki:", error);
        res.redirect('/profile');
    }
});

// Historia zamówień
router.get('/order-history', userAuth, async (req, res) => {
    const userId = req.session.userId;
    const successMessage = req.query.status === 'success' ? 'Dziękujemy! Twoje zamówienie zostało pomyślnie złożone.' : null;

    try {
        const orders = await knex('orders')
            .select(
                'orders.id',
                'orders.total_price',
                'orders.status',
                'orders.created_at',
                'books.title',
                'books.cover_image_url'
            )
            .join('books', 'orders.book_id', 'books.id')
            .where('orders.user_id', userId)
            .orderBy('orders.created_at', 'desc');

        const statusMap = { 'new': 'Nowe', 'paid': 'Opłacone', 'shipped': 'Wysłane', 'completed': 'Zakończone', 'cancelled': 'Anulowane' };

        const formattedOrders = orders.map(order => ({
            ...order,
            statusLabel: statusMap[order.status] || order.status,
            date: new Date(order.created_at).toLocaleDateString('pl-PL', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        }));

        res.render('order_history', {
            username: req.session.username,
            orders: formattedOrders,
            successMessage: successMessage,
            errorMessage: null
        });

    } catch (error) {
        console.error("Błąd historii zamówień:", error);
        res.render('order_history', {
            username: req.session.username,
            orders: [],
            successMessage: null,
            errorMessage: 'Nie udało się pobrać historii zamówień.'
        });
    }
});

// Czytanie E-booka
router.get('/read/:bookId', userAuth, async (req, res) => {
    try {
        const bookId = req.params.bookId;
        const userId = req.session.userId;

        const purchaseInfo = await knex('orders')
            .join('books', 'orders.book_id', 'books.id')
            .select('books.title', 'books.pdf_file_url') 
            .where({
                'orders.user_id': userId,
                'orders.book_id': bookId,
                'orders.status': 'completed'
            })
            .first();

        if (!purchaseInfo) {
            return res.status(403).send('Brak dostępu. Musisz zakupić e-booka, aby go przeczytać.');
        }

        let fileUrl = purchaseInfo.pdf_file_url;
        
        if (!fileUrl) {
            fileUrl = '/files/ebook.pdf';
        }
        
        const cleanPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
        const filePath = path.join(__dirname, '../public', cleanPath);

        res.sendFile(filePath, (err) => {
            if (err) {
                console.error("Błąd wysyłania pliku PDF:", err);
                res.status(404).send('Plik e-booka nie został odnaleziony na serwerze.');
            }
        });

    } catch (error) {
        console.error("Błąd otwierania e-booka:", error);
        res.status(500).send('Wystąpił błąd serwera.');
    }
});

module.exports = router;