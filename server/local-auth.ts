import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createLocalUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): Promise<User> {
  const passwordHash = await hashPassword(data.password);
  
  const user = await storage.createUser({
    email: data.email,
    passwordHash,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    role: data.role || "user",
    authProvider: "local",
    isActive: "true",
  });
  
  return user;
}

export async function authenticateLocalUser(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  const user = await storage.getUserByEmail(email);
  
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  
  if (user.authProvider !== "local") {
    return { success: false, error: "This account uses a different login method" };
  }
  
  if (user.isActive !== "true") {
    return { success: false, error: "Account is deactivated" };
  }
  
  if (!user.passwordHash) {
    return { success: false, error: "Password not set for this account" };
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }
  
  // Update last login
  await storage.updateUser(user.id, { lastLoginAt: new Date() });
  
  return { success: true, user };
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return storage.getUserByEmail(email);
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  const passwordHash = await hashPassword(newPassword);
  await storage.updateUser(userId, { passwordHash });
  return true;
}

export async function getLocalUsers(): Promise<User[]> {
  return storage.getLocalUsers();
}

export async function deactivateUser(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  await storage.updateUser(userId, { isActive: "false" });
  return true;
}

export async function activateUser(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }
  
  await storage.updateUser(userId, { isActive: "true" });
  return true;
}
