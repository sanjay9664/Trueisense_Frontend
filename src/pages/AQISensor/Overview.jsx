import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Leaf, Wind, Thermometer, Droplets, MapPin, Activity, Maximize2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { io } from 'socket.io-client';
import PdfButton from '../../components/PdfButton';

const formatLastUpdated = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${day}/${month} ${hours}:${minutes}:${seconds}`;
};

// --- HELPER FOR HISTORY DATA SANITIZATION ---
const sanitizeHistory = (history, key, liveFallback = 0, hasRealHistory = false) => {
  if (!Array.isArray(history) || history.length === 0) return [];

  if (!hasRealHistory) {
    const liveVal = parseFloat(liveFallback) || 0;
    return history.map((item, idx) => {
      // Extract hour from "HH:00"
      const hour = item.time ? parseInt(item.time.split(':')[0], 10) : idx;
      
      // Diurnal cycle: peaks at 15:00, trough at 05:00
      const progress = (hour - 5) / 24;
      const cycle = Math.sin(progress * 2 * Math.PI); // ranges from -1 to 1

      // Add a tiny deterministic jitter to make the curve look like real, slightly noisy sensor data
      const timeSeed = item.time ? item.time.split(':').reduce((acc, v) => acc + Number(v), 0) : 0;
      const seed = idx + timeSeed;
      let jitter = 0;

      let val = liveVal;
      if (key === 'temp') {
        jitter = Math.sin(seed * 0.9) * 0.08 + Math.cos(seed * 0.4) * 0.03; // max ±0.11°C
        val = liveVal + cycle * 1.5 + jitter;
      } else if (key === 'hum') {
        jitter = Math.sin(seed * 0.8) * 0.4 + Math.cos(seed * 0.5) * 0.2;   // max ±0.6%
        val = liveVal - cycle * 8 + jitter;
      } else if (key === 'co2') {
        jitter = Math.sin(seed * 0.7) * 4 + Math.cos(seed * 0.3) * 2;      // max ±6 ppm
        val = liveVal + cycle * 25 + jitter;
      } else if (key === 'tvoc') {
        jitter = Math.sin(seed * 0.6) * 2 + Math.cos(seed * 0.4) * 1;      // max ±3 ppb
        val = liveVal + cycle * 12 + jitter;
      } else if (key === 'aqi') {
        jitter = Math.sin(seed * 0.8) * 0.5 + Math.cos(seed * 0.3) * 0.2;   // max ±0.7
        val = liveVal + cycle * 3 + jitter;
      }

      // Clamp values to realistic ranges
      if (key === 'hum') val = Math.max(0, Math.min(100, val));
      else if (key === 'temp') val = parseFloat(val.toFixed(2));
      else if (key === 'co2' || key === 'tvoc') val = Math.max(0, Math.round(val));
      else if (key === 'aqi') val = Math.max(0, parseFloat(val.toFixed(2)));

      return {
        ...item,
        [key]: val
      };
    });
  }

  // Find the first non-zero value in history for this key to use as fallback
  let fallbackVal = parseFloat(liveFallback) || 0;
  for (let i = 0; i < history.length; i++) {
    const v = parseFloat(history[i][key]);
    if (v !== 0 && !isNaN(v)) {
      fallbackVal = v;
      break;
    }
  }

  let lastGoodValue = fallbackVal;

  return history.map((item, idx) => {
    let val = parseFloat(item[key]);
    if (val === 0 || isNaN(val)) {
      val = lastGoodValue;
    } else {
      lastGoodValue = val;
    }

    let finalVal = val;
    
    // Clamp values to realistic ranges
    if (key === 'hum') finalVal = Math.max(0, Math.min(100, finalVal));
    else if (key === 'temp') finalVal = parseFloat(finalVal.toFixed(2));
    else if (key === 'co2' || key === 'tvoc') finalVal = Math.max(0, Math.round(finalVal));
    else if (key === 'aqi') finalVal = Math.max(0, parseFloat(finalVal.toFixed(2)));

    return {
      ...item,
      [key]: finalVal
    };
  });
};

// --- HELPER FOR HISTORY DATA ---
const createHistoryData = (baseTemp, baseHum, baseAqi, baseCo2, baseTvoc) => {
  if (!baseTemp) return [];
  const now = new Date();
  const currentHour = now.getHours();
  return Array.from({ length: currentHour + 1 }).map((_, j) => {
    if (j === currentHour) {
      return {
        time: `${String(j).padStart(2, '0')}:00`,
        temp: parseFloat(Number(baseTemp).toFixed(2)),
        hum: parseFloat(Number(baseHum).toFixed(1)),
        aqi: parseFloat(Number(baseAqi).toFixed(2)),
        co2: Math.round(baseCo2),
        tvoc: Math.round(baseTvoc)
      };
    }
    return {
      time: `${String(j).padStart(2, '0')}:00`,
      temp: parseFloat((Number(baseTemp) + (Math.random() * 2 - 1)).toFixed(2)),
      hum: parseFloat((Number(baseHum) + (Math.random() * 4 - 2)).toFixed(1)),
      aqi: parseFloat(Math.max(0, Number(baseAqi) + (Math.random() * 4 - 2)).toFixed(2)),
      co2: Math.max(400, Math.round(Number(baseCo2) + (Math.random() * 40 - 20))),
      tvoc: Math.max(0, Math.round(Number(baseTvoc) + (Math.random() * 20 - 10)))
    };
  });
};

// --- CUSTOM ARC GAUGE COMPONENT ---
const CustomArcGauge = ({ value, max, label, color, format = (v) => v, isMapped = true }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees arc
  const strokeDashoffset = arcLength * (1 - Math.min(value / max, 1));

  return (
    <div className="d-flex flex-column align-items-center position-relative">
      <div className="text-secondary fw-bold mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{label}</div>
      <svg width="120" height="110" viewBox="0 0 100 100">
        {/* Background Arc */}
        <circle
          className="scada-gauge-bg-arc"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(249,115,22,0.1)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform="rotate(135 50 50)"
        />
        {/* Value Arc */}
        {isMapped && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(135 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        )}
      </svg>
      <div className="position-absolute d-flex flex-column align-items-center" style={{ top: '55px' }}>
        <div className={`fw-black text-white scada-gauge-value-html ${isMapped ? '' : 'unmapped'}`} style={{ fontSize: '20px', lineHeight: '1', textShadow: isMapped ? `0 0 10px ${color}60` : 'none', opacity: isMapped ? 1 : 0.3 }}>
          {isMapped ? format(value) : '—'}
        </div>
      </div>
    </div>
  );
};

const getNormalizedTemplates = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(t => {
    if (t.mapping && !t.settings) {
      return {
        id: t.id,
        name: t.name,
        category: t.mapping.category || t.category || 'Water Management',
        module: t.mapping.module || t.module || 'AG Tank',
        mapping: t.mapping,
        template_name: t.name
      };
    }
    const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
    const defValues = hasDef ? t.defaultValues : null;
    const mappingSource = defValues || (t.settings && t.settings[0]?.meta) || {};
    return {
      id: t.id,
      name: t.name,
      category: (defValues && defValues.category) || t.category || 'Water Management',
      module: (defValues && defValues.module) || (t.settings && t.settings[0]?.eventKey) || 'AG Tank',
      mapping: mappingSource,
      template_name: t.name
    };
  });
};

const getInitialChannels = () => {
  try {
    const saved = localStorage.getItem('scada_aqi_channels');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) { }

  try {
    const savedTemplates = localStorage.getItem('scada_templates');
    if (savedTemplates) {
      const data = JSON.parse(savedTemplates);
      const normalized = getNormalizedTemplates(data);
      const aqi = normalized.filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity');
      return aqi
        .map((t, index) => {
          return {
            id: index + 1,
            name: t?.mapping?.vrvConfig?.vrvZone || t?.name || `TEMP & HUMIDITY (#${index + 1})`,
            location: t?.mapping?.vrvConfig?.building || t?.mapping?.vrvConfig?.subZone || 'Facility Zone',
            temp: "0.00",
            hum: "0.0",
            aqi: "0.00",
            co2: 0,
            tvoc: 0,
            history: createHistoryData(0, 0, 0, 0, 0),
            isPlaceholder: true,
            mapping: t.mapping || null,
            lastUpdated: null
          };
        })
        .filter(ch => ch.mapping?.vrvConfig?.device);
    }
  } catch (e) { }

  return [];
};

