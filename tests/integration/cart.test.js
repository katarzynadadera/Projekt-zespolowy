const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Mechanika koszyka (cart.js)', () => {
    
    const agent = request.agent(app);
    let testUserId;
    let testBookId;

    beforeAll(async () => {
        // Inicjalizacja konta i persystencja uwierzytelnionej sesji testowej
        await knex('users').where('email', 'koszyk@ksiegarnia.pl').del();
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('Haslo123!', 10);
        
        const [user] = await knex('users').insert({
            username: 'test_koszyk',
            email: 'koszyk@ksiegarnia.pl',
            password_hash: hash,
            first_name: 'Jan',
            last_name: 'Koszykowy'
        }).returning('id');
        testUserId = typeof user === 'object' ? user.id : user;

        await agent.post('/login').send({
            email: 'koszyk@ksiegarnia.pl',
            password: 'Haslo123!'
        });

        const [book] = await knex('books').insert({
            title: 'Książka do testowania koszyka',
            is_physical_available: true,
            physical_price: '50.00',
            is_digital_available: true,
            digital_price: '30.00'
        }).returning('id');
        testBookId = typeof book === 'object' ? book.id : book;
    });

    afterAll(async () => {
        await knex('cart_items').where('user_id', testUserId).del();
        await knex('books').where('id', testBookId).del();
        await knex('users').where('id', testUserId).del();
        await knex.destroy();
    });

    describe('POST /cart/add (Dodawanie produktów)', () => {
        test('powinno zablokować niezalogowanego gościa (zwrócić 401 i JSON z redirectUrl)', async () => {
            // Generowanie żądania poza zakresem sesji agenta 
            const response = await request(app).post('/cart/add').send({
                book_id: testBookId,
                format: 'digital'
            });
            
            expect(response.statusCode).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.redirectUrl).toBe('/login');
        });

        test('powinno pomyślnie dodać nowy produkt do koszyka i przeliczyć sumę', async () => {
            const response = await agent.post('/cart/add').send({
                book_id: testBookId,
                format: 'physical'
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.cartCount).toBe(1);
            expect(response.body.cartTotal).toBe('50.00'); 
            expect(response.body.addedItem.format).toBe('physical');
        });

        test('powinno po prostu zwiększyć ilość (quantity), jeśli produkt już jest w koszyku', async () => {
            const response = await agent.post('/cart/add').send({
                book_id: testBookId,
                format: 'physical'
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.cartCount).toBe(2); 
            expect(response.body.cartTotal).toBe('100.00'); 
        });
    });

    describe('POST /cart/remove (Usuwanie z koszyka)', () => {
        test('powinno usunąć produkt z użyciem formatu string z frontendu (cart-item-X-format)', async () => {
            const response = await agent.post('/cart/remove').send({
                cart_item_id: `cart-item-${testBookId}-physical` 
            });

            expect(response.statusCode).toBe(302); 

            // Weryfikacja operacji na warstwie bazy danych
            const items = await knex('cart_items').where({ user_id: testUserId, book_id: testBookId });
            expect(items.length).toBe(0);
        });

        test('powinno usunąć produkt używając klasycznego numerycznego ID', async () => {
            // Bezpośrednie wstrzyknięcie rekordu testowego
            const [inserted] = await knex('cart_items').insert({
                user_id: testUserId,
                book_id: testBookId,
                format: 'digital',
                quantity: 1
            }).returning('id');
            
            const cartItemId = typeof inserted === 'object' ? inserted.id : inserted;

            const response = await agent.post('/cart/remove').send({
                cart_item_id: cartItemId
            });

            expect(response.statusCode).toBe(302);

            const itemCheck = await knex('cart_items').where('id', cartItemId).first();
            expect(itemCheck).toBeUndefined();
        });
    });
});