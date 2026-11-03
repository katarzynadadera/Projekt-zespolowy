const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);

// Importujemy funkcje z naszego nowego pliku walidatorów
const { isValidEmail, isStrongPassword, isValidUsername } = require('../utils/validators');

// Logowanie i Wylogowywanie
router.get('/login', (req, res) => {
    // Zapisujemy ścieżkę powrotną do sesji, jeśli została przekazana w URL
    if (req.query.redirect) {
        req.session.returnTo = req.query.redirect;
    }
    res.render('login');
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { errorMessage: 'Wypełnij wszystkie pola.' });
    }

    try {
        const user = await knex('users').where('email', email).first();

        if (!user) {
            return res.render('login', { errorMessage: 'Nieprawidłowy email lub hasło.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.render('login', { errorMessage: 'Nieprawidłowy email lub hasło.' });
        }

        // Ustawienie danych w sesji
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Logika przekierowania po zalogowaniu
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo; 

        console.log(`Użytkownik zalogowany: ${user.username}`);
        res.redirect(redirectUrl);

    } catch (error) {
        console.error('Błąd logowania:', error);
        res.status(500).render('login', { errorMessage: 'Błąd serwera podczas logowania.' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Rejestracja
router.get('/signup', (req, res) => {
    res.render('signup');
});

router.post('/signup', async (req, res) => {
    const { username, email, password, 'confirm-password': confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        return res.render('signup', { errorMessage: 'Wypełnij wszystkie pola.' });
    }

    if (password !== confirmPassword) {
        return res.render('signup', { errorMessage: 'Hasła nie są identyczne.' });
    }

    // Użycie wyekstrahowanych walidatorów
    if (!isValidEmail(email)) {
        return res.render('signup', { errorMessage: 'Podaj poprawny adres email.' });
    }

    if (!isValidUsername(username)) {
        return res.render('signup', { errorMessage: 'Nazwa użytkownika musi mieć od 3 do 20 znaków i nie może zawierać znaków specjalnych.' });
    }

    if (!isStrongPassword(password)) {
        return res.render('signup', { errorMessage: 'Hasło musi mieć co najmniej 8 znaków, dużą i małą literę, cyfrę oraz znak specjalny.' });
    }

    try {
        const existingUser = await knex('users')
            .where('email', email)
            .orWhere('username', username)
            .first();

        if (existingUser) {
            return res.render('signup', { errorMessage: 'Użytkownik o podanym adresie email lub nazwie już istnieje.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const [insertedRow] = await knex('users').insert({
            username,
            email,
            password_hash: passwordHash,
            role: 'user', 
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        }).returning('id');
        
        req.session.userId = insertedRow.id || insertedRow;
        req.session.username = username;
        req.session.role = 'user';

        console.log(`Nowy użytkownik zarejestrowany: ${username}`);
        res.redirect('/');

    } catch (error) {
        console.error('Błąd rejestracji:', error);
        res.status(500).render('signup', { errorMessage: 'Błąd serwera podczas rejestracji.' });
    }
});

// Odzyskiwanie Hasła (Symulacja) 
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password');
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.render('forgot_password', { errorMessage: 'Podaj adres email.' });
    }
    res.render('forgot_password', { successMessage: 'Jeśli podany email istnieje w naszej bazie, wysłaliśmy na niego link do resetu hasła.' });
});

module.exports = router;