export type CommunityMemberRole = "admin" | "moderator" | "member";

export type CommunityListItem = {
  id: string;
  title: string;
  description: string | null;
  region: string | null;
  creatorId: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
};

export type CommunityDetail = {
  id: string;
  title: string;
  description: string | null;
  region: string | null;
  creatorId: string;
  memberCount: number;
  postCount: number;
  albumCount: number;
  myRole: CommunityMemberRole | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityMemberRow = {
  role: CommunityMemberRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    companyName: string | null;
    role: string;
    isVerified: boolean;
  };
};
