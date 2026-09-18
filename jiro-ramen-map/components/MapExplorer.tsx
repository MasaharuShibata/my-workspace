"use client";

import { useMemo, useState } from "react";
import type { Shop } from "@/lib/types";
import MapView from "./MapView";
import ShopCard from "./ShopCard";

type Props = {
  shops: Shop[];
  favoritedIds: Set<string>;
  isLoggedIn: boolean;
};

export default function MapExplorer({ shops, favoritedIds, isLoggedIn }: Props) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  const sortedShops = useMemo(
    () => [...shops].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [shops]
  );

  return (
    <div className="map-explorer">
      <MapView shops={shops} selectedShopId={selectedShopId} onSelectShop={setSelectedShopId} />
      <div className="shop-list">
        <h2 className="shop-list-title">おすすめ順</h2>
        {sortedShops.length === 0 && <p className="shop-list-empty">店舗がまだ登録されていません。</p>}
        {sortedShops.map((shop, index) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            rank={shop.score !== null ? index + 1 : undefined}
            isFavorited={favoritedIds.has(shop.id)}
            isLoggedIn={isLoggedIn}
            isSelected={shop.id === selectedShopId}
            onSelect={setSelectedShopId}
          />
        ))}
      </div>
    </div>
  );
}
