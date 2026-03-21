"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ListingCard } from "./listing-card";

type Listing = {
  id: string;
  title: string;
  description: string;
  photos: string[];
  price: number | null;
  isPromoted: boolean;
  createdAt: string;
  user?: { id: string; name: string; companyName: string | null; avatarUrl: string | null; role: string };
  category?: { id: number; name: string; type: string };
};

/**
 * Displays a grid of recent listings loaded from the API.
 */
export function ListingsFeed() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>("/listings", { params: { limit: "4" } })
      .then((res) => setListings((res.data.items ?? []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        Пока нет объявлений. Будьте первым!
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
