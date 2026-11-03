exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('username', 255).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();

    table.string('role').defaultTo('user');
   
    table.string('first_name', 255).nullable();
    table.string('last_name', 255).nullable();
 
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};
 
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};