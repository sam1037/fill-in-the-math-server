import { query } from './db.js';
import { CreateUserDto } from '../types/db.types.js';

export async function seedUsers() {
  try {
    // Clear existing users (optional)
    await query('TRUNCATE users RESTART IDENTITY CASCADE');

    // Sample user data
    const users: CreateUserDto[] = [
      {
        username: 'admin',
        email: 'admin@fillmath.com',
        password_hash:
          '$2a$10$7v21QF6FjX.3pgBjjc7vNuIuuIpK3d2GJma8c3IgZiIMRDbckqJhu', // bycrpt (10) hash of 'admin'
        profile_picture: 1,
        user_type: 'Admin',
        experience: 1000,
      },
      {
        username: 'host_jane',
        email: 'jane@fillmath.com',
        password_hash:
          '$2a$10$Xw0kCGPkrP4hlF5SW5xqsuZxYxDQ3KAIWmaLsqSDlE4KO0u9NZrri', // bycrpt (10) hash of 'host'
        profile_picture: 2,
        user_type: 'Host',
        experience: 10,
      },
      {
        username: 'player_bob',
        email: 'bob@example.com',
        password_hash:
          '$2a$10$qzSaYfZSbmXTA1Nabab12O0kCTjm.GDvSnp64PxVRW.xVkd4CM4hS', // bycrpt (10) hash of 'bob'
        profile_picture: null,
        user_type: 'Player',
        experience: 20,
      },
      {
        username: 'player_alice',
        email: 'alice@example.com',
        password_hash:
          '$2a$10$O3rAObCIyVGnYaPKpS2GOekVb4q5RXBh12zYDcdoo6BvW/i0jIfMa', // bycrpt (10) hash of 'alice'
        profile_picture: 3,
        user_type: 'Player',
        experience: 40,
      },
    ];

    // Insert each user
    for (const user of users) {
      await query(
        `INSERT INTO users 
         (username, email, password_hash, profile_picture, user_type, experience) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.username,
          user.email,
          user.password_hash,
          user.profile_picture,
          user.user_type,
          user.experience,
        ]
      );
    }

    console.log('User data seeded successfully');
  } catch (error) {
    console.error('Error seeding user data:', error);
    throw error;
  }
}

// equivalent to "if __name__ == '__main__':"
function isRunningDirectly() {
  return process.argv[1]?.endsWith('seed.ts');
}

if (isRunningDirectly()) {
  console.log('Running seed script directly...');
  console.log('Seeding user data...');
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
