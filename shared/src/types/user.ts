export enum UserRole {
  SUPPLIER = "supplier",
  BUILDER = "builder",
  EQUIPMENT = "equipment",
  CLIENT = "client",
}

export type User = {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  name: string;
  companyName: string | null;
  description: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};

export type Manager = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  position: string | null;
};

export type UserProfile = User & {
  managers: Manager[];
  listingsCount: number;
};

export type RegisterPayload = {
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  name: string;
  companyName?: string;
  description: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};
