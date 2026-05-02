import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Source, Layer, useControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { Loader2, Layers } from 'lucide-react';
import { DARK_MAP_STYLE } from './mapStyles';

const INITIAL_VIEW_STATE = {
  longitude: 109.5,
  latitude: 4.0,
  zoom: 5.2,
  pitch: 0,
  bearing: 0,
};

// Transparent cyan → bright cyan → near-white at max density
const HEATMAP_COLOR_RANGE = [
  [0, 240, 255, 0],
  [0, 200, 240, 80],
  [0, 240, 255, 150],
  [80, 255, 230, 200],
  [180, 255, 245, 230],
  [230, 255, 255, 255],
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Deposit', label: 'Deposit' },
  { value: 'Occurrence', label: 'Occurrence' },
  { value: 'Showing', label: 'Showing' },
];

// Top deposit types (simplified for UI clarity)
const DEP_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'alluvial placer', label: 'Alluvial Placer' },
  { value: 'carbonatite', label: 'Carbonatite' },
  { value: 'alkaline igneous', label: 'Alkaline Igneous' },
  { value: 'ion adsorption clay', label: 'Ion Adsorption Clay' },
  { value: 'shoreline placer', label: 'Shoreline Placer' },
  { value: 'laterite', label: 'Laterite' },
];

function scoreToColor(score) {
  // 0–100 score → cyan with alpha proportional to score
  const alpha = Math.round(100 + (score / 100) * 155);
  return [0, 220, 255, alpha];
}

export default function REEMapViz({ zones = [], height = 480, className = '' }) {
  const mapRef = useRef(null); // exposed for future Three.js viewport sync
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepType, setFilterDepType] = useState('all');
  const [hoverInfo, setHoverInfo] = useState(null);
  const [reeData, setReeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetch('/ree-malaysia-slim.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(raw => {
        console.log('Loaded', raw.length, 'Malaysia REE deposits');
        setReeData(raw);
        setIsLoading(false);
      })
      .catch(err => {
        setLoadError(err.message);
        setIsLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    return reeData; // No filtering, show all data
  }, [reeData]);

  // Convert array data to GeoJSON FeatureCollection
  const depositsGeoJSON = useMemo(() => {
    console.log('Creating GeoJSON with', filteredData.length, 'features');
    return {
      type: 'FeatureCollection',
      features: filteredData.map((d, i) => ({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [d[0], d[1]] },
        properties: { name: d[2], type: d[3] },
      })),
    };
  }, [filteredData]);

  return (
    <div
      id="ree-map-container"
      className={`panel-inset ${className}`}
      style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden' }}
    >
      {/* Header bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(to bottom, rgba(5,8,31,0.92) 0%, rgba(5,8,31,0) 100%)',
        }}
      >
        <Layers size={13} style={{ color: '#00f0ff', flexShrink: 0 }} />
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(0,240,255,0.85)', textTransform: 'uppercase' }}
        >
          Malaysia REE Deposits · {filteredData.length.toLocaleString()} sites
        </span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="map-filter-select"
            aria-label="Filter by deposit status"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filterDepType}
            onChange={e => setFilterDepType(e.target.value)}
            className="map-filter-select"
            aria-label="Filter by deposit type"
          >
            {DEP_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map */}
      {!isLoading && !loadError && (
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={DARK_MAP_STYLE}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          aria-label="REE deposit map"
        >
          {/* Deposits layer */}
          <Source id="deposits" type="geojson" data={depositsGeoJSON}>
            <Layer
              id="deposits-layer"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#00c8f0',
                'circle-opacity': 0.9,
                'circle-stroke-color': '#00f0ff',
                'circle-stroke-width': 1,
              }}
            />
          </Source>

          {/* Zone pins layer */}
          <Source
            id="zones"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: zones.map(z => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [z.lng, z.lat] },
                properties: { name: z.name, score: z.score },
              })),
            }}
          >
            <Layer
              id="zones-layer"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': ['interpolate', ['linear'], ['get', 'score'], 0, '#ff0080', 100, '#00f0ff'],
                'circle-opacity': 1,
                'circle-stroke-color': '#00f0ff',
                'circle-stroke-width': 1.5,
              }}
            />
          </Source>
        </Map>
      )}

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          style={{
            position: 'absolute',
            left: hoverInfo.x + 12,
            top: hoverInfo.y + 12,
            zIndex: 20,
            background: 'rgba(5,8,31,0.92)',
            border: '1px solid rgba(0,240,255,0.35)',
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
          }}
        >
          <p className="font-mono" style={{ fontSize: 11, color: '#00f0ff', marginBottom: 2 }}>
            {hoverInfo.object.name}
          </p>
          <p className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
            Score {hoverInfo.object.score ?? '—'}
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'rgba(5,8,31,0.7)',
            zIndex: 15,
          }}
        >
          <Loader2 size={16} className="animate-spin" style={{ color: '#00f0ff' }} />
          <span className="font-mono" style={{ fontSize: 11, color: 'rgba(0,240,255,0.7)' }}>
            Loading deposit data…
          </span>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,8,31,0.85)',
            zIndex: 15,
          }}
        >
          <span className="font-mono" style={{ fontSize: 11, color: 'rgba(255,80,80,0.8)' }}>
            Failed to load deposit data
          </span>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 14,
          zIndex: 10,
          background: 'rgba(5,8,31,0.85)',
          border: '1px solid rgba(0,240,255,0.18)',
          borderRadius: 8,
          padding: '8px 11px',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 48,
              height: 6,
              borderRadius: 3,
              background: 'linear-gradient(to right, rgba(0,240,255,0), rgba(0,240,255,0.6), #fff)',
            }}
          />
          <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
            DENSITY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '1.5px solid #00f0ff',
              background: 'rgba(0,220,255,0.4)',
              flexShrink: 0,
            }}
          />
          <span className="font-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em' }}>
            ANALYSIS ZONES
          </span>
        </div>
      </div>

      {/* Scanline overlay — matches OptimizerViz aesthetic */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
          zIndex: 5,
        }}
      />
    </div>
  );
}
