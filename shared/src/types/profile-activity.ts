export type ProfileActivityType = "listing" | "album" | "object_stage";

export type ProfileActivityItem = {
  id: string;
  type: ProfileActivityType;
  occurredAt: string;
  title: string;
  subtitle: string | null;
  path: string;
  imageUrl: string | null;
};
