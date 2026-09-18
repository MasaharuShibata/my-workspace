"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { Shop } from "@/lib/types";

type Props = {
  shops: Shop[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
};

const JAPAN_CENTER = { lat: 35.681236, lng: 139.767125 };
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function MapView({ shops, selectedShopId, onSelectShop }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const SELECTED_ZOOM = 16;

  useEffect(() => {
    if (!apiKey) {
      setLoadError("Google Maps APIキーが設定されていません。");
      return;
    }
    if (!mapDivRef.current || mapRef.current) return;

    const loader = new Loader({ apiKey, version: "weekly" });

    loader
      .importLibrary("maps")
      .then(() => {
        if (!mapDivRef.current) return;
        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: JAPAN_CENTER,
          zoom: 6,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        setIsMapReady(true);
      })
      .catch(() => setLoadError("地図の読み込みに失敗しました。"));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const shopsWithLocation = shops.filter((s) => s.lat !== null && s.lng !== null);
    if (shopsWithLocation.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    shopsWithLocation.forEach((shop) => {
      const position = { lat: shop.lat as number, lng: shop.lng as number };
      const marker = new google.maps.Marker({
        map,
        position,
        title: shop.name,
      });
      marker.addListener("click", () => onSelectShop(shop.id));
      markersRef.current.set(shop.id, marker);
      bounds.extend(position);
    });

    map.fitBounds(bounds);
  }, [shops, onSelectShop, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !selectedShopId) return;

    const marker = markersRef.current.get(selectedShopId);
    const position = marker?.getPosition();
    if (!marker || !position) return;

    map.panTo(position);
    if ((map.getZoom() ?? 0) < SELECTED_ZOOM) {
      map.setZoom(SELECTED_ZOOM);
    }

    const shop = shops.find((s) => s.id === selectedShopId);
    if (infoWindow && shop) {
      const ratingText =
        shop.rating !== null ? `★ ${shop.rating.toFixed(1)}(${shop.review_count ?? 0}件)` : "評価未取得";

      // 店名は利用者が入力した文字列のため、innerHTMLではなくtextContentで
      // DOM要素を組み立てて安全に表示する(HTML/スクリプトとして解釈されないようにする)。
      const content = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.style.fontWeight = "700";
      nameEl.style.marginBottom = "2px";
      nameEl.textContent = shop.name;
      const ratingEl = document.createElement("div");
      ratingEl.style.fontSize = "0.85em";
      ratingEl.style.color = "#82796c";
      ratingEl.textContent = ratingText;
      content.append(nameEl, ratingEl);

      infoWindow.setContent(content);
      infoWindow.open({ map, anchor: marker });
    }
  }, [selectedShopId, shops]);

  if (loadError) {
    return <div className="map-fallback">{loadError}</div>;
  }

  return <div ref={mapDivRef} className="map-view" />;
}
