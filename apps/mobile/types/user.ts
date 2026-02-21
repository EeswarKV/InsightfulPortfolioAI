export type UserRole = "manager" | "client";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  manager_id: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
}