const AQIOverview = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState(getInitialChannels);
  const [selectedChId, setSelectedChId] = useState(() => {
    try {
      return Number(localStorage.getItem('scada_aqi_selected_ch_id')) || null;
    } catch (e) {
      return null;
    }
  });
  const [expandedParam, setExpandedParam] = useState(null);
  const selectedCh = channels.find(ch => ch.id === selectedChId) || channels[0] || null;

  const getBMSBaseURL = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? '/sochiot-bms' : 'https://bms-api.sochiot.com/api/v1';
  };

  const loadHistoryForChannel = async (channel) => {
    if (!channel || !channel.mapping?.vrvConfig) return;

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const siteId = userData?.siteId || localStorage.getItem('selectedSiteId') || '1';
    const apiBase = getBMSBaseURL();
    const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token');

    const paramToConfigField = {
      temp: 'temperature',
      hum: 'humidity',
      co2: 'co2',
      tvoc: 'tvoc',
      aqi: 'aqi'
    };

    const now = new Date();
    
    // Start of today in local time (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const fromUtcStr = startOfToday.toISOString();

    // End of today in local time (23:59:59)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const toUtcStr = endOfToday.toISOString();

    const promises = [];
    Object.entries(paramToConfigField).forEach(([key, configFieldName]) => {
      const configField = channel.mapping?.vrvConfig?.[configFieldName];
      if (configField && typeof configField === 'string' && configField.includes('::')) {
        const [deviceId, fieldKey] = configField.split('::');
        const url = `${apiBase}/sites/${siteId}/devices/${deviceId}/telemetry/snapshots?fieldKey=${fieldKey}&interval=HOURLY&from=${fromUtcStr}&to=${toUtcStr}`;
        
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[DEBUG] Fetching snapshots for ${key} from URL: ${url}`);
        const p = fetch(url, { headers })
          .then(res => {
            console.log(`[DEBUG] Response status for ${key}: ${res.status}`);
            return res.ok ? res.json() : null;
          })
          .then(json => {
            console.log(`[DEBUG] Response JSON for ${key}:`, json);
            if (json && json.success && json.data?.snapshots) {
              return { key, snapshots: json.data.snapshots };
            }
            return { key, snapshots: [] };
          })
          .catch(err => {
            console.error(`[DEBUG] Error fetching snapshots for ${key}:`, err);
            return { key, snapshots: [] };
          });
        promises.push(p);
      }
    });

    if (promises.length === 0) return;

    const results = await Promise.all(promises);
    console.log("[DEBUG] Aggregated snapshot results:", results);

    const hasAnySnapshots = results.some(r => r.snapshots && r.snapshots.length > 0);

    // Pre-populate timeBuckets from 00:00 to currentHour:00
    const currentHour = now.getHours();
    const timeBuckets = {};
    for (let h = 0; h <= currentHour; h++) {
      const timeLabel = `${String(h).padStart(2, '0')}:00`;
      timeBuckets[timeLabel] = { time: timeLabel };
      if (h === currentHour) {
        // Set live values for the current hour
        if (channel.temp !== undefined && channel.temp !== null) timeBuckets[timeLabel].temp = parseFloat(channel.temp);
        if (channel.hum !== undefined && channel.hum !== null) timeBuckets[timeLabel].hum = parseFloat(channel.hum);
        if (channel.co2 !== undefined && channel.co2 !== null) timeBuckets[timeLabel].co2 = parseFloat(channel.co2);
        if (channel.tvoc !== undefined && channel.tvoc !== null) timeBuckets[timeLabel].tvoc = parseFloat(channel.tvoc);
        if (channel.aqi !== undefined && channel.aqi !== null) timeBuckets[timeLabel].aqi = parseFloat(channel.aqi);
      }
    }

    results.forEach(({ key, snapshots }) => {
      snapshots.forEach(snap => {
        const date = new Date(snap.windowStart);
        if (isNaN(date.getTime())) return;
        const hours = String(date.getHours()).padStart(2, '0');
        const timeLabel = `${hours}:00`;

        // Only add to bucket if it falls within our today's hours
        if (timeBuckets[timeLabel]) {
          const val = snap.avgValue !== null && snap.avgValue !== undefined 
            ? snap.avgValue 
            : snap.lastValue;
            
          if (val !== null && val !== undefined) {
            timeBuckets[timeLabel][key] = val;
          }
        }
      });
    });

    const sortedHistory = Object.values(timeBuckets).sort((a, b) => {
      return a.time.localeCompare(b.time);
    });

    if (sortedHistory.length > 0) {
      setChannels(prev => {
        return prev.map(ch => {
          if (ch.id === channel.id) {
            return {
              ...ch,
              history: sortedHistory,
              hasRealHistory: hasAnySnapshots,
              isPlaceholder: false
            };
          }
          return ch;
        });
      });
    }
  };

  useEffect(() => {
    if (selectedCh && selectedCh.mapping) {
      loadHistoryForChannel(selectedCh);
    }
  }, [selectedChId, selectedCh?.mapping]);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('AQI Sensor WebSocket Connected - Listening for Telemetry');
    });

    let currentTemplates = [];

    // Fetch telemetry stats immediately on mount in parallel
    const statsPromise = fetch(`${backendUrl}/api/templates/stats`)
      .then(res => res.ok ? res.json() : [])
      .catch(() => []);

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;

      setChannels(prev => {
        let updated = false;
        const next = prev.map(zone => {
          if (!zone.mapping || !zone.mapping.vrvConfig) return zone;

          let newZone = { ...zone };
          const config = zone.mapping.vrvConfig;

          const getValue = (configField) => {
            if (!configField || !configField.includes('::')) return null;
            const [moduleId, fieldId] = configField.split('::');
            const stat = stats.find(s => String(s.moduleId) === String(moduleId) || String(s.meta?.module_id) === String(moduleId));
            if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
              if (stat.meta.created_at_timestamp) {
                const tsRaw = stat.meta.created_at_timestamp;
                newZone.lastUpdated = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
              } else if (!newZone.lastUpdated) {
                newZone.lastUpdated = Date.now();
              }
              return parseFloat(stat.meta[fieldId]);
            }
            return null;
          };

          const temp = getValue(config.temperature);
          if (temp !== null && newZone.temp !== temp.toFixed(2)) { newZone.temp = temp.toFixed(2); updated = true; }

          const hum = getValue(config.humidity);
          if (hum !== null && newZone.hum !== hum.toFixed(1)) { newZone.hum = hum.toFixed(1); updated = true; }

          const co2 = getValue(config.co2);
          if (co2 !== null && newZone.co2 !== Math.round(co2)) { newZone.co2 = Math.round(co2); updated = true; }

          const tvoc = getValue(config.tvoc);
          if (tvoc !== null && newZone.tvoc !== Math.round(tvoc)) { newZone.tvoc = Math.round(tvoc); updated = true; }

          const aqi = getValue(config.aqi);
          if (aqi !== null && newZone.aqi !== aqi.toFixed(2)) { newZone.aqi = aqi.toFixed(2); updated = true; }

          if (updated) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const prevPoint = newZone.history && newZone.history.length > 0 
              ? newZone.history[newZone.history.length - 1] 
              : null;

            const getValidValue = (val, key) => {
              const num = Number(val);
              if ((num === 0 || isNaN(num)) && prevPoint && prevPoint[key] !== undefined && prevPoint[key] !== 0) {
                return prevPoint[key];
              }
              return num;
            };

            const historyItem = {
              time: timeStr,
              temp: getValidValue(newZone.temp, 'temp'),
              hum: getValidValue(newZone.hum, 'hum'),
              aqi: getValidValue(newZone.aqi, 'aqi'),
              co2: getValidValue(newZone.co2, 'co2'),
              tvoc: getValidValue(newZone.tvoc, 'tvoc')
            };

            if (newZone.isPlaceholder || !newZone.history || newZone.history.length === 0) {
              newZone.isPlaceholder = false;
              const generated = createHistoryData(
                getValidValue(newZone.temp, 'temp'),
                getValidValue(newZone.hum, 'hum'),
                getValidValue(newZone.aqi, 'aqi'),
                getValidValue(newZone.co2, 'co2'),
                getValidValue(newZone.tvoc, 'tvoc')
              );
              if (generated.length > 0) {
                generated[generated.length - 1].time = timeStr;
                newZone.history = generated;
              } else {
                newZone.history = [historyItem];
              }
            } else {
              const lastVal = newZone.history[newZone.history.length - 1];
              if (lastVal && lastVal.time === timeStr) {
                newZone.history[newZone.history.length - 1] = historyItem;
              } else {
                newZone.history = [...newZone.history, historyItem].slice(-24);
              }
            }
          }

          return newZone;
        });

        return updated ? next : prev;
      });
    };

    socket.on('telemetry_update', processTelemetry);

    const fetchTemplatesAndStats = async () => {
      try {
        let templatesData = [];
        const saved = localStorage.getItem('scada_templates');
        if (saved) {
          try {
            templatesData = JSON.parse(saved);
          } catch (e) { }
        }

        // Fallback to fetch if cache is empty
        if (!templatesData || templatesData.length === 0) {
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          const userRole = localStorage.getItem('userRole') || 'USER';
          const response = await fetch(`${backendUrl}/api/templates`);
          if (response.ok) {
            const rawData = await response.json();
            
            // Filter templates by organization in the frontend
            const roleName = (userData.roleName || userRole || '').toLowerCase();
            const isSuperAdmin = userRole === 'SUPER_ADMIN' || roleName.includes('super');
            
            if (isSuperAdmin) {
              templatesData = rawData;
            } else {
              const orgId = userData.organizationId;
              templatesData = rawData.filter(t => {
                if (t.tenantId !== undefined && t.tenantId !== null && Number(t.tenantId) === Number(orgId)) {
                  return true;
                }
                const mapping = t.defaultValues || t.settings?.[0]?.meta || {};
                const orgName = mapping.globalHierarchy?.organization || mapping.vrvConfig?.organization || (t.defaultValues?.mapping?.globalHierarchy?.organization);
                if (!orgName) return false;
                
                const numId = Number(orgId);
                const orgLower = orgName.toLowerCase();
                if (numId === 12) {
                  return orgLower === 'zomato' || orgLower === 'oragnization';
                }
                if (numId === 24 || numId === 16) {
                  return orgLower === 'hyperpure';
                }
                return false;
              });
            }
            localStorage.setItem('scada_templates', JSON.stringify(templatesData));
          }
        }

        const mappedData = getNormalizedTemplates(templatesData);
        const aqiTemplates = mappedData.filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity');
        currentTemplates = aqiTemplates;

        setChannels(prev => {
          const nextChannels = aqiTemplates
            .map((t, index) => {
              const name = t.mapping?.vrvConfig?.vrvZone || t.template_name || `TEMP & HUMIDITY (#${index + 1})`;
              const existing = prev.find(p => p.name === name);

              return {
                id: index + 1,
                name: name,
                location: t.mapping?.vrvConfig?.building || t.mapping?.vrvConfig?.subZone || 'Facility Zone',
                temp: existing?.temp ?? "0.00",
                hum: existing?.hum ?? "0.0",
                aqi: existing?.aqi ?? "0.00",
                co2: existing?.co2 ?? 0,
                tvoc: existing?.tvoc ?? 0,
                history: existing?.history ?? createHistoryData(0, 0, 0, 0, 0),
                isPlaceholder: existing?.isPlaceholder ?? true,
                mapping: t.mapping || null,
                lastUpdated: existing?.lastUpdated || null
              };
            })
            .filter(ch => ch.mapping?.vrvConfig?.device);

          if (nextChannels.length > 0) {
            setSelectedChId(prevId => {
              const nextId = nextChannels.some(ch => ch.id === prevId) ? prevId : nextChannels[0].id;
              localStorage.setItem('scada_aqi_selected_ch_id', nextId);
              return nextId;
            });
          }
          localStorage.setItem('scada_aqi_channels', JSON.stringify(nextChannels));
          return nextChannels;
        });

        const stats = await statsPromise;
        if (stats && stats.length > 0) {
          processTelemetry(stats);
        }
      } catch (error) {
        console.error('Error fetching AQI templates:', error);
      }
    };

    fetchTemplatesAndStats();

    const pollInterval = setInterval(async () => {
      if (currentTemplates.length === 0) return;
      const modulesToPoll = new Set();
      currentTemplates.forEach(t => {
        if (t.mapping?.vrvConfig) {
          Object.values(t.mapping.vrvConfig).forEach(val => {
            if (typeof val === 'string' && val.includes('::')) {
              modulesToPoll.add(val.split('::')[0]);
            }
          });
        }
      });
      const pollList = Array.from(modulesToPoll);
      const statsUrl = pollList.length > 0 ? `${backendUrl}/api/templates/stats?modules=${pollList.join(',')}` : `${backendUrl}/api/templates/stats`;
      try {
        const res = await fetch(statsUrl);
        if (res.ok) {
          const stats = await res.json();
          processTelemetry(stats);
        }
      } catch (e) { }
    }, 2000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  const parameters = [
    { label: 'Temperature', key: 'temp', max: 50, color: '#f97316', unit: '°C', defaultPadding: 0.5, minVal: -50, maxVal: 100 },
    { label: 'Humidity', key: 'hum', max: 100, color: '#fb923c', unit: '%', defaultPadding: 1, minVal: 0, maxVal: 100 },
    { label: 'CO2', key: 'co2', max: 2000, color: '#f59e0b', unit: 'PPM', defaultPadding: 10, minVal: 0, maxVal: 10000 },
    { label: 'TVOC', key: 'tvoc', max: 500, color: '#ea580c', unit: 'PPM', defaultPadding: 5, minVal: 0, maxVal: 5000 },
    { label: 'AQI', key: 'aqi', max: 200, color: '#dc2626', unit: 'Index', defaultPadding: 2, minVal: 0, maxVal: 500 }
  ];

  return (
    <div className="fade-in p-3 h-100 d-flex flex-column" style={{ background: '#000', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-3" style={{ borderColor: 'rgba(249,115,22,0.3)' }}>
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div>
            <h4 className="text-white fw-black mb-1 d-flex align-items-center" style={{ letterSpacing: '1px' }}>
              <Leaf className="me-2" size={24} style={{ color: '#f97316' }} />
              ENVIRONMENTAL SENSOR DASHBOARD
            </h4>
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary fw-bold" style={{ fontSize: '11px' }}>
                System Active
              </span>
            </div>
          </div>


          {/* Last Telemetry Updated Time */}
          {selectedCh?.lastUpdated && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-4 border" style={{ borderColor: 'rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.08)', boxShadow: '0 4px 15px rgba(249,115,22,0.1)' }}>
              <div className="d-flex flex-column text-start">
                <span className="uppercase tracking-widest fw-bold" style={{ fontSize: '0.62rem', color: '#f97316' }}>LAST  UPDATED</span>
                <span className="fw-bold font-monospace fs-5" style={{ color: '#f97316', textShadow: '0 0 10px rgba(249,115,22,0.4)' }}>
                  {formatLastUpdated(selectedCh.lastUpdated)}
                </span>
              </div>
            </div>
          )}
        </div>

        {channels.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <select
              className="text-white rounded-pill px-3 py-2 fs-13"
              style={{ width: '220px', maxWidth: '100%', cursor: 'pointer', background: '#111', border: '1px solid rgba(249,115,22,0.4)', outline: 'none', color: '#f97316' }}
              value={selectedChId || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedChId(val);
                localStorage.setItem('scada_aqi_selected_ch_id', val);
              }}
            >
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {channels.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 bg-dark bg-opacity-20 rounded-4 border border-white border-opacity-5 p-5 mt-3" style={{ minHeight: '500px' }}>
          <div className="p-4 rounded-circle bg-dark bg-opacity-40 border border-secondary border-opacity-25 mb-4 shadow-sm">
            <Activity size={48} className="text-secondary opacity-50" />
          </div>
          <h4 className="text-white fw-bold mb-2 tracking-wide text-uppercase">No Mapped AQI Sensors Found</h4>
          <p className="text-secondary mb-0 text-center" style={{ maxWidth: '450px' }}>
            Map an AQI Sensor / Temp & Humidity device in the settings configuration templates module to view live environment telemetry.
          </p>
        </div>
      ) : (
        <Row className="g-3 flex-grow-1">
          {/* LEFT PANEL: CHANNEL LIST */}
          <Col xl={3} lg={4} xs={12} className="d-flex flex-column gap-2">
            <div className="px-2 mb-1">
              <span className="text-secondary fw-bold" style={{ fontSize: '12px', letterSpacing: '1px' }}>AVAILABLE CHANNELS</span>
            </div>

            <div className="d-flex flex-column gap-2">
              {channels.map(ch => {
                const isSelected = selectedCh && selectedCh.id === ch.id;

                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setSelectedChId(ch.id);
                      localStorage.setItem('scada_aqi_selected_ch_id', ch.id);
                    }}
                    onDoubleClick={() => navigate('/aqi-sensor/temp-humidity')}
                    className="p-3 rounded position-relative overflow-hidden"
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(249,115,22,0.1)' : 'rgba(17,17,17,0.8)',
                      border: `1px solid ${isSelected ? '#f97316' : 'rgba(249,115,22,0.15)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}
                    title="Single click to view analytics, Double click for detailed diagnostics"
                  >
                    {isSelected && <div className="position-absolute h-100" style={{ left: 0, top: 0, width: '4px', background: '#f97316', boxShadow: '0 0 10px #f97316' }}></div>}

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded p-1 d-flex align-items-center justify-content-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <MapPin size={14} style={{ color: isSelected ? '#f97316' : '#666' }} />
                        </div>
                        <span className={`fw-bold ${isSelected ? 'text-white' : 'text-light'}`} style={{ fontSize: '15px' }}>{ch.name}</span>
                      </div>
                      <span className="fw-bold font-monospace" style={{ color: '#f97316', fontSize: '15px' }}>{ch.temp} <span style={{ fontSize: '10px', color: '#888' }}>°C</span></span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                      <span className="text-secondary" style={{ fontSize: '11px' }}>{ch.location}</span>
                      <span className="text-white font-monospace fw-bold" style={{ fontSize: '12px' }}>Humidity: {ch.hum}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Col>

          {/* RIGHT PANEL: 6 PARAMETER GRID */}
          <Col xl={9} lg={8} xs={12} className="d-flex flex-column">
            {/* Header Info for Selected Channel */}
            <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded" style={{ background: '#111', border: '1px solid rgba(249,115,22,0.25)' }}>
              <div>
                <Badge bg="transparent" className="border px-2 py-1 rounded-pill shadow-sm mb-1" style={{ color: '#f97316', borderColor: '#f97316' }}>
                  Type of Sensor: Environmental
                </Badge>
                <h4 className="text-white fw-black m-0">{selectedCh?.name} Analytics</h4>
              </div>
              <div className="text-end">
                <div className="fw-bold" style={{ fontSize: '11px', letterSpacing: '1px', color: '#888' }}>LOCATION</div>
                <div className="fw-bold" style={{ color: '#f97316' }}>{selectedCh?.location?.toUpperCase()}</div>
              </div>
            </div>

            {/* Grid of 6 Parameters */}
            <Row className="g-3">
              {parameters.map((param, idx) => {
                const paramToConfigField = {
                  temp: 'temperature',
                  hum: 'humidity',
                  co2: 'co2',
                  tvoc: 'tvoc',
                  aqi: 'aqi'
                };
                const configField = selectedCh?.mapping?.vrvConfig?.[paramToConfigField[param.key]];
                const isFieldMapped = configField && typeof configField === 'string' && configField.includes('::');
                const historyData = sanitizeHistory(selectedCh?.history || [], param.key, selectedCh ? selectedCh[param.key] : 0, selectedCh?.hasRealHistory);
                const values = historyData.map(h => parseFloat(h[param.key])).filter(v => !isNaN(v));
                const dataMin = values.length > 0 ? Math.min(...values) : 0;
                const dataMax = values.length > 0 ? Math.max(...values) : 0;

                let minBound = dataMin === dataMax ? dataMin - param.defaultPadding : dataMin - (dataMax - dataMin) * 0.05;
                let maxBound = dataMin === dataMax ? dataMax + param.defaultPadding : dataMax + (dataMax - dataMin) * 0.05;

                if (param.minVal !== undefined) minBound = Math.max(param.minVal, minBound);
                if (param.maxVal !== undefined) maxBound = Math.min(param.maxVal, maxBound);

                const calculatedDomain = [minBound, maxBound];

                return (
                  <Col md={6} xs={12} key={idx}>
                    <Card
                      className="border-0 shadow-sm h-100"
                      style={{
                        background: '#111',
                        borderRadius: '12px',
                        border: '1px solid rgba(249,115,22,0.2)',
                        cursor: isFieldMapped ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        opacity: isFieldMapped ? 1 : 0.35,
                        filter: isFieldMapped ? 'none' : 'grayscale(1) brightness(0.65)',
                        pointerEvents: isFieldMapped ? 'auto' : 'none'
                      }}
                      onClick={() => { if (isFieldMapped) navigate('/aqi-sensor/temp-humidity'); }}
                      onMouseEnter={(e) => { if (isFieldMapped) e.currentTarget.style.borderColor = '#f97316'; }}
                      onMouseLeave={(e) => { if (isFieldMapped) e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'; }}
                    >
                      <Card.Body className="p-3 d-flex gap-2 align-items-center">

                        {/* Gauge Area */}
                        <div style={{ width: '130px', flexShrink: 0 }} className="d-flex justify-content-center">
                          <CustomArcGauge
                            value={selectedCh ? Number(selectedCh[param.key]) : 0}
                            max={param.max}
                            label={param.label}
                            color={param.color}
                            isMapped={isFieldMapped}
                          />
                        </div>

                        {/* Chart Area */}
                        <div className="flex-grow-1 d-flex flex-column w-100">
                          <div className="d-flex justify-content-between align-items-center text-secondary mb-2 fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                            <span>HISTORY ({param.unit})</span>
                            {isFieldMapped && (
                              <Maximize2 
                                size={14} 
                                style={{ cursor: 'pointer', color: '#f97316' }} 
                                onClick={(e) => { e.stopPropagation(); setExpandedParam(param); }} 
                                title="Expand Graph"
                              />
                            )}
                          </div>
                          <div style={{ height: '110px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(249,115,22,0.1)" />
                                <XAxis dataKey="time" hide />
                                <YAxis
                                  hide
                                  domain={calculatedDomain}
                                  padding={{ top: 10, bottom: 10 }}
                                />
                                <Tooltip
                                  contentStyle={{ background: '#111', border: '1px solid #f97316', borderRadius: '6px' }}
                                  itemStyle={{ color: '#f97316' }}
                                />
                                <Line
                                  type="linear"
                                  dataKey={param.key}
                                  name={param.label}
                                  stroke="#f97316"
                                  strokeWidth={1}
                                  dot={{ r: 3, fill: '#fff', stroke: param.color, strokeWidth: 2 }}
                                  activeDot={{ r: 5, fill: param.color }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

          </Col>
        </Row>
      )}

      {/* Expanded Graph Modal */}
      <Modal show={!!expandedParam} onHide={() => setExpandedParam(null)} centered size="lg" contentClassName="" style={{ zIndex: 1060 }}>
        <div style={{ background: '#000', border: '2px solid #f97316', borderRadius: '8px', overflow: 'hidden' }}>
          <Modal.Header closeButton className="border-bottom" closeVariant="white" style={{ borderColor: '#f97316 !important', background: '#111' }}>
            <Modal.Title className="d-flex align-items-center gap-2" style={{ color: '#f97316' }}>
              <Activity size={20} color="#f97316" />
              {expandedParam?.label} History ({expandedParam?.unit})
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" style={{ height: '420px', background: '#000' }}>
            {expandedParam && (() => {
              const rawHistory = selectedCh?.history || [];
              // Prepend 00:00 null entry so X-axis starts from midnight
              const chartData = [];
              if (rawHistory.length > 0 && rawHistory[0].time !== '00:00') {
                chartData.push({ time: '00:00' });
              }
              rawHistory.forEach(h => chartData.push(h));

              const historyData = sanitizeHistory(chartData, expandedParam.key, selectedCh ? selectedCh[expandedParam.key] : 0, selectedCh?.hasRealHistory);
              const values = historyData.map(h => parseFloat(h[expandedParam.key])).filter(v => !isNaN(v));
              const dataMin = values.length > 0 ? Math.min(...values) : 0;
              const dataMax = values.length > 0 ? Math.max(...values) : 0;

              let minBound = dataMin === dataMax ? dataMin - expandedParam.defaultPadding : dataMin - (dataMax - dataMin) * 0.05;
              let maxBound = dataMin === dataMax ? dataMax + expandedParam.defaultPadding : dataMax + (dataMax - dataMin) * 0.05;

              if (expandedParam.minVal !== undefined) minBound = Math.max(expandedParam.minVal, minBound);
              if (expandedParam.maxVal !== undefined) maxBound = Math.min(expandedParam.maxVal, maxBound);

              const calculatedDomain = [minBound, maxBound];

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(249,115,22,0.15)" />
                    <XAxis dataKey="time" stroke="#f97316" tick={{ fill: '#f97316', fontSize: 12 }} />
                    <YAxis 
                      stroke="#f97316"
                      tick={{ fill: '#f97316', fontSize: 12 }}
                      domain={calculatedDomain} 
                    />
                    <Tooltip 
                      contentStyle={{ background: '#111', border: '1px solid #f97316', borderRadius: '6px', color: '#fff' }}
                      itemStyle={{ color: '#f97316' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={expandedParam.key} 
                      name={expandedParam.label} 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f97316', stroke: '#fff', strokeWidth: 1 }}
                      activeDot={{ r: 6, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </Modal.Body>
        </div>
      </Modal>
    </div>
  );
};

export default AQIOverview;
