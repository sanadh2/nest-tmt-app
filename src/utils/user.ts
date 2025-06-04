import { PublicUser, User } from 'src/drizzle/schema';

export const userToPublicUser = (user: User): PublicUser => {
  const { isDeleted, isVerified, password, ...publicUser } = user;
  return publicUser;
};
