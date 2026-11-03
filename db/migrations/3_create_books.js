exports.up = function(knex) {
  return knex.schema
    .createTable('authors', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.timestamps(true, true);
    })
    .createTable('categories', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable().unique();
      table.timestamps(true, true);
    })
    .createTable('books', function(table) {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.string('isbn', 13).unique().nullable();
      table.integer('publication_year').nullable();
      table.string('cover_image_url').nullable();
     
      table.boolean('is_digital_available').defaultTo(false);
      table.decimal('digital_price', 8, 2).nullable();
      table.string('pdf_file_url').nullable();
     
      table.boolean('is_physical_available').defaultTo(false);
      table.integer('physical_stock').defaultTo(0);
      table.decimal('physical_price', 8, 2).nullable();
     
      table.integer('view_count').defaultTo(0);
 
      table.integer('author_id').references('authors.id').onDelete('SET NULL').nullable();
      table.integer('category_id').references('categories.id').onDelete('SET NULL').nullable();
 
      table.timestamps(true, true);
    });
};
 
exports.down = function(knex) {
  return knex.schema
    .dropTable('books')
    .dropTable('categories')
    .dropTable('authors');
};