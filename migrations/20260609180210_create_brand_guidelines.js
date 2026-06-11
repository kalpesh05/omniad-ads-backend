/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('brand_guidelines', table => {
    table.string('id', 36).primary();
    table.string('team_id', 36).notNullable().unique();
    table.string('brand_name', 100).notNullable();
    table.text('brand_voice').notNullable();
    table.text('faq_rules').nullable(); // JSON string containing an array of custom FAQs
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Add foreign key constraint to teams table
    table.foreign('team_id').references('id').inTable('teams').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('brand_guidelines');
};
