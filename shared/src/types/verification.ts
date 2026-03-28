/** Элемент списка кандидатов на верификацию (ответ GET /users/moderation/verification-candidates). */
export type VerificationCandidateItem = {
  id: string;
  name: string;
  companyName: string | null;
  role: string;
  region: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  email: string;
};
