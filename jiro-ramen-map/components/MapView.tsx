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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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
    const marker = selectedShopId ? markersRef.current.get(selectedShopId) : null;
    const position = marker?.getPosition();
    if (map && position) {
      map.panTo(position);
    }
  }, [selectedShopId]);

  if (loadError) {
    return <div className="map-fallback">{loadError}</div>;
  }

  return <div ref={mapDivRef} className="map-view" />;
}
