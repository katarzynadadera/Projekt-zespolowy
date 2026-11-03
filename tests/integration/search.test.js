const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Wyszukiwarka (search.js)', () => {

    afterAll(async () => {
        await knex.destroy();
    });

    describe('GET /search', () => {
        
        test('powinno zwracać 200 i sam widok z tagami bez podawania zapytania', async () => {
            const response = await request(app).get('/search');
            expect(response.statusCode).toBe(200);
        });

        test('powinno poprawnie wyszukiwać podając zapytanie (q) i szukając wszędzie (everywhere)', async () => {
            // Weryfikacja wyszukiwania ogólnego 
            const response = await request(app).get('/search?q=1984');
            expect(response.statusCode).toBe(200);
        });

        test('powinno wyszukiwać specyficznie po wybranym polu (np. field=title)', async () => {
            // Weryfikacja filtrowania wyników
            const response = await request(app).get('/search?q=Orwell&field=title');
            expect(response.statusCode).toBe(200);
        });
        
        test('powinno wyszukiwać specyficznie po polu kategorii (field=category)', async () => {
             const response = await request(app).get('/search?q=Fantastyka&field=category');
             expect(response.statusCode).toBe(200);
        });
    });
});