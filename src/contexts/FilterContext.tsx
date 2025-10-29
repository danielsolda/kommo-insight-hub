import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface GlobalFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  pipelineId: number | null;
  userId: number | null;
}

interface FilterContextType {
  filters: GlobalFilters;
  setDateRange: (from: Date, to: Date) => void;
  setPipelineId: (id: number | null) => void;
  setUserId: (id: number | null) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const STORAGE_KEY = 'kommo-global-filters';

const getDefaultFilters = (): GlobalFilters => {
  const now = new Date();
  return {
    dateRange: {
      from: startOfMonth(now),
      to: endOfMonth(now)
    },
    pipelineId: null,
    userId: null
  };
};

const loadFiltersFromStorage = (): GlobalFilters => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        dateRange: {
          from: new Date(parsed.dateRange.from),
          to: new Date(parsed.dateRange.to)
        },
        pipelineId: parsed.pipelineId,
        userId: parsed.userId
      };
    }
  } catch (error) {
    console.warn('Error loading filters from storage:', error);
  }
  return getDefaultFilters();
};

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<GlobalFilters>(loadFiltersFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dateRange: {
        from: filters.dateRange.from.toISOString(),
        to: filters.dateRange.to.toISOString()
      },
      pipelineId: filters.pipelineId,
      userId: filters.userId
    }));
  }, [filters]);

  const setDateRange = (from: Date, to: Date) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { from, to }
    }));
  };

  const setPipelineId = (id: number | null) => {
    setFilters(prev => ({
      ...prev,
      pipelineId: id
    }));
  };

  const setUserId = (id: number | null) => {
    setFilters(prev => ({
      ...prev,
      userId: id
    }));
  };

  const resetFilters = () => {
    setFilters(getDefaultFilters());
  };

  return (
    <FilterContext.Provider value={{
      filters,
      setDateRange,
      setPipelineId,
      setUserId,
      resetFilters
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useGlobalFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useGlobalFilters must be used within FilterProvider');
  }
  return context;
};
