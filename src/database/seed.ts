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
          '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 of 'admin'
        current_ranking_score: 1000,
        profile_picture: '/profiles/admin.png',
        user_type: 'Admin',
      },
      {
        username: 'host_jane',
        email: 'jane@fillmath.com',
        password_hash:
          '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3', // SHA-256 of 'host'
        current_ranking_score: 800,
        profile_picture: '/profiles/jane.png',
        user_type: 'Host',
      },
      {
        username: 'player_bob',
        email: 'bob@example.com',
        password_hash:
          '5906ac361a137e2d286465cd6588ebb5ac3f5ae955001100bc41577c3d751764', // SHA-256 of 'player'
        current_ranking_score: 350,
        profile_picture: null,
        user_type: 'Player',
      },
      {
        username: 'player_alice',
        email: 'alice@example.com',
        password_hash:
          '5906ac361a137e2d286465cd6588ebb5ac3f5ae955001100bc41577c3d751764', // SHA-256 of 'player'
        current_ranking_score: 520,
        profile_picture: '/profiles/alice.jpg',
        user_type: 'Player',
      },
    ];

    // Insert each user
    for (const user of users) {
      await query(
        `INSERT INTO users 
         (username, email, password_hash, current_ranking_score, profile_picture, user_type) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.username,
          user.email,
          user.password_hash,
          user.current_ranking_score,
          user.profile_picture,
          user.user_type,
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
