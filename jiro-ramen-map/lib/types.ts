export type Shop = {
  id: string;
  name: string;
  address: string;
  prefecture: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  rating: number | null;
  review_count: number | null;
  score: number | null;
  synced_at: string | null;
  created_by: string | null;
  created_at: string;
};
