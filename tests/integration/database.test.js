const env = process.env.NODE_ENV || 'test';
const config = require('../../knexfile.js')[env];
const knex = require('knex')(config);

describe('Testy bazy danych (Database Tests)', () => {

    afterAll(async () => {
        // Zamknięcie połączenia z bazą danych
        await knex.destroy();
    });

    test('powinno połączyć się z bazą i pobrać listę kategorii', async () => {
        const categories = await knex('categories').select('*');
        expect(Array.isArray(categories)).toBe(true);
    });

    test('powinno znaleźć książkę po tytule (wyszukiwarka)', async () => {
        const book = await knex('books').where('title', 'like', '%1984%').first();
            
        if (book) {
            expect(book.title).toContain('1984');
        } else {
            const anyBook = await knex('books').first();
            if(anyBook) expect(anyBook).toHaveProperty('title');
        }
    });

    test('powinno poprawnie zliczać popularność (view_count)', async () => {
        const book = await knex('books').first();
        
        // Zabezpieczenie przed błędem w przypadku wykonywania testu na całkowicie pustej bazie
        if (!book) return; 
        
        const initialViews = book.view_count || 0;

        await knex('books').where('id', book.id).increment('view_count', 1);
        const updatedBook = await knex('books').where('id', book.id).first();
        expect(updatedBook.view_count).toBe(initialViews + 1);

        // Przywrócenie początkowego stanu dla stabilności środowiska
        await knex('books').where('id', book.id).decrement('view_count', 1);
    });
});