import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, ResponsiveContainer
} from 'recharts';
import Plot from 'react-plotly.js';
import html2pdf from 'html2pdf.js';
import './App.css';

const COLORS = ['#FF6B6B', '#7B61FF', '#00D4FF', '#FFD166', '#4ECDC4'];

/** X-axis labels for borough bar chart (narrow layout) */
function formatBoroughAxisLabel(name) {
  if (name == null || name === '') return '';
  const s = String(name).trim();
  if (/^staten\s*island$/i.test(s)) return 'Staten Is.';
  return s;
}

function formatBoroughAxisCompact(name) {
  const key = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  const map = {
    MANHATTAN: 'Manh.',
    BROOKLYN: 'Bklyn',
    QUEENS: 'Qns',
    BRONX: 'Bronx',
    'STATEN ISLAND': 'S.I.',
    UNKNOWN: 'Unk.'
  };
  if (map[key]) return map[key];
  return formatBoroughAxisLabel(name);
}

function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    totalCollisions: 0,
    totalInjured: 0,
    totalKilled: 0,
    boroughs: [],
    personTypeBreakdown: [],
    topFactors: [],
    collisionsByHourData: []
  });

  // new UI state for the table controls
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [fullDataReport, setFullDataReport] = useState(null);
  const [fullDataReportOpen, setFullDataReportOpen] = useState(false);
  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);

  // table paging
  const [tableOffset, setTableOffset] = useState(0);
  const pageSize = 6;

  // Device recommendation popup
  const [showDevicePopup, setShowDevicePopup] = useState(false);
  
  // filters:
  const [appliedFilters, setAppliedFilters] = useState({
    boroughs: [],
    factors: [],
    vehicleTypes: [],
    onStreets: [],
    years: [],
    injuredOnly: false,
    killedOnly: false
  });
  const [tempFilters, setTempFilters] = useState({
    boroughs: [],
    factors: [],
    vehicleTypes: [],
    onStreets: [],
    years: [],
    injuredOnly: false,
    killedOnly: false
  });

  // graph filters (separate from table filters):
  const [graphFilters, setGraphFilters] = useState({
    boroughs: [],
    factors: [],
    vehicleTypes: [],
    onStreets: [],
    years: [],
    injuredOnly: false,
    killedOnly: false
  });
  const [graphFilterOpen, setGraphFilterOpen] = useState(false);
  const [tempGraphFilters, setTempGraphFilters] = useState({
    boroughs: [],
    factors: [],
    vehicleTypes: [],
    onStreets: [],
    years: [],
    injuredOnly: false,
    killedOnly: false
  });

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // PDF download function
  const downloadReportAsPDF = async (reportType) => {
    const element = document.getElementById(reportType === 'full' ? 'full-report-view' : 'report-view');
    if (!element) {
      alert('Report not found. Please generate the report first.');
      return;
    }

    // Temporarily adjust styles for full capture
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    // Hide the action buttons
    const actions = element.querySelector('.report-actions');
    const originalDisplay = actions ? actions.style.display : '';
    if (actions) actions.style.display = 'none';

    // Show loading message
    const loadingMsg = document.createElement('div');
    loadingMsg.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #000; color: #fff; padding: 20px; border-radius: 8px; z-index: 10000;">Generating PDF...</div>';
    document.body.appendChild(loadingMsg);

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5], // top, right, bottom, left
      filename: `nyc-collision-${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      // Keep blocks on one PDF page when possible (html2pdf inserts spacers before page breaks)
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'landscape',
        compress: true
      }
    };

    try {
      // Wait a bit for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      await html2pdf().set(opt).from(element).save();

      // Remove loading message
      document.body.removeChild(loadingMsg);
    } catch (error) {
      console.error('Error generating PDF:', error);
      document.body.removeChild(loadingMsg);
      alert('Error generating PDF. Please try again.');
    } finally {
      // Restore original styles
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
    }
  };

  // replace existing handleGenerateReport so it opens the report modal
  const handleGenerateReport = () => {
    setReporting(true);
    // small simulated generation, then open report view
    setTimeout(() => {
      setReporting(false);
      setReportOpen(true);
    }, 700);
  };

// Generate report from complete dataset metadata
  const handleGenerateFullDataReport = async () => {
    // If already generated, just open it
    if (fullDataReport) {
      setFullDataReportOpen(true);
      return;
    }

    setIsGeneratingFullReport(true);

    try {
      // Load the complete dataset metadata
      const response = await fetch('/data/dataset_metadata.json');
      if (!response.ok) throw new Error('Failed to load metadata');
      
      const metadata = await response.json();

      // Transform the data for the report format
      const boroughs = Object.entries(metadata.boroughs).map(([name, value]) => ({ name, value }));
      const collisionsByHourData = Object.entries(metadata.crashes_by_hour).map(([hour, collisions]) => ({
        hour: `${hour}:00`,
        collisions: collisions
      }));

      const injuryFatalityData = [
        { type: 'Pedestrians Injured', count: metadata.injuries_by_type.pedestrians_injured, category: 'Injuries' },
        { type: 'Cyclists Injured', count: metadata.injuries_by_type.cyclists_injured, category: 'Injuries' },
        { type: 'Motorists Injured', count: metadata.injuries_by_type.motorists_injured, category: 'Injuries' },
        { type: 'Pedestrians Killed', count: metadata.fatalities_by_type.pedestrians_killed, category: 'Fatalities' },
        { type: 'Cyclists Killed', count: metadata.fatalities_by_type.cyclists_killed, category: 'Fatalities' },
        { type: 'Motorists Killed', count: metadata.fatalities_by_type.motorists_killed, category: 'Fatalities' }
      ];

      const topFactors = Object.entries(metadata.top_contributing_factors).map(([factor, count]) => ({
        factor, count
      }));

      const crashesByYearData = Object.entries(metadata.crashes_by_year).map(([year, crashes]) => ({
        year: parseInt(year), crashes
      }));

      const reportData = {
        totalCollisions: metadata.total_collisions,
        totalInjured: metadata.total_injured,
        totalKilled: metadata.total_killed,
        boroughs,
        collisionsByHourData,
        injuryFatalityData,
        topFactors,
        crashesByYearData,
        isFullData: true
      };

      setFullDataReport(reportData);
      setTimeout(() => {
        setIsGeneratingFullReport(false);
        setFullDataReportOpen(true);
      }, 700);
    } catch (error) {
      console.error('Error generating full data report:', error);
      alert('Error loading complete dataset metadata.');
      setIsGeneratingFullReport(false);
    }
  };

  // Dismiss device popup and remember
  const dismissDevicePopup = () => {
    setShowDevicePopup(false);
    // localStorage.setItem('devicePopupShown', 'true'); // Commented out for testing
  };

  // Toggle injured-only filter (mutually exclusive with killed-only)
  const toggleInjuredOnly = () => {
    setAppliedFilters(prev => ({
      ...prev,
      injuredOnly: !prev.injuredOnly,
      killedOnly: prev.injuredOnly ? false : prev.killedOnly // Turn off killed-only if turning on injured-only
    }));
  };

  // Toggle killed-only filter (mutually exclusive with injured-only)
  const toggleKilledOnly = () => {
    setAppliedFilters(prev => ({
      ...prev,
      killedOnly: !prev.killedOnly,
      injuredOnly: prev.killedOnly ? false : prev.injuredOnly // Turn off injured-only if turning on killed-only
    }));
  };

  // Toggle graph injured-only filter (mutually exclusive with killed-only)
  const toggleGraphInjuredOnly = () => {
    setGraphFilters(prev => ({
      ...prev,
      injuredOnly: !prev.injuredOnly,
      killedOnly: prev.injuredOnly ? false : prev.killedOnly // Turn off killed-only if turning on injured-only
    }));
  };

  // Toggle graph killed-only filter (mutually exclusive with injured-only)
  const toggleGraphKilledOnly = () => {
    setGraphFilters(prev => ({
      ...prev,
      killedOnly: !prev.killedOnly,
      injuredOnly: prev.killedOnly ? false : prev.injuredOnly // Turn off injured-only if turning on killed-only
    }));
  };

  // add download helper that opens a printable window with the report HTML
  const downloadReportPDF = () => {
    const el = document.getElementById('report-view');
    if (!el) return;
    const html = `
      <html>
        <head>
          <title>Collision Report</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body{font-family:Inter,system-ui,Arial;margin:20px;color:#061226}
            h1,h2,h3{margin:6px 0}
            .summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
            .stat{padding:12px;border:1px solid #e6eef8;border-radius:8px;background:#f8fafc}
            .section{margin:18px 0}
            .paragraph{line-height:1.5;color:#334155}
            .chart{margin:10px 0}
            @media print { body { margin: 8mm; } }
          </style>
        </head>
        <body>
          ${el.innerHTML}
        </body>
      </html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // allow short time for resources/SVG to render
    setTimeout(() => { w.print(); }, 500);
  };

  useEffect(() => {
    const files = [
      "/data/df_clean_integrated_sample_part1.jsonl",
      "/data/df_clean_integrated_sample_part2.jsonl",
     // "/data/df_clean_integrated_sample_part3.jsonl"
    ];
  
    const fetchAllFiles = async () => {
      try {
        // Fetch all files in parallel
        const responses = await Promise.all(files.map(file => fetch(file)));
        const texts = await Promise.all(responses.map(res => res.text()));
  
        // Parse all JSONL files and combine data
        const parsed = texts.flatMap(text =>
          text
            .split("\n")
            .filter(Boolean)
            .map(line => {
              try { return JSON.parse(line); } 
              catch { return null; }
            })
            .filter(Boolean)
        );
  
        setData(parsed);
  
        // --- Summaries ---
        const totalCollisions = parsed.length;
        let totalInjured = 0;
        let totalKilled = 0;
        const boroughCount = {};
        const personTypeCount = {};
        const factorCount = {};
        const collisionsByHour = Array(24).fill(0);
  
        parsed.forEach(item => {
          // Sum all specific injury/kill categories instead of the total fields which are 0
          const injured = 
            Number(item['NUMBER OF PEDESTRIANS INJURED'] || 0) +
            Number(item['NUMBER OF CYCLIST INJURED'] || 0) +
            Number(item['NUMBER OF MOTORIST INJURED'] || 0);
          const killed = 
            Number(item['NUMBER OF PEDESTRIANS KILLED'] || 0) +
            Number(item['NUMBER OF CYCLIST KILLED'] || 0) +
            Number(item['NUMBER OF MOTORIST KILLED'] || 0);
          
          totalInjured += injured;
          totalKilled += killed;
  
          const borough = item['BOROUGH'] || 'Unknown';
          boroughCount[borough] = (boroughCount[borough] || 0) + 1;
  
          const personType = item['PERSON_TYPE'] || 'Unknown';
          personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;
  
          const factor = item['CONTRIBUTING FACTOR VEHICLE 1'] || 'Unknown';
          factorCount[factor] = (factorCount[factor] || 0) + 1;
  
          const datetimeStr = item['CRASH_DATETIME'];
          if (datetimeStr) {
            const hour = parseInt(datetimeStr.split(' ')[1].split(':')[0], 10);
            if (!isNaN(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
          }
        });
  
        const boroughs = Object.entries(boroughCount).map(([name, value]) => ({ name, value }));
        const personTypeBreakdown = Object.entries(personTypeCount).map(([name, value]) => ({ name, value }));
        const topFactors = Object.entries(factorCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value }));
  
        const collisionsByHourData = collisionsByHour.map((count, hour) => ({
          hour: `${hour}:00`,
          collisions: count
        }));
  
        setSummary({
          totalCollisions,
          totalInjured,
          totalKilled,
          boroughs,
          personTypeBreakdown,
          topFactors,
          collisionsByHourData
        });
  
      } catch (err) {
        console.error('Load error', err);
      }
    };
  
    fetchAllFiles();
  }, []);

  // Device recommendation popup - show only once on mobile
  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('devicePopupShown');
    const isMobile = window.innerWidth < 768;
    console.log('Popup check:', { hasSeenPopup, isMobile, width: window.innerWidth });
    if (!hasSeenPopup) { // Temporarily show on all devices for testing
      setShowDevicePopup(true);
    }
  }, []);

  // options for filter UI (derived from raw data)
  const boroughOptions = useMemo(() => {
    const s = new Set(data.map(d => d?.BOROUGH || d?.borough || 'Unknown'));
    return Array.from(s).filter(Boolean).sort();
  }, [data]);

  const factorOptions = useMemo(() => {
    const s = new Set(data.map(d => d?.['CONTRIBUTING FACTOR VEHICLE 1'] || d?.factor || 'Unknown'));
    return Array.from(s)
      .filter(factor => factor && factor !== '1' && factor !== '80')
      .sort();
  }, [data]);

  // new options (vehicle types + on-streets) derived from raw data
  const vehicleTypeOptions = useMemo(() => {
    const counts = new Map();
    data.forEach(d => {
      const vt =
        d?.['VEHICLE TYPE CODE 1'] ??
        d?.['VEHICLE_TYPE_CODE_1'] ??
        d?.['VEHICLE TYPE CODE'] ??
        d?.['VEHICLE TYPE'] ??
        d?.vehicleType ??
        d?.VEHICLE_TYPE ??
        null;
      if (vt == null) return;
      const str = (typeof vt === 'string' ? vt.trim() : String(vt));
      if (!str) return;
      const upper = str.toUpperCase();
      if (upper === 'UNKNOWN' || upper === 'N/A' || upper === '-') return;
      counts.set(str, (counts.get(str) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)            // top 10 vehicle types
      .map(([type]) => type);
  }, [data]);

  const onStreetOptions = useMemo(() => {
    const counts = new Map();
    data.forEach(d => {
      let sname =
        d?.ON_STREET_NAME ??
        d?.['ON STREET NAME'] ??
        d?.on_street_name ??
        d?.onStreet ??
        d?.['ON STREET'] ??
        '';

      if (!sname) {
        const loc = d?.LOCATION ?? d?.location ?? '';
        if (typeof loc === 'string' && loc) {
          const mOn = loc.match(/ON\s+([A-Za-z0-9' \-]+)/i);
          if (mOn && mOn[1]) sname = mOn[1].trim();
          else {
            const mSlash = loc.match(/([A-Za-z0-9' \-]+)\s*\/\s*[A-Za-z0-9' \-]+/);
            if (mSlash && mSlash[1]) sname = mSlash[1].trim();
          }
        }
      }

      if (!sname) return;
      const str = (typeof sname === 'string' ? sname.trim() : String(sname));
      if (!str) return;
      const upper = str.toUpperCase();
      if (upper === 'UNKNOWN' || upper === 'N/A' || upper === '-') return;
      counts.set(str, (counts.get(str) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)           // top 25 streets
      .map(([street]) => street);
  }, [data]);

  const yearOptions = useMemo(() => {
    const s = new Set();
    data.forEach(d => {
      const dt = d?.CRASH_DATETIME || d?.crash_datetime || '';
      const year = dt ? (dt.split(' ')[0].split('-')[0]) : null;
      if (year) s.add(year);
    });
    return Array.from(s).filter(Boolean).sort((a,b)=>b-a);
  }, [data]);

  // derive columns (collect common keys) so table can show all attributes horizontally
  const tableColumns = useMemo(() => {
    const cols = new Set();
    data.slice(0, 300).forEach(row => {
      if (!row || typeof row !== 'object') return;
      Object.keys(row).forEach(k => cols.add(k));
    });
    const preferred = [
      'CRASH_ID','CRASH_DATETIME','BOROUGH',
      'ON_STREET_NAME','OFF_STREET_NAME','NUMBER OF PERSONS INJURED',
      'NUMBER OF PERSONS KILLED','PERSON_TYPE','CONTRIBUTING FACTOR VEHICLE 1'
    ];
    const rest = Array.from(cols).filter(c => !preferred.includes(c)).sort();
    return [...preferred.filter(c => cols.has(c)), ...rest];
  }, [data]);

  // Helper function to filter data based on filters
  const filterDataByFilters = (dataToFilter, filters) => {
    return dataToFilter.filter(r => {
      const b = r?.BOROUGH ?? r?.borough ?? 'Unknown';
      const f = r?.['CONTRIBUTING FACTOR VEHICLE 1'] ?? r?.factor ?? 'Unknown';
      const vt =
        r?.['VEHICLE TYPE CODE 1'] ??
        r?.['VEHICLE_TYPE_CODE_1'] ??
        r?.['VEHICLE TYPE CODE'] ??
        r?.['VEHICLE TYPE'] ??
        r?.vehicleType ??
        r?.VEHICLE_TYPE ??
        'Unknown';
      
      // Extract street name - must match onStreetOptions logic
      let sname =
        r?.ON_STREET_NAME ??
        r?.['ON STREET NAME'] ??
        r?.on_street_name ??
        r?.onStreet ??
        r?.['ON STREET'] ??
        '';
      
      if (!sname) {
        const loc = r?.LOCATION ?? r?.location ?? '';
        if (typeof loc === 'string' && loc) {
          const mOn = loc.match(/ON\s+([A-Za-z0-9' \-]+)/i);
          if (mOn && mOn[1]) sname = mOn[1].trim();
          else {
            const mSlash = loc.match(/([A-Za-z0-9' \-]+)\s*\/\s*[A-Za-z0-9' \-]+/);
            if (mSlash && mSlash[1]) sname = mSlash[1].trim();
          }
        }
      }
      
      // Trim to match how options are stored
      if (sname) {
        sname = (typeof sname === 'string' ? sname.trim() : String(sname));
      }
      
      // Extract year - must match yearOptions logic exactly
      const dt = r?.CRASH_DATETIME || r?.crash_datetime || '';
      const year = dt ? (dt.split(' ')[0].split('-')[0]) : null;
      // Calculate actual injured/killed counts from specific categories
      const injured = 
        Number(r?.['NUMBER OF PEDESTRIANS INJURED'] ?? 0) +
        Number(r?.['NUMBER OF CYCLIST INJURED'] ?? 0) +
        Number(r?.['NUMBER OF MOTORIST INJURED'] ?? 0);
      const killed = 
        Number(r?.['NUMBER OF PEDESTRIANS KILLED'] ?? 0) +
        Number(r?.['NUMBER OF CYCLIST KILLED'] ?? 0) +
        Number(r?.['NUMBER OF MOTORIST KILLED'] ?? 0);

      const boroughMatch = filters.boroughs.length ? filters.boroughs.includes(b) : true;
      const factorMatch = filters.factors.length ? filters.factors.includes(f) : true;
      const vehicleMatch = filters.vehicleTypes.length ? filters.vehicleTypes.includes(vt) : true;
      const streetMatch = filters.onStreets.length ? filters.onStreets.includes(sname) : true;
      const yearMatch = filters.years.length ? filters.years.includes(year) : true;
      const injuredMatch = filters.injuredOnly ? injured > 0 : true;
      const killedMatch = filters.killedOnly ? killed > 0 : true;

      return boroughMatch && factorMatch && vehicleMatch && streetMatch && yearMatch && injuredMatch && killedMatch;
    });
  };

  // filtered data for graphs based on graphFilters
  const filteredGraphData = useMemo(() => {
    const hasFilters = graphFilters.boroughs.length > 0 ||
      graphFilters.factors.length > 0 ||
      graphFilters.vehicleTypes.length > 0 ||
      graphFilters.onStreets.length > 0 ||
      graphFilters.years.length > 0 ||
      graphFilters.injuredOnly ||
      graphFilters.killedOnly;
    
    if (!hasFilters) return data;
    return filterDataByFilters(data, graphFilters);
  }, [data, graphFilters]);

// filtered data according to appliedFilters + search (for table)
const filteredData = useMemo(() => {
  const q = (searchQuery || '').trim();

  if (!q) {
    // no search query, just apply filters
    return appliedFiltersActive(appliedFilters) ? filterDataByFilters(data, appliedFilters) : data;
  }

  // Split search query into terms (space or comma separated)
  const searchTerms = q
    .split(/[, ]+/)
    .map(term => term.trim().toLowerCase())
    .filter(term => term.length > 0);

  const hasFilters = appliedFiltersActive(appliedFilters);
  let filtered = hasFilters ? filterDataByFilters(data, appliedFilters) : data;

  return filtered.filter(row => {
    // combine all visible columns into one searchable string
    const hay = tableColumns
      .map(col => {
        let v = row?.[col];

        // optional: extract year from CRASH_DATETIME if needed
        if (col === 'CRASH_DATETIME' && v) {
          v = String(v).slice(0, 4); // just the year part
        }
        return v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      })
      .join(' ')
      .toLowerCase();

    // OR logic: match if at least one term appears anywhere in the row
    return searchTerms.every(term => hay.includes(term));
  });
}, [data, appliedFilters, searchQuery, tableColumns]);

// helper function to check if any filters are active
function appliedFiltersActive(filters) {
  return (
    filters.boroughs.length > 0 ||
    filters.factors.length > 0 ||
    filters.vehicleTypes.length > 0 ||
    filters.onStreets.length > 0 ||
    filters.years.length > 0 ||
    filters.injuredOnly ||
    filters.killedOnly
  );
}

  

  // Create filtered summary for graphs
  const filteredSummary = useMemo(() => {
    const filtered = filteredGraphData;
    const totalCollisions = filtered.length;
    let totalInjured = 0;
    let totalKilled = 0;
    const boroughCount = {};
    const personTypeCount = {};
    const factorCount = {};
    const collisionsByHour = Array(24).fill(0); // 0-23 hours

    filtered.forEach(item => {
      // Sum all specific injury/kill categories instead of the total fields which are 0
      const injured = 
        Number(item['NUMBER OF PEDESTRIANS INJURED'] || 0) +
        Number(item['NUMBER OF CYCLIST INJURED'] || 0) +
        Number(item['NUMBER OF MOTORIST INJURED'] || 0);
      const killed = 
        Number(item['NUMBER OF PEDESTRIANS KILLED'] || 0) +
        Number(item['NUMBER OF CYCLIST KILLED'] || 0) +
        Number(item['NUMBER OF MOTORIST KILLED'] || 0);
      
      totalInjured += injured;
      totalKilled += killed;

      const borough = (item['BOROUGH'] || 'Unknown');
      boroughCount[borough] = (boroughCount[borough] || 0) + 1;

      const personType = (item['PERSON_TYPE'] || 'Unknown');
      personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;

      const factor = (item['CONTRIBUTING FACTOR VEHICLE 1'] || 'Unknown');
      factorCount[factor] = (factorCount[factor] || 0) + 1;

      // Collisions by hour
      const datetimeStr = item['CRASH_DATETIME'];
      if (datetimeStr) {
        const hour = parseInt(datetimeStr.split(' ')[1].split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
      }
    });

    const boroughs = Object.entries(boroughCount).map(([name, value]) => ({ name, value }));
    const personTypeBreakdown = Object.entries(personTypeCount).map(([name, value]) => ({ name, value }));
    const topFactors = Object.entries(factorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const collisionsByHourData = collisionsByHour.map((count, hour) => ({
      hour: `${hour}:00`,
      collisions: count
    }));

    return {
      totalCollisions,
      totalInjured,
      totalKilled,
      boroughs,
      personTypeBreakdown,
      topFactors,
      collisionsByHourData
    };
  }, [filteredGraphData]);

  // Create filtered summary for table filters
  const tableFilteredSummary = useMemo(() => {
    const filtered = filteredData;
    const totalCollisions = filtered.length;
    let totalInjured = 0;
    let totalKilled = 0;
    const boroughCount = {};
    const personTypeCount = {};
    const factorCount = {};
    const collisionsByHour = Array(24).fill(0); // 0-23 hours

    filtered.forEach(item => {
      // Sum all specific injury/kill categories instead of the total fields which are 0
      const injured = 
        Number(item['NUMBER OF PEDESTRIANS INJURED'] || 0) +
        Number(item['NUMBER OF CYCLIST INJURED'] || 0) +
        Number(item['NUMBER OF MOTORIST INJURED'] || 0);
      const killed = 
        Number(item['NUMBER OF PEDESTRIANS KILLED'] || 0) +
        Number(item['NUMBER OF CYCLIST KILLED'] || 0) +
        Number(item['NUMBER OF MOTORIST KILLED'] || 0);
      
      totalInjured += injured;
      totalKilled += killed;

      const borough = (item['BOROUGH'] || 'Unknown');
      boroughCount[borough] = (boroughCount[borough] || 0) + 1;

      const personType = (item['PERSON_TYPE'] || 'Unknown');
      personTypeCount[personType] = (personTypeCount[personType] || 0) + 1;

      const factor = (item['CONTRIBUTING FACTOR VEHICLE 1'] || 'Unknown');
      factorCount[factor] = (factorCount[factor] || 0) + 1;

      // Collisions by hour
      const datetimeStr = item['CRASH_DATETIME'];
      if (datetimeStr) {
        const hour = parseInt(datetimeStr.split(' ')[1].split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour <= 23) collisionsByHour[hour]++;
      }
    });

    const boroughs = Object.entries(boroughCount).map(([name, value]) => ({ name, value }));
    const personTypeBreakdown = Object.entries(personTypeCount).map(([name, value]) => ({ name, value }));
    const topFactors = Object.entries(factorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const collisionsByHourData = collisionsByHour.map((count, hour) => ({
      hour: `${hour}:00`,
      collisions: count
    }));

    return {
      totalCollisions,
      totalInjured,
      totalKilled,
      boroughs,
      personTypeBreakdown,
      topFactors,
      collisionsByHourData
    };
  }, [filteredData]);

  // Choose which summary to display: consider both table and graph filters
  const displaySummary = useMemo(() => {
    const hasTableFilters = appliedFilters.boroughs.length > 0 ||
      appliedFilters.factors.length > 0 ||
      appliedFilters.vehicleTypes.length > 0 ||
      appliedFilters.onStreets.length > 0 ||
      appliedFilters.years.length > 0 ||
      appliedFilters.injuredOnly ||
      appliedFilters.killedOnly;
    
    const hasGraphFilters = graphFilters.boroughs.length > 0 ||
      graphFilters.factors.length > 0 ||
      graphFilters.vehicleTypes.length > 0 ||
      graphFilters.onStreets.length > 0 ||
      graphFilters.years.length > 0 ||
      graphFilters.injuredOnly ||
      graphFilters.killedOnly;
    
    // Prioritize table filters if both are active, otherwise use whichever is active
    if (hasTableFilters) {
      return tableFilteredSummary;
    } else if (hasGraphFilters) {
      return filteredSummary;
    } else {
      return summary;
    }
  }, [summary, tableFilteredSummary, filteredSummary, appliedFilters, graphFilters]);

  // Prepare location data for heat map
  const locationData = useMemo(() => {
    const validLocations = filteredData
      .map(item => {
        const lat = Number(item?.LATITUDE || item?.latitude || 0);
        const lon = Number(item?.LONGITUDE || item?.longitude || 0);
        const borough = item?.BOROUGH || item?.borough || 'Unknown';
        const street = item?.['ON STREET NAME'] || item?.ON_STREET_NAME || item?.on_street_name || '';
        // Filter out invalid coordinates (0,0 or NaN)
        if (lat !== 0 && lon !== 0 && !isNaN(lat) && !isNaN(lon) && lat > 40 && lat < 41 && lon < -73 && lon > -75) {
          return { lat, lon, borough, street };
        }
        return null;
      })
      .filter(Boolean);

    // Calculate borough centers for annotations
    const boroughCenters = {};
    validLocations.forEach(loc => {
      if (!boroughCenters[loc.borough]) {
        boroughCenters[loc.borough] = { lats: [], lons: [] };
      }
      boroughCenters[loc.borough].lats.push(loc.lat);
      boroughCenters[loc.borough].lons.push(loc.lon);
    });

    // NYC Borough centers (approximate)
    const boroughInfo = {
      'manhattan': { lat: 40.7831, lon: -73.9712, emoji: '🏙️' },
      'brooklyn': { lat: 40.6782, lon: -73.9442, emoji: '🌉' },
      'queens': { lat: 40.7282, lon: -73.7949, emoji: '✈️' },
      'bronx': { lat: 40.8448, lon: -73.8648, emoji: '⚾' },
      'staten island': { lat: 40.5795, lon: -74.1502, emoji: '🚢' }
    };

    const annotations = Object.entries(boroughCenters)
      .filter(([borough]) => borough !== 'Unknown')
      .map(([borough, coords]) => {
        const boroughKey = borough.toLowerCase();
        let avgLat, avgLon, emoji;
        
        if (boroughInfo[boroughKey]) {
          avgLat = boroughInfo[boroughKey].lat;
          avgLon = boroughInfo[boroughKey].lon;
          emoji = boroughInfo[boroughKey].emoji;
        } else {
          avgLat = coords.lats.reduce((a, b) => a + b, 0) / coords.lats.length;
          avgLon = coords.lons.reduce((a, b) => a + b, 0) / coords.lons.length;
          emoji = '📍';
        }
        
        const boroughName = borough.charAt(0).toUpperCase() + borough.slice(1);
        return {
          x: avgLon,
          y: avgLat,
          text: `${emoji} ${boroughName}`,
          showarrow: true,
          arrowhead: 2,
          arrowsize: 1,
          arrowwidth: 2,
          arrowcolor: '#7B61FF',
          ax: 0,
          ay: -30,
          font: {
            size: 13,
            color: '#061226',
            family: 'Arial, sans-serif',
            weight: 'bold'
          },
          bgcolor: 'rgba(255, 255, 255, 0.85)',
          bordercolor: '#7B61FF',
          borderwidth: 2,
          borderpad: 6,
          xref: 'x',
          yref: 'y'
        };
      });

    // Add major landmarks
    const landmarks = [
      { name: 'Central Park', lat: 40.7829, lon: -73.9654, emoji: '🌳' },
      { name: 'Times Square', lat: 40.7580, lon: -73.9855, emoji: '🎭' },
      { name: 'Brooklyn Bridge', lat: 40.7061, lon: -73.9969, emoji: '🌉' },
      { name: 'JFK Airport', lat: 40.6413, lon: -73.7781, emoji: '✈️' }
    ];

    landmarks.forEach(landmark => {
      // Check if landmark is in view
      if (landmark.lat >= 40.5 && landmark.lat <= 40.9 && 
          landmark.lon >= -74.3 && landmark.lon <= -73.7) {
        annotations.push({
          x: landmark.lon,
          y: landmark.lat,
          text: `${landmark.emoji} ${landmark.name}`,
          showarrow: true,
          arrowhead: 1,
          arrowsize: 0.8,
          arrowwidth: 1.5,
          arrowcolor: '#00D4FF',
          ax: 0,
          ay: -20,
          font: {
            size: 10,
            color: '#334155',
            family: 'Arial, sans-serif'
          },
          bgcolor: 'rgba(0, 212, 255, 0.15)',
          bordercolor: '#00D4FF',
          borderwidth: 1.5,
          borderpad: 4,
          xref: 'x',
          yref: 'y'
        });
      }
    });

    return {
      lats: validLocations.map(loc => loc.lat),
      lons: validLocations.map(loc => loc.lon),
      boroughs: validLocations.map(loc => loc.borough),
      streets: validLocations.map(loc => loc.street),
      annotations
    };
  }, [filteredData]);

  // open filter panel and initialize tempFilters from appliedFilters
  const openFilter = () => {
    setTempFilters({
      boroughs: [...(appliedFilters.boroughs || [])],
      factors: [...(appliedFilters.factors || [])],
      vehicleTypes: [...(appliedFilters.vehicleTypes || [])],
      onStreets: [...(appliedFilters.onStreets || [])],
      years: [...(appliedFilters.years || [])],
      injuredOnly: !!appliedFilters.injuredOnly,
      killedOnly: !!appliedFilters.killedOnly
    });
    setFilterOpen(true);
  };

  const toggleTempBorough = (b) => {
    setTempFilters(t => {
      const setB = new Set(t.boroughs);
      if (setB.has(b)) setB.delete(b); else setB.add(b);
      return { ...t, boroughs: Array.from(setB) };
    });
  };

  const toggleTempFactor = (f) => {
    setTempFilters(t => {
      const setF = new Set(t.factors);
      if (setF.has(f)) setF.delete(f); else setF.add(f);
      return { ...t, factors: Array.from(setF) };
    });
  };

  const toggleTempVehicleType = (v) => {
    setTempFilters(t => {
      const s = new Set(t.vehicleTypes);
      if (s.has(v)) s.delete(v); else s.add(v);
      return { ...t, vehicleTypes: Array.from(s) };
    });
  };

  const toggleTempOnStreet = (sname) => {
    setTempFilters(t => {
      const s = new Set(t.onStreets);
      if (s.has(sname)) s.delete(sname); else s.add(sname);
      return { ...t, onStreets: Array.from(s) };
    });
  };

  const toggleTempYear = (y) => {
    setTempFilters(t => {
      const s = new Set(t.years);
      if (s.has(y)) s.delete(y); else s.add(y);
      return { ...t, years: Array.from(s) };
    });
  };

  const setTempInjuredOnly = (v) => setTempFilters(t => ({ ...t, injuredOnly: v }));
  const setTempKilledOnly = (v) => setTempFilters(t => ({ ...t, killedOnly: v }));

  const applyFilters = () => {
    setAppliedFilters({
      boroughs: tempFilters.boroughs,
      factors: tempFilters.factors,
      vehicleTypes: tempFilters.vehicleTypes,
      onStreets: tempFilters.onStreets,
      years: tempFilters.years,
      injuredOnly: tempFilters.injuredOnly,
      killedOnly: tempFilters.killedOnly
    });
    setTableOffset(0); // reset to first page when filters applied
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setTempFilters({ boroughs: [], factors: [], vehicleTypes: [], onStreets: [], years: [], injuredOnly: false, killedOnly: false });
    setAppliedFilters({ boroughs: [], factors: [], vehicleTypes: [], onStreets: [], years: [], injuredOnly: false, killedOnly: false });
    setFilterOpen(false);
  };

  // Graph filter handlers
  const openGraphFilter = () => {
    setTempGraphFilters({
      boroughs: [...(graphFilters.boroughs || [])],
      factors: [...(graphFilters.factors || [])],
      vehicleTypes: [...(graphFilters.vehicleTypes || [])],
      onStreets: [...(graphFilters.onStreets || [])],
      years: [...(graphFilters.years || [])],
      injuredOnly: !!graphFilters.injuredOnly,
      killedOnly: !!graphFilters.killedOnly
    });
    setGraphFilterOpen(true);
  };

  const toggleTempGraphBorough = (b) => {
    setTempGraphFilters(t => {
      const setB = new Set(t.boroughs);
      if (setB.has(b)) setB.delete(b); else setB.add(b);
      return { ...t, boroughs: Array.from(setB) };
    });
  };

  const toggleTempGraphFactor = (f) => {
    setTempGraphFilters(t => {
      const setF = new Set(t.factors);
      if (setF.has(f)) setF.delete(f); else setF.add(f);
      return { ...t, factors: Array.from(setF) };
    });
  };

  const toggleTempGraphVehicleType = (v) => {
    setTempGraphFilters(t => {
      const s = new Set(t.vehicleTypes);
      if (s.has(v)) s.delete(v); else s.add(v);
      return { ...t, vehicleTypes: Array.from(s) };
    });
  };

  const toggleTempGraphOnStreet = (sname) => {
    setTempGraphFilters(t => {
      const s = new Set(t.onStreets);
      if (s.has(sname)) s.delete(sname); else s.add(sname);
      return { ...t, onStreets: Array.from(s) };
    });
  };

  const toggleTempGraphYear = (y) => {
    setTempGraphFilters(t => {
      const s = new Set(t.years);
      if (s.has(y)) s.delete(y); else s.add(y);
      return { ...t, years: Array.from(s) };
    });
  };

  const applyGraphFilters = () => {
    setGraphFilters({
      boroughs: tempGraphFilters.boroughs,
      factors: tempGraphFilters.factors,
      vehicleTypes: tempGraphFilters.vehicleTypes,
      onStreets: tempGraphFilters.onStreets,
      years: tempGraphFilters.years,
      injuredOnly: tempGraphFilters.injuredOnly,
      killedOnly: tempGraphFilters.killedOnly
    });
    setGraphFilterOpen(false);
  };

  const setTempGraphInjuredOnly = (v) => setTempGraphFilters(t => ({ ...t, injuredOnly: v }));
  const setTempGraphKilledOnly = (v) => setTempGraphFilters(t => ({ ...t, killedOnly: v }));

  const clearGraphFilters = () => {
    setTempGraphFilters({ boroughs: [], factors: [], vehicleTypes: [], onStreets: [], years: [], injuredOnly: false, killedOnly: false });
    setGraphFilters({ boroughs: [], factors: [], vehicleTypes: [], onStreets: [], years: [], injuredOnly: false, killedOnly: false });
    setGraphFilterOpen(false);
  };

  return (

    <div className="app">
      <header className="hero">
        <div className="hero-inner">
          <div className="logo-wrap">
            <svg className="logo" viewBox="0 0 64 64" fill="none" aria-hidden>
              <rect x="0" y="0" width="64" height="64" rx="12" fill="url(#g)"/>
              <path d="M16 40 L28 24 L40 40" stroke="#061226" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <defs>
                <linearGradient id="g" x1="0" x2="1">
                  <stop offset="0" stopColor="#7B61FF"/>
                  <stop offset="1" stopColor="#00D4FF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="hero-text">
            <h1>NYC Collision Studio</h1>
            <p className="subtitle">A vibrant, interactive snapshot — explore collisions, victims, and contributing factors. (SAMPLE DATA)</p>
          </div>
        </div>

        <div className="overview">
          <div className="stat-card gradient-1">
            <div className="stat-label">Collisions</div>
            <div className="stat-value">{displaySummary.totalCollisions}</div>
            <div className="stat-note">Records shown</div>
          </div>
          <div className="stat-card gradient-2">
            <div className="stat-label">Injured</div>
            <div className="stat-value">{displaySummary.totalInjured}</div>
            <div className="stat-note">Number of injured people</div>
          </div>
          <div className="stat-card gradient-3">
            <div className="stat-label">Killed</div>
            <div className="stat-value">{displaySummary.totalKilled}</div>
            <div className="stat-note">Number of fatalities</div>
          </div>
          <div className="stat-card gradient-4">
            <div className="stat-label">Boroughs</div>
            <div className="stat-value">{displaySummary.boroughs.length}</div>
            <div className="stat-note">Distinct boroughs found</div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel charts compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <div className="panel-card" style={{ padding: '10px', marginBottom: '4px', background: 'linear-gradient(145deg, rgba(123, 97, 255, 0.08), rgba(0, 212, 255, 0.04))', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 12px 40px rgba(2,6,23,0.6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'start' }}>
              {/* Data Filtering Section */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500', color: '#dbeafe', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                  Data Filtering
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(219, 234, 254, 0.6)', lineHeight: '1.4' }}>
                  Narrow down the dataset to focus on specific criteria
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    className={graphFilters.boroughs.length || graphFilters.factors.length || graphFilters.vehicleTypes.length || graphFilters.onStreets.length || graphFilters.years.length || graphFilters.injuredOnly || graphFilters.killedOnly ? "control-btn active" : "control-btn"}
                    onClick={openGraphFilter}
                    style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: '1.4', justifyContent: 'flex-start' }}
                  >
                    Advanced Filters
                  </button>

                  <button
                    className={graphFilters.injuredOnly ? "control-btn active" : "control-btn"}
                    onClick={toggleGraphInjuredOnly}
                    style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: '1.4', justifyContent: 'flex-start' }}
                  >
                    Show Injuries Only
                  </button>

                  <button
                    className={graphFilters.killedOnly ? "control-btn active" : "control-btn"}
                    onClick={toggleGraphKilledOnly}
                    style={{ fontSize: '14px', padding: '12px 16px', minHeight: 'auto', lineHeight: '1.4', justifyContent: 'flex-start' }}
                  >
                    Show Fatalities Only
                  </button>
                </div>
              </div>

              {/* Report Generation Section */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '500', color: '#dbeafe', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                  Report Generation
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'rgba(219, 234, 254, 0.6)', lineHeight: '1.4' }}>
                  Create detailed PDF reports from the complete dataset
                </p>
                <button
                  className="control-btn primary"
                  onClick={handleGenerateFullDataReport}
                  disabled={isGeneratingFullReport}
                  style={{ fontSize: '14px', padding: '14px 20px', minHeight: 'auto', lineHeight: '1.4', width: '100%', fontWeight: '500' }}
                >
                  {isGeneratingFullReport ? "Generating Report..." : "Generate and download the Complete Dataset Report"}
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', width: '100%' }}>
            <div className="panel-card chart-small">
              <h4 className="panel-title">Borough Distribution crashes</h4>
              <div className="chart-container chart-container--borough">
                <ResponsiveContainer width="100%" height={viewportWidth < 600 ? 195 : 218}>
                  <BarChart
                    data={filteredSummary.boroughs}
                    margin={{ top: 6, right: 2, left: 2, bottom: 4 }}
                  >
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={viewportWidth < 600 ? 0 : -32}
                      textAnchor={viewportWidth < 600 ? 'middle' : 'end'}
                      height={viewportWidth < 600 ? 36 : 62}
                      tick={{
                        fill: '#9aa4b2',
                        fontSize: viewportWidth < 600 ? 9 : 10
                      }}
                      tickFormatter={
                        viewportWidth < 600
                          ? formatBoroughAxisCompact
                          : formatBoroughAxisLabel
                      }
                    />
                    <YAxis hide />
                    <Tooltip /><defs>
                      <linearGradient id="boroughGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8A63FF"/>
                        <stop offset="100%" stopColor="#5A3CE0"/>
                      </linearGradient>
                    </defs>
                    <Bar dataKey="value" fill="url(#boroughGradient)" radius={[6,6,6,6]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-card chart-small">
              <h4 className="panel-title">Collisions by Hour</h4>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={filteredSummary.collisionsByHourData}>
                    <XAxis dataKey="hour" tick={{ fill: '#9aa4b2', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9aa4b2', fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="collisions" stroke="#ff61c0ff" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-card top-factors-card">
              <h4 className="panel-title">Top Contributing Factors</h4>
              <div className="top-factors-list">
                {filteredSummary.topFactors.map((f, i) => (
                  <div className="factor-row" key={i}>
                    <div className="factor-icon">
                      {i === 0 && "🚗"}
                      {i === 1 && "⚠️"}
                      {i === 2 && "👀"}
                      {i === 3 && "🌧️"}
                      {i === 4 && "📱"}
                      {i === 5 && "❓"}
                    </div>
                    <div className="factor-info">
                      <div className="factor-name">{f.name}</div>
                      <div className="factor-bar-wrap">
                        <div
                          className="factor-bar"
                          style={{
                            width: `${filteredSummary.topFactors[0] && filteredSummary.topFactors[0].value > 0 ? (f.value / filteredSummary.topFactors[0].value) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="factor-value">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
         
        </section>

        <section className="panel table-panel">
          <div className="table-container">
            <div className="table-wrap">
              <h3 className="panel-title">Data preview (first rows)</h3>

              {/* table controls: Filtering, Search Mode, Generate Report */}
              <div className="table-controls">
                <button
                  className={appliedFilters.boroughs.length || appliedFilters.factors.length ? "control-btn active" : "control-btn"}
                  onClick={openFilter}
                >
                  Filter
                </button>

                <button
                  className={searchMode ? "control-btn active" : "control-btn"}
                  onClick={() => {
                    setSearchMode(v => !v);
                    if (searchMode) setSearchQuery(''); // clearing when closing
                  }}
                >
                  Search
                </button>

                {/* inline search field shown when searchMode is active */}
                {searchMode && (
                  <input
                    className="search-input"
                    placeholder="Search rows (use commas to search multiple terms, e.g. bronx, sedan)…"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setTableOffset(0); // reset page on new search
                    }}
                  />
                )}
              </div>

              {/* horizontal scroll wrapper keeps visual size but allows swiping to see all columns */}
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {tableColumns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(tableOffset, tableOffset + pageSize).map((r, i) => (
                      <tr key={i}>
                        {tableColumns.map(col => {
                          const v = r?.[col] ?? '';
                          const text = v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
                          return <td key={col}>{text}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-note">Showing up to 6 rows from the loaded dataset. ({filteredData.length} rows match filters)</div>
            </div>
          </div>

         {/* pager controls moved outside the visual table card */}
         <div className="table-pager" aria-label="Table pager">
           <button
             className="pager-btn"
             onClick={() => setTableOffset(o => Math.max(0, o - pageSize))}
             disabled={tableOffset === 0}
             title="Previous rows"
           >
             ▲
           </button>
           <button
             className="pager-btn"
             onClick={() => setTableOffset(o => Math.min(o + pageSize, Math.max(0, filteredData.length - pageSize)))}
             disabled={tableOffset + pageSize >= filteredData.length}
             title="Next rows"
           >
             ▼
           </button>
         </div>
           </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-text">
            <p>NYC Collision Studio — Visualizing traffic collisions in NYC.</p>
            <p>Data Source: NYC Open Data</p>
          </div>

          <div className="footer-links">
            <a href="#" className="link">About</a>
            <a href="#" className="link">Contact</a>
            <a href="#" className="link">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* Filter modal / panel */}
      {filterOpen && (
        <div className="filter-overlay filter-overlay--top" onClick={() => setFilterOpen(false)}>
          <div className="filter-panel" onClick={e => e.stopPropagation()}>
            <div className="filter-panel-header">
              <div className="filter-actions filter-actions--top-bar">
                <button type="button" className="control-btn" onClick={() => setFilterOpen(false)}>Cancel</button>
                <button type="button" className="control-btn" onClick={clearFilters}>Clear</button>
                <button type="button" className="control-btn primary" onClick={applyFilters}>Apply</button>
              </div>
              <h3>Filter data</h3>
            </div>
            <div className="filter-panel-body">
              <div className="filter-grid">
              <div>
                <strong>Boroughs</strong>
                <div className="filter-list">
                  {boroughOptions.map(b => (
                    <label key={b} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempFilters.boroughs.includes(b)}
                        onChange={() => toggleTempBorough(b)}
                      /> {b}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Contributing factors</strong>
                <div className="filter-list">
                  {factorOptions.slice(0, 40).map(f => (
                    <label key={f} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempFilters.factors.includes(f)}
                        onChange={() => toggleTempFactor(f)}
                      /> {f}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Vehicle type</strong>
                <div className="filter-list">
                  {vehicleTypeOptions.map(v => (
                    <label key={v} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempFilters.vehicleTypes.includes(v)}
                        onChange={() => toggleTempVehicleType(v)}
                      /> {v}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>On street</strong>
                <div className="filter-list">
                  {onStreetOptions.map(sname => (
                    <label key={sname} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempFilters.onStreets.includes(sname)}
                        onChange={() => toggleTempOnStreet(sname)}
                      /> {sname}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Years</strong>
                <div className="filter-list">
                  {yearOptions.map(y => (
                    <label key={y} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempFilters.years.includes(y)}
                        onChange={() => toggleTempYear(y)}
                      /> {y}
                    </label>
                  ))}
                </div>
              </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graph Filter modal / panel */}
      {graphFilterOpen && (
        <div className="filter-overlay" onClick={() => setGraphFilterOpen(false)}>
          <div className="filter-panel filter-panel--charts" onClick={e => e.stopPropagation()}>
            <div className="filter-panel-header filter-panel-header--charts">
              <h3>Filter Charts</h3>
              <div className="filter-actions filter-actions--top-bar">
                <button type="button" className="control-btn" onClick={() => setGraphFilterOpen(false)}>Cancel</button>
                <button type="button" className="control-btn" onClick={clearGraphFilters}>Clear</button>
                <button type="button" className="control-btn primary" onClick={applyGraphFilters}>Apply</button>
              </div>
            </div>
            <div className="filter-panel-body filter-panel-body--charts">
              <div className="filter-grid">
              <div>
                <strong>Boroughs</strong>
                <div className="filter-list">
                  {boroughOptions.map(b => (
                    <label key={b} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempGraphFilters.boroughs.includes(b)}
                        onChange={() => toggleTempGraphBorough(b)}
                      /> {b}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Contributing factors</strong>
                <div className="filter-list">
                  {factorOptions.slice(0, 40).map(f => (
                    <label key={f} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempGraphFilters.factors.includes(f)}
                        onChange={() => toggleTempGraphFactor(f)}
                      /> {f}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Vehicle type</strong>
                <div className="filter-list">
                  {vehicleTypeOptions.map(v => (
                    <label key={v} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempGraphFilters.vehicleTypes.includes(v)}
                        onChange={() => toggleTempGraphVehicleType(v)}
                      /> {v}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>On street</strong>
                <div className="filter-list">
                  {onStreetOptions.map(sname => (
                    <label key={sname} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempGraphFilters.onStreets.includes(sname)}
                        onChange={() => toggleTempGraphOnStreet(sname)}
                      /> {sname}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong>Years</strong>
                <div className="filter-list">
                  {yearOptions.map(y => (
                    <label key={y} className="filter-item">
                      <input
                        type="checkbox"
                        checked={tempGraphFilters.years.includes(y)}
                        onChange={() => toggleTempGraphYear(y)}
                      /> {y}
                    </label>
                  ))}
                </div>
              </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report View modal */}
      {reportOpen && (
  <div className="report-overlay" onClick={() => setReportOpen(false)}>
    <div className="report-panel" id="report-view" onClick={e => e.stopPropagation()}>
      <div className="report-header">
        <h2>Official Collision Report</h2>
        <div className="report-actions">
          <button className="control-btn report-close" onClick={() => setReportOpen(false)}>Close</button>
          <button className="control-btn primary" onClick={() => downloadReportAsPDF('sample')}>Download PDF</button>
        </div>
        </div>

      <div className="section summary">
        <div className="stat"><div className="stat-label">Total Collisions</div><div className="stat-value">{displaySummary.totalCollisions}</div></div>
        <div className="stat"><div className="stat-label">Total Injured</div><div className="stat-value">{displaySummary.totalInjured}</div></div>
        <div className="stat"><div className="stat-label">Total Killed</div><div className="stat-value">{displaySummary.totalKilled}</div></div>
      </div>

      <div className="section">
        <h3>Borough distribution</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={displaySummary.boroughs}>
              <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="value" fill="#7B61FF" radius={[6,6,6,6]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Collisions by hour</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={displaySummary.collisionsByHourData}>
              <XAxis dataKey="hour" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="collisions" stroke="#00D4FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Location Coverage</h3>
        <p className="paragraph">
          This report contains {locationData.lats.length} crash records with valid location data across NYC boroughs. 
          Interactive heat map visualization available in the main dashboard for detailed geographic analysis.
        </p>
      </div>

      <div className="section">
        <h3>Report summary</h3>
        <p className="paragraph">
          This report summarises the currently loaded collision dataset. Totals reflect the filtered view at the time of generation.
          Review borough distribution, hourly patterns, and location heat map above for operational planning and prioritization.
        </p>
      </div>
    </div>
  </div>
)}

{/* Full Data Report Modal */}
{fullDataReportOpen && fullDataReport && (
  <div className="report-overlay" onClick={() => setFullDataReportOpen(false)}>
    <div className="report-panel" id="full-report-view" onClick={e => e.stopPropagation()}>
      <div className="report-header">
        <h2>Complete Dataset Report</h2>
        <div className="report-actions">
          <button className="control-btn report-close" onClick={() => setFullDataReportOpen(false)}>Close</button>
          <button className="control-btn primary" onClick={() => downloadReportAsPDF('full')}>Download PDF</button>
        </div>
      </div>

      <div className="section summary">
        <div className="stat"><div className="stat-label">Total Collisions</div><div className="stat-value">{fullDataReport.totalCollisions.toLocaleString()}</div></div>
        <div className="stat"><div className="stat-label">Total Injured</div><div className="stat-value">{fullDataReport.totalInjured.toLocaleString()}</div></div>
        <div className="stat"><div className="stat-label">Total Killed</div><div className="stat-value">{fullDataReport.totalKilled.toLocaleString()}</div></div>
      </div>

      <div className="section">
        <h3>Crashes by Borough</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fullDataReport.boroughs}>
              <XAxis dataKey="name" tick={{ fill: '#334155', fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Crashes']} />
              <Bar dataKey="value" fill="#7B61FF" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Crashes by Hour of Day</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={fullDataReport.collisionsByHourData}>
              <XAxis dataKey="hour" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Crashes']} />
              <Line type="monotone" dataKey="collisions" stroke="#00D4FF" strokeWidth={3} dot={{ fill: '#00D4FF', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Injuries and Fatalities by Type</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ textAlign: 'center', color: '#334155', marginBottom: '10px', fontSize: '14px' }}>Injuries</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fullDataReport.injuryFatalityData.filter(item => item.category === 'Injuries')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="type" tick={{ fill: '#334155', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Injuries']} />
                <Bar dataKey="count" fill="#FFD166" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 style={{ textAlign: 'center', color: '#334155', marginBottom: '10px', fontSize: '14px' }}>Fatalities</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fullDataReport.injuryFatalityData.filter(item => item.category === 'Fatalities')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="type" tick={{ fill: '#334155', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} />
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Fatalities']} />
                <Bar dataKey="count" fill="#FF6B6B" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Top 10 Contributing Factors</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fullDataReport.topFactors} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <XAxis dataKey="factor" tick={{ fill: '#334155', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Crashes']} />
              <Bar dataKey="count" fill="#4ECDC4" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Crashes by Year</h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={fullDataReport.crashesByYearData}>
              <XAxis dataKey="year" tick={{ fill: '#334155', fontSize: 12 }} />
              <YAxis tick={{ fill: '#334155', fontSize: 12 }} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Crashes']} />
              <Line type="monotone" dataKey="crashes" stroke="#FF6B6B" strokeWidth={3} dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <h3>Report Summary</h3>
        <p className="paragraph">
          This comprehensive metadata report analyzes the complete NYC collision dataset, providing insights into crash patterns, contributing factors, and temporal trends. The data covers {fullDataReport.totalCollisions.toLocaleString()} collision records across all five boroughs, with detailed breakdowns by time, location, and severity.
        </p>
        <p className="paragraph">
          Key findings include peak crash hours, borough-specific patterns, and the most common contributing factors leading to collisions. This analysis helps identify high-risk periods and areas for targeted safety interventions.
        </p>
      </div>
    </div>
  </div>
)}

{/* Device Recommendation Popup */}
{showDevicePopup && (
  <div className="device-popup-overlay" onClick={dismissDevicePopup}>
    <div className="device-popup" onClick={e => e.stopPropagation()}>
      <div className="device-popup-header">
        <div className="device-icon">💻</div>
        <button className="device-popup-close" onClick={dismissDevicePopup}>×</button>
      </div>
      <div className="device-popup-content">
        <h3>Best Experience on Desktop</h3>
        <p>For the optimal viewing experience of NYC Collision Studio, we recommend using a laptop, desktop, or tablet.</p>
        <p>If you're on a phone, try rotating to landscape orientation for better data visualization.</p>
        <div className="device-popup-actions">
          <button className="control-btn primary" onClick={dismissDevicePopup}>Got it!</button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>

  );
}

export default App;
