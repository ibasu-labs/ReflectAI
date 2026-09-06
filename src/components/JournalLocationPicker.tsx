import React, { useState } from 'react';
import { JournalLocation } from '../types';
import {
  MapPin,
  X,
  Search,
  Navigation,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { MapErrorBoundary } from './MapErrorBoundary';

interface JournalLocationPickerProps {
  location?: JournalLocation;
  onChange: (location: JournalLocation | undefined) => void;
  disabled?: boolean;
}

// Curated reflective sanctuaries and common journaling spots
const PRESET_PLACES: Array<{
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
}> = [
  {
    name: 'Muir Woods Redwood Sanctuary',
    address: 'Mill Valley, California, USA',
    lat: 37.897,
    lng: -122.581,
    category: 'Nature',
  },
  {
    name: 'Kyoto Zen Meditation Temple',
    address: 'Sakyo Ward, Kyoto, Japan',
    lat: 35.0116,
    lng: 135.7681,
    category: 'Sacred Space',
  },
  {
    name: 'Big Sur Coastal Lookout',
    address: 'Highway 1, Big Sur, California, USA',
    lat: 36.2704,
    lng: -121.8081,
    category: 'Retreat',
  },
  {
    name: 'Café de Flore (Thinkers Sanctuary)',
    address: '172 Boulevard Saint-Germain, Paris, France',
    lat: 48.8541,
    lng: 2.3328,
    category: 'Urban Sanctuary',
  },
  {
    name: 'Lake Tahoe Alpine Haven',
    address: 'Lake Tahoe, Nevada/California, USA',
    lat: 39.0968,
    lng: -120.0324,
    category: 'Nature',
  },
  {
    name: 'Personal Studio / Home Sanctuary',
    address: 'Private Creative Workspace',
    lat: 37.7749,
    lng: -122.4194,
    category: 'Studio',
  },
];

export const JournalLocationPicker: React.FC<JournalLocationPickerProps> = ({
  location,
  onChange,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState<number>(37.7749);
  const [customLng, setCustomLng] = useState<number>(-122.4194);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(true);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const configuredMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '';
  // Cloud Map ID to use for AdvancedMarker. If not provided, fallback to standard map + pin or DEMO_MAP_ID
  const mapId = configuredMapId.trim() || undefined;

  const handleSelectPreset = (preset: (typeof PRESET_PLACES)[0]) => {
    onChange({
      displayName: preset.name,
      address: preset.address,
      latitude: preset.lat,
      longitude: preset.lng,
      placeId: `preset_${preset.name.toLowerCase().replace(/\s+/g, '_')}`,
    });
    setIsOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    onChange({
      displayName: customName.trim().slice(0, 150),
      address: customAddress.trim().slice(0, 200) || undefined,
      latitude: customLat,
      longitude: customLng,
      placeId: `custom_${Date.now()}`,
    });
    setShowCustomForm(false);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onChange({
          displayName: 'Current Location',
          address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
          placeId: `current_${Date.now()}`,
        });
        setIsOpen(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback to sanctuary
        onChange({
          displayName: 'Quiet Workspace',
          address: 'Local Sanctuary',
          latitude: 37.7749,
          longitude: -122.4194,
          placeId: `fallback_${Date.now()}`,
        });
        setIsOpen(false);
      }
    );
  };

  const filteredPresets = PRESET_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Attached Location Pill or Add Location Trigger */}
      {location ? (
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-700/60 text-cyan-200 text-xs shadow-md shadow-cyan-950/40">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-medium truncate max-w-[200px] sm:max-w-xs">
              {location.displayName}
            </span>
            {location.address && (
              <span className="text-[11px] text-cyan-300/70 hidden md:inline truncate max-w-[150px]">
                • {location.address}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-0.5 hover:text-white transition-colors cursor-pointer ml-1"
              title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
            >
              {isMapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {!disabled && (
              <button
                type="button"
                id="btn-remove-location"
                onClick={() => onChange(undefined)}
                className="p-0.5 hover:text-rose-300 transition-colors cursor-pointer ml-0.5"
                title="Remove location"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Interactive Google Map Preview */}
          {isMapExpanded && (
            <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-cyan-800/60 shadow-xl shadow-black/60 bg-slate-950 relative">
              <MapErrorBoundary
                fallback={
                  /* Interactive Fallback Map Visualizer for Prototyping / Maps Error */
                  <div className="w-full h-full relative flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/50 text-center">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-700 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/50">
                        <MapPin className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-100">{location.displayName}</h4>
                        {location.address && <p className="text-xs text-slate-400">{location.address}</p>}
                        <div className="inline-flex items-center gap-2 mt-1 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] text-cyan-400">
                          <Globe className="w-3 h-3" />
                          <span>
                            {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° W
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            location.displayName + ' ' + (location.address || '')
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-700/60 text-cyan-200 text-xs transition-colors"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-xs">
                        Location-aware context attached. Grounded in Google Maps Platform coordinates.
                      </p>
                    </div>
                  </div>
                }
              >
                {googleMapsApiKey ? (
                  <APIProvider apiKey={googleMapsApiKey} libraries={['marker']}>
                    <Map
                      internalUsageAttributionIds={['gmp_git_agentskills_v1']}
                      {...(mapId ? { mapId } : {})}
                      defaultCenter={{ lat: location.latitude, lng: location.longitude }}
                      center={{ lat: location.latitude, lng: location.longitude }}
                      defaultZoom={13}
                      gestureHandling="greedy"
                      disableDefaultUI={false}
                      className="w-full h-full"
                    >
                      {mapId ? (
                        <AdvancedMarker
                          position={{ lat: location.latitude, lng: location.longitude }}
                          onClick={() => setShowInfoWindow(!showInfoWindow)}
                        >
                          <div className="relative group cursor-pointer flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/50 border-2 border-slate-900 hover:scale-110 transition-transform">
                              <MapPin className="w-4 h-4 fill-slate-950 text-slate-950" />
                            </div>
                            <div className="w-1.5 h-1.5 bg-cyan-500 rotate-45 -mt-0.5 shadow-sm" />
                          </div>
                        </AdvancedMarker>
                      ) : (
                        <Marker
                          position={{ lat: location.latitude, lng: location.longitude }}
                          onClick={() => setShowInfoWindow(!showInfoWindow)}
                          title={location.displayName}
                        />
                      )}

                      {showInfoWindow && (
                        <InfoWindow
                          position={{ lat: location.latitude, lng: location.longitude }}
                          onCloseClick={() => setShowInfoWindow(false)}
                        >
                          <div className="p-1 text-slate-900 text-xs">
                            <p className="font-bold text-sm text-cyan-950">{location.displayName}</p>
                            {location.address && <p className="text-slate-600">{location.address}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">
                              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </p>
                          </div>
                        </InfoWindow>
                      )}
                    </Map>
                  </APIProvider>
                ) : (
                  /* Fallback when apiKey is missing */
                  <div className="w-full h-full relative flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/50 text-center">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-700 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-950/50">
                        <MapPin className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-100">{location.displayName}</h4>
                        {location.address && <p className="text-xs text-slate-400">{location.address}</p>}
                        <div className="inline-flex items-center gap-2 mt-1 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] text-cyan-400">
                          <Globe className="w-3 h-3" />
                          <span>
                            {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° W
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            location.displayName + ' ' + (location.address || '')
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800/80 border border-cyan-700/60 text-cyan-200 text-xs transition-colors"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 max-w-xs">
                        Location-aware context attached. Grounded in Google Maps Platform coordinates.
                      </p>
                    </div>
                  </div>
                )}
              </MapErrorBoundary>
            </div>
          )}
        </div>
      ) : (
        /* Attach Location Trigger Button */
        <button
          type="button"
          id="btn-add-location"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
          title="Attach location metadata to this journal reflection"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Add Location</span>
        </button>
      )}

      {/* Location Selection Dropdown Modal */}
      {isOpen && !location && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/80 z-30 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">Attach Location</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Quick Action: Device Location */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Use Current Device Location</span>
            </button>

            {/* Preset Sanctuary Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sanctuaries & places..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            {/* Presets List */}
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-start justify-between group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 truncate">
                      {preset.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{preset.address}</p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-cyan-950 group-hover:text-cyan-300 shrink-0 ml-2">
                    {preset.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Location Toggle */}
            <div className="pt-2 border-t border-slate-800">
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                >
                  + Enter custom place or coordinates
                </button>
              ) : (
                <form onSubmit={handleApplyCustom} className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Place name (e.g. Kyoto Tea Garden)"
                    maxLength={150}
                    className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-hidden focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="Address or city (optional)"
                    maxLength={200}
                    className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-hidden focus:border-cyan-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={customLat}
                      onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                      placeholder="Latitude"
                      className="w-1/2 px-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={customLng}
                      onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                      placeholder="Longitude"
                      className="w-1/2 px-2 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="px-2 py-1 text-[11px] text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!customName.trim()}
                      className="px-3 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded"
                    >
                      Attach
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
