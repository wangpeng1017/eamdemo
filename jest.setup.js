// Add custom jest matchers
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3001'
