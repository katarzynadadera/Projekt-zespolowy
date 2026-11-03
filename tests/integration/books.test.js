const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Katalog książek (books.js)', () => {

    let testCategoryId;
    let testAuthorId;
    let digitalBookId;
    let physicalBookId;

    beforeAll(async () => {
        // Inicjalizacja struktury słownikowej na potrzeby filtrowania wyników
        const [category] = await knex('categories').insert({ name: 'Kategoria Testowa' }).returning('id');
        testCategoryId = typeof category === 'object' ? category.id : category;

        const [author] = await knex('authors').insert({ name: 'Autor Testowy' }).returning('id');
        testAuthorId = typeof author === 'object' ? author.id : author;

        const [b1] = await knex('books').insert({
            title: 'A - Cyfrowa Przygoda',
            category_id: testCategoryId,
            author_id: testAuthorId,
            is_digital_available: true,
            digital_price: '15.00',
            is_physical_available: false,
            view_count: 100
        }).returning('id');
        digitalBookId = typeof b1 === 'object' ? b1.id : b1;

        const [b2] = await knex('books').insert({
            title: 'Z - Fizyczna Opowieść',
            category_id: testCategoryId,
            author_id: testAuthorId,
            is_digital_available: false,
            is_physical_available: true,
            physical_price: '50.00',
            physical_stock: 5,
            view_count: 10
        }).returning('id');
        physicalBookId = typeof b2 === 'object' ? b2.id : b2;
    });

    afterAll(async () => {
        await knex('books').whereIn('id', [digitalBookId, physicalBookId]).del();
        await knex('authors').where('id', testAuthorId).del();
        await knex('categories').where('id', testCategoryId).del();
        await knex.destroy();
    });

    describe('GET /browse (Filtrowanie i Sortowanie)', () => {
        test('powinno zwrócić status 200 dla domyślnego katalogu', async () => {
            const response = await request(app).get('/browse'); 
            expect(response.statusCode).toBe(200);
        });

        test('powinno obsłużyć filtrowanie po kategorii i typie', async () => {
            // Weryfikacja instrukcji warunkowych obsługujących parametry query
            await request(app).get(`/browse?category=${testCategoryId}&type=digital`);
            await request(app).get('/browse?type=physical');
            const response = await request(app).get('/browse?type=both');
            
            expect(response.statusCode).toBe(200);
        });

        test('powinno obsłużyć wszystkie rodzaje sortowania (switch case)', async () => {
            // Weryfikacja logiki bloku switch do obsługi silnika renderowania
            await request(app).get('/browse?sort=title_asc');
            await request(app).get('/browse?sort=title_desc');
            await request(app).get('/browse?sort=price_asc');
            const response = await request(app).get('/browse?sort=price_desc');
            
            expect(response.statusCode).toBe(200);
        });
    });

    describe('GET /browse/:id (Szczegóły konkretnej książki)', () => {
        test('powinno wyświetlić szczegóły i zwiększyć view_count', async () => {
            const before = await knex('books').where('id', digitalBookId).first();
            const initialViews = before.view_count || 0;

            const response = await request(app).get(`/browse/${digitalBookId}`);
            expect(response.statusCode).toBe(200);
            
            // Weryfikacja asynchronicznej inkrementacji statystyk pobierania
            const after = await knex('books').where('id', digitalBookId).first();
            expect(after.view_count).toBe(initialViews + 1);
        });

        test('powinno zwrócić 404 dla nieistniejącego ID książki', async () => {
            const response = await request(app).get('/browse/999999');
            expect(response.statusCode).toBe(404);
            expect(response.text).toContain('nie została znaleziona'); 
        });
    });
});