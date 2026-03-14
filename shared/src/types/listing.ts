export enum ListingStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  MODERATION = "moderation",
}

export type Listing = {
  id: string;
  userId: string;
  categoryId: number;
  title: string;
  description: string;
  region: string | null;
  photos: string[];
  price: number | null;
  isPromoted: boolean;
  status: ListingStatus;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    companyName: string | null;
    avatarUrl: string | null;
    role: string;
  };
  category?: {
    id: number;
    name: string;
    type: string;
  };
};

export type CreateListingPayload = {
  categoryId: number;
  title: string;
  description: string;
  region?: string;
  photos: string[];
  price?: number;
};

export type UpdateListingPayload = Partial<CreateListingPayload> & {
  status?: ListingStatus;
};

export type ListingFilters = {
  categoryId?: number;
  categoryType?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "date" | "price";
  sortOrder?: "asc" | "desc";
};
