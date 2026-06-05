import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FranchiseLocation } from '../types';

interface LocationStore {
  currentLocation: FranchiseLocation | null;
  locations: FranchiseLocation[];
  setCurrentLocation: (location: FranchiseLocation) => void;
  setLocations: (locations: FranchiseLocation[]) => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      currentLocation: null,
      locations: [],
      setCurrentLocation: (location: FranchiseLocation) => {
        set({ currentLocation: location });
        window.__locationId = location.id;
      },
      setLocations: (locations) => set({ locations }),
    }),
    { name: 'blueslate-location' }
  )
);
