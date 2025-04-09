import mysql from 'serverless-mysql';

const db = mysql({
  config: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE || 'gpa_analytics',
    user: process.env.MYSQL_USER || 'gpa_analytics_user',
    password: process.env.MYSQL_PASSWORD || 'your_secure_password',
  },
});

export async function query(
  q: string,
  values: (string | number | null)[] | null = null
) {
  try {
    const results = await db.query(q, values);
    await db.end();
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export default db; 