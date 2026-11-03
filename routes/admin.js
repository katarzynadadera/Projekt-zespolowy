const express = require('express');
const router = express.Router();
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);
const adminAuth = require('../middleware/adminAuth');

// Zastosowanie middleware autoryzacji
router.use(adminAuth);

// Panel główny admina
router.get('/', async (req, res) => {
    res.render('admin/dashboard');
});

// ZARZĄDZANIE KSIĄŻKAMI 

// Wyświetlanie listy książek
router.get('/books', async (req, res) => {
    try {
        const books = await knex('books')
            .select('books.*', 'authors.name as author_name', 'categories.name as category_name')
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .leftJoin('categories', 'books.category_id', 'categories.id')
            .orderBy('books.id', 'desc');

        res.render('admin/books_list', { books });
    } catch (error) {
        console.error(error);
        res.render('admin/dashboard', { errorMessage: 'Błąd pobierania listy książek.' });
    }
});

// Formularz dodawania nowej książki
router.get('/books/add', async (req, res) => {
    try {
        const categories = await knex('categories').select('*').orderBy('name');
        res.render('admin/add_book', { categories });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/books');
    }
});

// Zapis nowej książki
router.post('/books/add', async (req, res) => {
    const { 
        title, author_name, category_id, description, publication_year, isbn, cover_image_url,
        digital_price, physical_price, physical_stock,
        is_digital_available, is_physical_available, pdf_file_url 
    } = req.body;

    try {
        let authorId = null;
        if (author_name) {
            let author = await knex('authors').whereRaw('LOWER(name) = ?', [author_name.toLowerCase()]).first();
            if (author) {
                authorId = author.id;
            } else {
                const [newAuthor] = await knex('authors').insert({ name: author_name }).returning('id');
                authorId = newAuthor.id || newAuthor;
            }
        }

        await knex('books').insert({
            title,
            author_id: authorId,
            category_id,
            description,
            publication_year: parseInt(publication_year) || null,
            isbn,
            cover_image_url,
            is_digital_available: !!is_digital_available,
            digital_price: digital_price ? parseFloat(digital_price) : null,
            is_physical_available: !!is_physical_available,
            physical_stock: physical_stock ? parseInt(physical_stock) : 0,
            physical_price: physical_price ? parseFloat(physical_price) : null,
            view_count: 0,
            pdf_file_url: pdf_file_url || null
        });

        res.redirect('/admin/books');
    } catch (error) {
        console.error("Błąd dodawania książki:", error);
        const categories = await knex('categories').select('*').orderBy('name');
        res.render('admin/add_book', { categories, errorMessage: 'Błąd dodawania książki. Sprawdź poprawność danych (np. unikalność ISBN).', formData: req.body });
    }
});

// Formularz edycji książki
router.get('/books/edit/:id', async (req, res) => {
    try {
        const book = await knex('books')
            .select('books.*', 'authors.name as author_name')
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .where('books.id', req.params.id)
            .first();

        if (!book) return res.redirect('/admin/books');

        const categories = await knex('categories').select('*').orderBy('name');
        res.render('admin/edit_book', { book, categories });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/books');
    }
});

// Zapis edytowanej książki
router.post('/books/edit/:id', async (req, res) => {
    const { 
        title, author_name, category_id, description, publication_year, isbn, cover_image_url,
        digital_price, physical_price, physical_stock,
        is_digital_available, is_physical_available, pdf_file_url 
    } = req.body;

    try {
        let authorId = null;
        if (author_name) {
            let author = await knex('authors').whereRaw('LOWER(name) = ?', [author_name.toLowerCase()]).first();
            if (author) {
                authorId = author.id;
            } else {
                const [newAuthor] = await knex('authors').insert({ name: author_name }).returning('id');
                authorId = newAuthor.id || newAuthor;
            }
        }

        await knex('books')
            .where('id', req.params.id)
            .update({
                title,
                author_id: authorId,
                category_id,
                description,
                publication_year: parseInt(publication_year) || null,
                isbn,
                cover_image_url,
                updated_at: knex.fn.now(),
                is_digital_available: !!is_digital_available,
                is_physical_available: !!is_physical_available,
                digital_price: digital_price ? parseFloat(digital_price) : null,
                physical_price: physical_price ? parseFloat(physical_price) : null,
                physical_stock: physical_stock ? parseInt(physical_stock) : 0,
                pdf_file_url: pdf_file_url || null
            });

        res.redirect('/admin/books');
    } catch (error) {
        console.error("Błąd edycji książki:", error);
        res.redirect(`/admin/books/edit/${req.params.id}?error=true`);
    }
});

