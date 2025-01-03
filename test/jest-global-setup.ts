import { Client } from 'pg';

module.exports = async () => {
  // Create a new PostgreSQL client
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres', // Connect to default database first
  });

  try {
    await client.connect();

    // Drop the test database if it exists
    await client.query(`
      DROP DATABASE IF EXISTS workflow_engine_test;
    `);

    // Create a fresh test database
    await client.query(`
      CREATE DATABASE workflow_engine_test;
    `);
  } catch (error) {
    console.error('Error setting up test database:', error);
  } finally {
    await client.end();
  }
};
