const express = require('express');
const router = express.Router();
const env = process.env.NODE_ENV || 'development';
const config = require('../knexfile.js')[env];
const knex = require('knex')(config);

// GET /search - Główna logika wyszukiwarki
router.get('/', async (req, res) => {
    try {
        const query = req.query.q || '';
        const searchField = req.query.field || 'everywhere';
        const lowerCaseQuery = query.toLowerCase();

        // 1: Generowanie podpowiedzi (Popularne tagi)
        // Pobieramy dane po to, by wyświetlić sugestie pod paskiem wyszukiwania
        
        // 1.1 Najpopularniejsze dostępne książki
        const popularBookTitlesRaw = await knex('books')
            .select('books.title as text')
            .where(function() {
                this.where('books.is_digital_available', true)
                    .orWhere(function() {
                        this.where('books.is_physical_available', true)
                            .where('books.physical_stock', '>', 0);
                    });
            })
            .orderBy('books.view_count', 'desc')
            .limit(4);

        // 1.2 Najpopularniejsi autorzy (na podstawie sumy wyświetleń ich książek)
        const popularAuthorNamesRaw = await knex('authors')
            .select('authors.name as text')
            .leftJoin('books', 'authors.id', 'books.author_id')
            .where(function() {
                this.where('books.is_digital_available', true)
                    .orWhere(function() {
                        this.where('books.is_physical_available', true)
                            .where('books.physical_stock', '>', 0);
                    });
            })
            .groupBy('authors.name')
            .orderByRaw('SUM(books.view_count) DESC')
            .limit(3);

        // 1.3 Łączenie i deduplikacja tagów
        let popularTags = [];
        
        popularBookTitlesRaw.forEach(item => popularTags.push({ text: item.text, field: 'title' }));
        popularAuthorNamesRaw.forEach(item => popularTags.push({ text: item.text, field: 'author' }));

        const uniquePopularTagsMap = new Map();
        popularTags.forEach(tag => {
            if (!uniquePopularTagsMap.has(tag.text.toLowerCase())) {
                uniquePopularTagsMap.set(tag.text.toLowerCase(), tag);
            }
        });
        popularTags = Array.from(uniquePopularTagsMap.values()).slice(0, 10);

        // 2: Właściwe wyszukiwanie

        // Jeśli brak zapytania, zwróć pusty widok z samymi tagami
        if (!query.trim()) {
            return res.render('search', {
                query: '',
                searchField: searchField,
                books: [],
                popularTags: popularTags
            });
        }

        // Budowanie głównego zapytania wyszukującego
        let queryBuilder = knex('books')
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
                'books.isbn',
                'authors.name as author_name',
                'categories.name as category_name'
            )
            .leftJoin('authors', 'books.author_id', 'authors.id')
            .leftJoin('categories', 'books.category_id', 'categories.id')
            // Filtrowanie tylko dostępnych produktów
            .where(function() {
                this.where('books.is_digital_available', true)
                    .orWhere(function() {
                        this.where('books.is_physical_available', true)
                            .where('books.physical_stock', '>', 0);
                    });
            });

        // Aplikowanie filtrów w zależności od wybranego pola wyszukiwania
        // Używamy whereRaw z parametrami (?) dla ochrony przed SQL Injection
        queryBuilder = queryBuilder.andWhere(function() {
            if (searchField === 'title') {
                this.whereRaw('LOWER(books.title) LIKE ?', [`%${lowerCaseQuery}%`]);
            } else if (searchField === 'author') {
                this.whereRaw('LOWER(authors.name) LIKE ?', [`%${lowerCaseQuery}%`]);
            } else if (searchField === 'isbn') {
                this.whereRaw('books.isbn LIKE ?', [`%${query}%`]);
            } else if (searchField === 'category') {
                this.whereRaw('LOWER(categories.name) LIKE ?', [`%${lowerCaseQuery}%`]);
            } else if (searchField === 'description') {
                this.whereRaw('LOWER(books.description) LIKE ?', [`%${lowerCaseQuery}%`]);
            } else { 
                // Tryb 'everywhere' - szuka wszędzie
                this.whereRaw('LOWER(books.title) LIKE ?', [`%${lowerCaseQuery}%`])
                    .orWhereRaw('LOWER(authors.name) LIKE ?', [`%${lowerCaseQuery}%`])
                    .orWhereRaw('books.isbn LIKE ?', [`%${query}%`])
                    .orWhereRaw('LOWER(categories.name) LIKE ?', [`%${lowerCaseQuery}%`])
                    .orWhereRaw('LOWER(books.description) LIKE ?', [`%${lowerCaseQuery}%`]);
            }
        });
            
        const books = await queryBuilder
            .orderBy('books.view_count', 'desc') // Najpopularniejsze wyniki jako pierwsze
            .limit(50);
        
        res.render('search', {
            query: query,
            searchField: searchField,
            books: books,
            popularTags: popularTags
        });

    } catch (error) {
        console.error('Błąd krytyczny wyszukiwarki:', error);
        res.status(500).render('search', {
            query: req.query.q || '',
            searchField: req.query.field || 'everywhere',
            books: [],
            popularTags: [],
            errorMessage: 'Przepraszamy, wystąpił błąd podczas wyszukiwania.'
        });
    }
});

module.exports = router;