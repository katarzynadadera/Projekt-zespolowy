const { faker } = require('@faker-js/faker');

exports.seed = async function(knex) {
  await knex('books').del();
  await knex('authors').del();
  await knex('categories').del();

  // Autorzy książek
  const authorIds = await knex('authors').insert([
    { name: 'Stephen King' },
    { name: 'J.K. Rowling' },
    { name: 'George Orwell' },
    { name: faker.person.fullName() },
    { name: faker.person.fullName() },
    { name: faker.person.fullName() },
  ]).returning('id');

  const author1Id = authorIds[0].id;
  const author2Id = authorIds[1].id;
  const author3Id = authorIds[2].id;
  const allAuthorIds = authorIds.map(a => a.id);

  // Kategorie książek
  const categoryIds = await knex('categories').insert([
    { name: 'Horror' },
    { name: 'Fantasy' },
    { name: 'Dystopia' },
    { name: 'Science Fiction' },
    { name: 'Thriller' },
    { name: 'Romans' },
    { name: 'Biografia' },
  ]).returning('id');

  const category1Id = categoryIds[0].id;
  const category2Id = categoryIds[1].id;
  const category3Id = categoryIds[2].id;
  const allCategoryIds = categoryIds.map(c => c.id);

  // Własne książki z okładkami
  const existingBooks = [
    {
      // E-book i Książka
      title: 'It',
      description: 'Grupa dzieciaków stawia czoła potworowi.',
      isbn: '9788380311543',
      publication_year: 1986,
      cover_image_url: '/images/covers/it.jpg',
      is_digital_available: true,
      digital_price: 19.99,
      is_physical_available: true,
      physical_stock: 10,
      physical_price: 49.99,
      view_count: 1250,
      author_id: author1Id,
      category_id: category1Id
    },
    {
      // Tylko Książka
      title: 'Harry Potter i Kamień Filozoficzny',
      description: 'Pierwsza część przygód młodego czarodzieja.',
      isbn: '9788380310232',
      publication_year: 1997,
      cover_image_url: '/images/covers/harry_potter_i_kf.jpg',
      is_digital_available: false,
      digital_price: null,
      is_physical_available: true,
      physical_stock: 15,
      physical_price: 39.99,
      view_count: 2100,
      author_id: author2Id,
      category_id: category2Id
    },
    {
      // E-book i Książka
      title: '1984',
      description: 'Klasyczna powieść dystopijna o totalitarnym społeczeństwie.',
      isbn: '9788366470008',
      publication_year: 1949,
      cover_image_url: '/images/covers/1984.jpg',
      is_digital_available: true,
      digital_price: 15.99,
      is_physical_available: true,
      physical_stock: 8,
      physical_price: 29.99,
      view_count: 1800,
      author_id: author3Id,
      category_id: category3Id
    },
    {
      // E-book i Książka
      title: 'Lśnienie',
      description: 'Zimowa izolacja w hotelu Overlook.',
      isbn: '9788380310256',
      publication_year: 1977,
      cover_image_url: '/images/covers/lsnienie.jpg',
      is_digital_available: true,
      digital_price: 17.99,
      is_physical_available: true,
      physical_stock: 7,
      physical_price: 45.00,
      view_count: 980,
      author_id: author1Id,
      category_id: category1Id
    },
    {
      // Tylko E-book
      title: 'Folwark Zwierzęcy',
      description: 'Satyra na totalitaryzm.',
      isbn: '9788380310263',
      publication_year: 1945,
      cover_image_url: '/images/covers/folwark_zwierzecy.jpg',
      is_digital_available: true,
      digital_price: 12.99,
      is_physical_available: false,
      physical_stock: 0,
      physical_price: null,
      view_count: 750,
      author_id: author3Id,
      category_id: category3Id
    }
  ];

  // Dodatkowe książki bez okładek, generowane przez fakera
  const generatedBooks = [];
  const numberOfBooksToGenerate = 65;

  for (let i = 0; i < numberOfBooksToGenerate; i++) {
    const hasDigital = faker.datatype.boolean();
    const hasPhysical = faker.datatype.boolean();
    
    const isDigitalAvailable = hasDigital || !hasPhysical;
    const isPhysicalAvailable = hasPhysical;

    const physicalStock = isPhysicalAvailable ? faker.number.int({ min: 0, max: 20 }) : 0;

    let isbn = faker.commerce.isbn({ variant: 13 });
    if (isbn.length > 13) {
      isbn = isbn.substring(0, 13);
    }

    const basePrice = faker.number.int({ min: 10, max: 50 });

    generatedBooks.push({
      title: faker.lorem.words({ min: 2, max: 5 }),
      description: faker.lorem.paragraphs(2),
      isbn: isbn,
      publication_year: faker.date.past({ years: 50, refDate: '2020-01-01' }).getFullYear(),
      cover_image_url: '/images/covers/no_cover.jpg',
      is_digital_available: isDigitalAvailable,
      digital_price: isDigitalAvailable ? parseFloat(basePrice * 0.6).toFixed(2) : null,
      is_physical_available: isPhysicalAvailable,
      physical_stock: physicalStock,
      physical_price: isPhysicalAvailable ? parseFloat(basePrice).toFixed(2) : null,
      view_count: faker.number.int({ min: 0, max: 500 }),
      author_id: faker.helpers.arrayElement(allAuthorIds),
      category_id: faker.helpers.arrayElement(allCategoryIds)
    });
  }

  // Wstaw wszystkie książki
  await knex('books').insert(existingBooks.concat(generatedBooks));
};
