// Increase the timeout for all tests
jest.setTimeout(10000);

// Add custom matchers or global test configuration here if needed
import { testDataSource } from './test-database.config';

beforeAll(async () => {
  try {
    await testDataSource.initialize();
  } catch (error) {
    console.error('Error initializing test database:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  } catch (error) {
    console.error('Error destroying test database:', error);
  }
});
