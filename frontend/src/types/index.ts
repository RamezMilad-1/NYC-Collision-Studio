export interface CollisionRow {
  CRASH_ID?: string | number;
  CRASH_DATETIME?: string;
  BOROUGH?: string;
  ON_STREET_NAME?: string;
  OFF_STREET_NAME?: string;
  PERSON_TYPE?: string;
  LOCATION?: string;
  LATITUDE?: number | string;
  LONGITUDE?: number | string;
  'CONTRIBUTING FACTOR VEHICLE 1'?: string;
  'VEHICLE TYPE CODE 1'?: string;
  'VEHICLE TYPE'?: string;
  'NUMBER OF PEDESTRIANS INJURED'?: number | string;
  'NUMBER OF CYCLIST INJURED'?: number | string;
  'NUMBER OF MOTORIST INJURED'?: number | string;
  'NUMBER OF PEDESTRIANS KILLED'?: number | string;
  'NUMBER OF CYCLIST KILLED'?: number | string;
  'NUMBER OF MOTORIST KILLED'?: number | string;
  [key: string]: unknown;
}

export interface Filters {
  boroughs: string[];
  factors: string[];
  vehicleTypes: string[];
  onStreets: string[];
  years: string[];
  injuredOnly: boolean;
  killedOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  boroughs: [],
  factors: [],
  vehicleTypes: [],
  onStreets: [],
  years: [],
  injuredOnly: false,
  killedOnly: false,
};

export interface NameValue {
  name: string;
  value: number;
}

export interface HourBucket {
  hour: string;
  collisions: number;
}

export interface Summary {
  totalCollisions: number;
  totalInjured: number;
  totalKilled: number;
  boroughs: NameValue[];
  personTypeBreakdown: NameValue[];
  topFactors: NameValue[];
  collisionsByHourData: HourBucket[];
}

export interface FilterOptions {
  boroughs: string[];
  factors: string[];
  vehicleTypes: string[];
  onStreets: string[];
  years: string[];
}

export interface SampleMetadata extends Summary {
  options: FilterOptions;
}

export interface FullDataReport {
  totalCollisions: number;
  totalInjured: number;
  totalKilled: number;
  boroughs: NameValue[];
  collisionsByHourData: HourBucket[];
  injuryFatalityData: { type: string; count: number; category: 'Injuries' | 'Fatalities' }[];
  topFactors: { factor: string; count: number }[];
  crashesByYearData: { year: number; crashes: number }[];
  isFullData: true;
}

export interface DatasetMetadata {
  total_collisions: number;
  total_injured: number;
  total_killed: number;
  boroughs: Record<string, number>;
  crashes_by_hour: Record<string, number>;
  injuries_by_type: {
    pedestrians_injured: number;
    cyclists_injured: number;
    motorists_injured: number;
  };
  fatalities_by_type: {
    pedestrians_killed: number;
    cyclists_killed: number;
    motorists_killed: number;
  };
  top_contributing_factors: Record<string, number>;
  crashes_by_year: Record<string, number>;
}
