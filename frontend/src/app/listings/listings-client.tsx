"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingCard } from "@/components/features/listing-card";
import { useAuthStore } from "@/lib/store";
import { useDebounce } from "@/lib/hooks";
import { api } from "@/lib/api";

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

const TABS = [
  { value: "all", label: "Все" },
  { value: "builders", label: "Строители" },
  { value: "materials", label: "Материалы" },
  { value: "land", label: "Недвижимость" },
  { value: "equipment", label: "Техника" },
];

export function ListingsPageClient() {
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("categoryType") || "all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (activeTab !== "all") params.categoryType = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api<any>("/listings", { params });
      setListings(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Доска объявлений</h1>
        {isAuthenticated && (
          <Link href="/listings/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Разместить объявление
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск объявлений..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setPage(1);
        }}
        className="mb-6"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border bg-card p-16 text-center">
          <p className="text-lg text-muted-foreground">Объявления не найдены</p>
          <p className="mt-1 text-sm text-muted-foreground">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {page} из {totalPages}
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

