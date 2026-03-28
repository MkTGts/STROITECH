export type ContactRecommendationItem = {
  id: string;
  name: string;
  companyName: string | null;
  role: string;
  region: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  hint?: string;
};