// Ukrywanie książki (zamiast usuwania, po prostu odznaczamy dostępność)
router.post('/books/hide/:id', async (req, res) => {
    try {
        await knex('books').where('id', req.params.id).update({
            is_digital_available: false,
            is_physical_available: false,
            updated_at: knex.fn.now()
        });
        res.redirect('/admin/books');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/books');
    }
});

// Przywracanie ukrytej książki (jeśli była ukryta fizyczna, a ma stan magazynowy)
router.post('/books/restore/:id', async (req, res) => {
    try {
        const book = await knex('books').where('id', req.params.id).first();
        if (book) {
            await knex('books').where('id', req.params.id).update({
                is_digital_available: book.digital_price !== null,
                is_physical_available: book.physical_price !== null,
                updated_at: knex.fn.now()
            });
        }
        res.redirect('/admin/books');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/books');
    }
});

// Twarde usunięcie książki
router.post('/books/delete/:id', async (req, res) => {
    try {
        await knex('books').where('id', req.params.id).del();
        res.redirect('/admin/books');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/books');
    }
});

// ZARZĄDZANIE ZAMÓWIENIAMI

router.get('/orders', async (req, res) => {
    try {
        const orders = await knex('orders')
            .select('orders.*', 'books.title as book_title', 'books.cover_image_url')
            .leftJoin('books', 'orders.book_id', 'books.id')
            .orderBy('orders.created_at', 'desc');

        res.render('admin/orders', { orders });
    } catch (error) {
        console.error(error);
        res.render('admin/dashboard', { errorMessage: 'Błąd pobierania listy zamówień.' });
    }
});

// Zmiana statusu zamówienia
router.post('/orders/status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await knex('orders').where('id', req.params.id).update({ status, updated_at: knex.fn.now() });
        res.redirect('/admin/orders');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/orders');
    }
});

// ZARZĄDZANIE UŻYTKOWNIKAMI

router.get('/users', async (req, res) => {
    try {
        const users = await knex('users').select('id', 'username', 'email', 'role').orderBy('id', 'asc');
        res.render('admin/users_list', { users });
    } catch (error) {
        console.error(error);
        res.render('admin/dashboard', { errorMessage: 'Błąd pobierania listy użytkowników.' });
    }
});

// Usuwanie użytkownika
router.post('/users/delete/:id', async (req, res) => {
    try {
        // Zabezpieczenie przed usunięciem samego siebie
        if (parseInt(req.params.id) === req.session.userId) {
            return res.redirect('/admin/users');
        }
        await knex('users').where('id', req.params.id).del();
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

// Formularz edycji użytkownika (podstawowe dane)
router.get('/users/edit/:id', async (req, res) => {
    try {
        const user = await knex('users').where('id', req.params.id).first();
        if (!user) return res.redirect('/admin/users');
        res.render('admin/edit_user', { user });
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

// Zapis edytowanego użytkownika
router.post('/users/edit/:id', async (req, res) => {
    try {
        const { username, email, first_name, last_name } = req.body;
        await knex('users').where('id', req.params.id).update({
            username, email, first_name, last_name, updated_at: knex.fn.now()
        });
        res.redirect('/admin/users');
    } catch (error) {
        const user = { ...req.body, id: req.params.id };
        res.render('admin/edit_user', { user, errorMessage: 'Błąd podczas edycji użytkownika.' });
    }
});

// Zmiana roli (Admin/User)
router.post('/users/change-role', async (req, res) => {
    try {
        const { user_id, role } = req.body;

        // Zabezpieczenie przed odebraniem sobie uprawnień
        // Sprawdzamy, czy ID edytowanego usera to ID zalogowanego admina
        if (parseInt(user_id) === req.session.userId) {
            // Jeśli tak, przerywamy i nic nie zmieniamy
            return res.redirect('/admin/users');
        }

        await knex('users').where('id', user_id).update({ role });
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.redirect('/admin/users');
    }
});

module.exports = router;