import { apiFetch } from "@/lib/api/client";
import {
  userProfileResponseSchema,
  type UserProfile,
  type UserProfileInput,
} from "@/features/settings/types/user-profile";

export async function getUserProfile(): Promise<UserProfile> {
  const data = await apiFetch<UserProfile>("/api/user-profile");
  return userProfileResponseSchema.parse(data);
}

export async function updateUserProfile(input: UserProfileInput): Promise<UserProfile> {
  const data = await apiFetch<UserProfile>("/api/user-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return userProfileResponseSchema.parse(data);
}
