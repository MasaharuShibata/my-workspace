"use client";

import type { Shop } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";

type Props = {
  shop: Shop;
  rank?: number;
  isFavorited: boolean;
  isLoggedIn: boolean;
  isSelected: boolean;
  onSelect: (shopId: string) => void;
};

export default function ShopCard({ shop, rank, isFavorited, isLoggedIn, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`shop-card${isSelected ? " is-selected" : ""}`}
      onClick={() => onSelect(shop.id)}
    >
      <div className="shop-card-main">
        {rank !== undefined && <span className="shop-rank">{rank}</span>}
        <div>
          <p className="shop-name">{shop.name}</p>
          <p className="shop-address">{shop.address}</p>
        </div>
      </div>
      <div className="shop-card-side">
        {shop.rating !== null ? (
          <p className="shop-rating">
            ★ {shop.rating.toFixed(1)}
            <span className="shop-review-count">({shop.review_count ?? 0}件)</span>
          </p>
        ) : (
          <p className="shop-rating shop-rating-unsynced">未取得</p>
        )}
        <FavoriteButton shopId={shop.id} initialFavorited={isFavorited} isLoggedIn={isLoggedIn} />
      </div>
    </button>
  );
}
