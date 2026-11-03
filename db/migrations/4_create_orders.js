exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.increments('id').primary();
    table.integer('user_id').references('users.id').onDelete('SET NULL').nullable();
    table.integer('book_id').references('books.id').notNullable();
    
    table.string('email', 255).notNullable();
    table.string('first_name', 255).notNullable();
    table.string('last_name', 255).notNullable();
    table.string('street', 255).notNullable();
    table.string('house_number', 50).notNullable();
    table.string('city', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    
    table.decimal('total_price', 10, 2).notNullable();
    // Statusy: 'new', 'paid', 'shipped', 'completed', 'cancelled'
    table.string('status').defaultTo('new');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};