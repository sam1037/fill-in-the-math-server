// User role type definition
// ? why not placed under User?
export type UserType = 'Player' | 'Host' | 'Admin';

// User model interface
export interface User {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  date_registered: Date;
  profile_picture: number | null;
  user_type: UserType;
  experience: number;
}

// Type for creating a new user (without auto-generated fields)
// ?
export type CreateUserDto = Omit<User, 'user_id' | 'date_registered'> & {
  date_registered?: Date;
};

// Type for updating a user (all fields optional)
//?
export type UpdateUserDto = Partial<Omit<User, 'user_id' | 'date_registered'>>;
