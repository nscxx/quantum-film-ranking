'use client';

import { useEffect, useMemo, useState } from 'react';
import { PROVINCES, SCORE_COLOR_BANDS } from '@/lib/order-race/config';
import type { ProvinceScore } from '@/lib/order-race/types';

type Coordinate = [number, number];
type PolygonCoordinates = Coordinate[][];
type Geometry =
  | { type: 'Polygon'; coordinates: PolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };
type MapFeature = {
  properties: { adcode: number | string; name: string };
  geometry: Geometry;
};
type FeatureCollection = { features: MapFeature[] };

const MAIN_BOUNDS = { minLongitude: 73.5, maxLongitude: 135.1, minLatitude: 18, maxLatitude: 53.6 };
const SOUTH_SEA_BOUNDS = { minLongitude: 106, maxLongitude: 123, minLatitude: 3.5, maxLatitude: 22 };

function createPath(geometry: Geometry, bounds = MAIN_BOUNDS, width = 760, height = 410) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const project = ([longitude, latitude]: Coordinate) => {
    const x = (longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude) * width;
    const y = (bounds.maxLatitude - latitude) / (bounds.maxLatitude - bounds.minLatitude) * height;
    return [x, y] as const;
  };
  return polygons
    .map((polygon) => polygon
      .map((ring) => ring
        .filter(([, latitude]) => bounds !== MAIN_BOUNDS || latitude >= MAIN_BOUNDS.minLatitude - .4)
        .map((point, index) => {
          const [x, y] = project(point);
          return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ') + ' Z')
      .join(' '))
    .join(' ');
}

export function ChinaScoreMap({ provinces, changedProvinceCode }: { provinces: ProvinceScore[]; changedProvinceCode: string | null }) {
  const [features, setFeatures] = useState<MapFeature[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/data/china-provinces.json')
      .then((response) => response.json() as Promise<FeatureCollection>)
      .then((collection) => {
        if (alive) setFeatures(collection.features);
      })
      .catch(() => {
        if (alive) setFeatures([]);
      });
    return () => { alive = false; };
  }, []);

  const scoreByCode = useMemo(() => new Map(provinces.map((province) => [province.code, province])), [provinces]);
  const provinceCodes = useMemo(() => new Set(PROVINCES.map((province) => province.code)), []);
  const mainFeatures = features.filter((feature) => provinceCodes.has(String(feature.properties.adcode) as (typeof PROVINCES)[number]['code']));
  const southSeaFeature = features.find((feature) => String(feature.properties.adcode) === '100000_JD');

  if (!mainFeatures.length) {
    return <div className="quantum-map-loading">地图数据载入中</div>;
  }

  return (
    <div className="quantum-map-canvas">
      <svg aria-label="中国省份积分热力地图" viewBox="0 0 860 500">
        <defs>
          <filter id="map-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="map-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#178cff" /><stop offset="1" stopColor="#06429e" /></linearGradient>
          <linearGradient id="map-top-cyan" x1=".18" y1="0" x2=".8" y2="1"><stop stopColor="#8de9ff" /><stop offset=".48" stopColor="#34c8ff" /><stop offset="1" stopColor="#168ce8" /></linearGradient>
          <linearGradient id="map-top-indigo" x1=".18" y1="0" x2=".8" y2="1"><stop stopColor="#d2c8ff" /><stop offset=".52" stopColor="#8f91ff" /><stop offset="1" stopColor="#5b54d9" /></linearGradient>
          <linearGradient id="map-top-purple" x1=".18" y1="0" x2=".8" y2="1"><stop stopColor="#e0b2ff" /><stop offset=".5" stopColor="#aa61ff" /><stop offset="1" stopColor="#7437d2" /></linearGradient>
          <linearGradient id="map-top-pink" x1=".18" y1="0" x2=".8" y2="1"><stop stopColor="#ffc1df" /><stop offset=".5" stopColor="#ff70af" /><stop offset="1" stopColor="#df397c" /></linearGradient>
          <linearGradient id="map-top-gold" x1=".18" y1="0" x2=".8" y2="1"><stop stopColor="#ffe9a2" /><stop offset=".5" stopColor="#ffc952" /><stop offset="1" stopColor="#eb8d19" /></linearGradient>
        </defs>
        <g className="quantum-map-perspective" transform="translate(16 28)">
          <g className="quantum-map-depth" transform="translate(0 27)">
            {mainFeatures.map((feature) => <path d={createPath(feature.geometry)} fill="url(#map-side)" key={`depth-${feature.properties.adcode}`} />)}
          </g>
          <g className="quantum-map-depth quantum-map-depth-mid" transform="translate(0 15)">
            {mainFeatures.map((feature) => <path d={createPath(feature.geometry)} key={`mid-${feature.properties.adcode}`} />)}
          </g>
          <g className="quantum-map-top" filter="url(#map-glow)">
            {mainFeatures.map((feature) => {
              const code = String(feature.properties.adcode);
              const province = scoreByCode.get(code as ProvinceScore['code']);
              const band = SCORE_COLOR_BANDS.find((item) => item.id === province?.band) ?? SCORE_COLOR_BANDS[0];
              return (
                <path
                  className={code === changedProvinceCode ? 'is-updated' : ''}
                  d={createPath(feature.geometry)}
                  fill={`url(#map-top-${band.id})`}
                  key={code}
                  data-province={feature.properties.name}
                >
                  <title>{feature.properties.name}：{province?.score.toLocaleString() ?? 0}分</title>
                </path>
              );
            })}
          </g>
        </g>
      </svg>
      {southSeaFeature && (
        <div className="quantum-south-sea">
          <svg aria-label="南海诸岛" viewBox="0 0 220 240">
            <path d={createPath(southSeaFeature.geometry, SOUTH_SEA_BOUNDS, 190, 205)} />
          </svg>
          <span>南海诸岛</span>
        </div>
      )}
    </div>
  );
}
