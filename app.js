const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
require("dotenv").config({ quiet: true });

// Konfiguracja bazy danych
const env = process.env.NODE_ENV || 'development';
const config = require('./knexfile.js')[env];
const knex = require('knex')(config);

// Importujemy funkcję, która czeka na podanie bazy danych
const userDataMiddleware = require('./middleware/userData');

const app = express();

// Konfiguracja widoków
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Pliki statyczne
app.use(express.static(path.join(__dirname, 'public')));

// Obsługa body requestów
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sesja
app.use(session({
    secret: process.env.SESSION_SECRET || 'sekretny_klucz_projektu',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

app.use(userDataMiddleware(knex));

// Import routerów
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Home page
app.get('/', async (req, res) => {
    try {
        const topBooks = await knex('books')
            .select('books.*', 'authors.name as author_name')
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .orderBy('view_count', 'desc')
            .limit(3);
            
        res.render('home', { topBooks });
    } catch (error) {
        console.error("Błąd strony głównej:", error);
        res.render('home', { topBooks: [] });
    }
});

// Routy
app.use('/', authRoutes);
app.use('/browse', booksRoutes);
app.use('/cart', cartRoutes);
app.use('/', ordersRoutes);
app.use('/search', searchRoutes);
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
    res.status(404).render('home', { topBooks: [] });
});

if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Serwer działa: http://localhost:${PORT}`);
    });
}

module.exports = app;