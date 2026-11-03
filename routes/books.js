const express = require('express');
const router = express.Router();
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);

// GET / - Przeglądanie listy książek z filtrowaniem i sortowaniem
router.get('/', async (req, res) => {
    try {
        // Parametry filtrowania i sortowania z URL
        const sortBy = req.query.sort || 'popularity';
        const selectedCategory = req.query.category || '';
        const selectedType = req.query.type || '';

        // Pobranie listy kategorii do paska bocznego
        const categories = await knex('categories').select('id', 'name').orderBy('name');

        // Bazowe zapytanie pobierające książki wraz z autorem i kategorią
        let query = knex('books')
            .select(
                'books.id',
                'books.title',
                'books.description',
                'books.cover_image_url',
                'books.is_digital_available',
                'books.digital_price',
                'books.is_physical_available',
                'books.physical_stock',
                'books.physical_price',
                'books.view_count',
                'authors.name as author_name',
                'categories.name as category_name'
            )
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .leftJoin('categories', 'books.category_id', 'categories.id')
            .where(function() {
                // Pokazuj tylko dostępne książki (cyfrowe lub fizyczne ze stanem > 0)
                this.where('books.is_digital_available', true)
                    .orWhere(function() {
                        this.where('books.is_physical_available', true)
                            .where('books.physical_stock', '>', 0);
                    });
            });

        // Filtr kategorii
        if (selectedCategory) {
            query = query.where('books.category_id', selectedCategory);
        }

        // Filtr formatu (E-book / Fizyczna / Oba)
        if (selectedType === 'digital') {
            query = query.where('books.is_digital_available', true);
        } else if (selectedType === 'physical') {
            query = query.where('books.is_physical_available', true)
                         .where('books.physical_stock', '>', 0);
        } else if (selectedType === 'both') {
            query = query.where('books.is_digital_available', true)
                         .where('books.is_physical_available', true)
                         .where('books.physical_stock', '>', 0);
        }

        // Logika sortowania
        switch(sortBy) {
            case 'title_asc':
                query = query.orderBy('books.title', 'asc');
                break;
            case 'title_desc':
                query = query.orderBy('books.title', 'desc');
                break;
            case 'price_asc':
                // Sortuj od najniższej ceny (wybiera niższą z dwóch formatów jeśli oba dostępne)
                query = query.orderByRaw(`
                    CASE 
                        WHEN books.is_digital_available AND books.is_physical_available 
                            THEN LEAST(books.digital_price, books.physical_price)
                        WHEN books.is_digital_available 
                            THEN books.digital_price
                        ELSE books.physical_price
                    END ASC NULLS LAST
                `);
                break;
            case 'price_desc':
                // Sortuj od najwyższej ceny
                query = query.orderByRaw(`
                    CASE 
                        WHEN books.is_digital_available AND books.is_physical_available 
                            THEN GREATEST(books.digital_price, books.physical_price)
                        WHEN books.is_digital_available 
                            THEN books.digital_price
                        ELSE books.physical_price
                    END DESC NULLS LAST
                `);
                break;
            case 'popularity':
            default:
                query = query.orderBy('books.view_count', 'desc');
                break;
        }

        const books = await query;
        
        res.render('browse', { 
            books: books,
            categories: categories,
            sortBy: sortBy,
            selectedCategory: selectedCategory,
            selectedType: selectedType
        });
    } catch (error) {
        console.error('Błąd podczas pobierania książek:', error);
        res.status(500).render('browse', { 
            books: [], 
            categories: [],
            sortBy: 'popularity',
            selectedCategory: '',
            selectedType: '',
            errorMessage: 'Nie udało się załadować listy książek.' 
        });
    }
});

// GET /:id - Szczegóły konkretnej książki
router.get('/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        const book = await knex('books')
            .select(
                'books.*',
                'authors.name as author_name',
                'categories.name as category_name'
            )
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .leftJoin('categories', 'books.category_id', 'categories.id')
            .where('books.id', bookId)
            .first();

        if (!book) {
            return res.status(404).render('book_details', { errorMessage: 'Książka nie została znaleziona.' });
        }

        // Inkrementacja licznika odwiedzin
        await knex('books')
            .where('id', bookId)
            .increment('view_count', 1);

        res.render('book_details', { book: book });
    } catch (error) {
        console.error(`Błąd podczas pobierania szczegółów książki [ID: ${bookId}]:`, error);
        res.status(500).render('book_details', { errorMessage: 'Nie udało się załadować szczegółów książki.' });
    }
});

module.exports = router;