exports.up = function(knex) {
  return knex.schema.createTable('cart_items', function(table) {
    table.increments('id').primary();
    table.integer('user_id').references('users.id').onDelete('CASCADE').notNullable();
    table.integer('book_id').references('books.id').onDelete('CASCADE').notNullable();
    table.string('format').notNullable();
    table.integer('quantity').defaultTo(1);
    table.timestamps(true, true);
    
    // Zapobiega duplikatom
    table.unique(['user_id', 'book_id', 'format']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('cart_items');
};