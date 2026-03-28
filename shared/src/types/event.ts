export type EventRsvpStatus = "going" | "maybe" | "not_going";

export type EventPublicUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  isOnline: boolean;
  venue: string | null;
  creatorId: string;
  communityId: string | null;
  createdAt: string;
  updatedAt: string;
  creator: EventPublicUser;
  community: { id: string; title: string } | null;
  attendeeCount: number;
  myRsvp: EventRsvpStatus | null;
};

export type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  isOnline: boolean;
  venue: string | null;
  creatorId: string;
  communityId: string | null;
  createdAt: string;
  updatedAt: string;
  creator: EventPublicUser;
  community: { id: string; title: string } | null;
  counts: {
    going: number;
    maybe: number;
    notGoing: number;
  };
  attendees: {
    going: EventPublicUser[];
    maybe: EventPublicUser[];
    notGoing: EventPublicUser[];
  };
  myRsvp: EventRsvpStatus | null;
  canManage: boolean;
};
