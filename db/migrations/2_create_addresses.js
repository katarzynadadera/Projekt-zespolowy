exports.up = function(knex) {
  return knex.schema.createTable('addresses', function(table) {
    table.increments('id').primary();
    table.integer('user_id').references('users.id').onDelete('CASCADE').notNullable();
    table.string('street', 255).notNullable();
    table.string('house_number', 50).notNullable();
    table.string('apartment_number', 50).nullable();
    table.string('city', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    table.string('country', 100).nullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
  });
};
 
exports.down = function(knex) {
  return knex.schema.dropTable('addresses');
};