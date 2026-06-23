import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { FiX, FiEdit2, FiPlus, FiAlertCircle, FiZap, FiMail, FiChevronRight, FiLoader } from 'react-icons/fi';
import {
  getSochiotLocationData,
  getSochiotDeviceByNumericId,
  getSochiotEventFields
} from '../../services/authService';

/* ─────────────────────────────────────────────
   Cascading Location Picker
   (hierarchyData tree → pick location node)
───────────────────────────────────────────── */
const CascadingLocationPicker = ({ hierarchyData, value, onChange, isDark, textColor, subTextColor, borderColor }) => {
  const [open, setOpen] = useState(false);
  const [col0, setCol0] = useState(null);
  const [col1, setCol1] = useState(null);
  const [col2, setCol2] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (loc, zone, client, comp) => {
    const label = `${comp.name} > ${client.name} > ${zone.name} > ${loc.name}`;
    onChange({ label, locationId: loc.id, locationName: loc.name });
    setOpen(false);
  };

  const colS = { minWidth: '160px', maxHeight: '240px', overflowY: 'auto', borderRight: `1px solid ${borderColor}`, padding: '4px 0' };
  const itemS = (active) => ({
    padding: '8px 14px', cursor: 'pointer', fontSize: '13px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: active ? (isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)') : 'transparent',
    color: active ? '#6366f1' : textColor
  });

  const allLocations = (comp, client, zone) => {
    const direct = zone.locations || [];
    const fromSub = (zone.subZones || []).flatMap(sz => sz.locations || []);
    return [...direct, ...fromSub];
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: '10px 14px', border: `1px solid ${open ? '#6366f1' : borderColor}`,
        borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: textColor,
        background: isDark ? '#0f172a' : '#f8f9fa',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ color: value?.label ? textColor : subTextColor }}>{value?.label || 'Select Location...'}</span>
        <span style={{ color: subTextColor, fontSize: '10px' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 9999, marginTop: '4px',
          background: isDark ? '#1e293b' : '#fff', border: `1px solid ${borderColor}`,
          borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', display: 'flex', minWidth: '640px'
        }}>
          {/* Col 0: Companies */}
          <div style={colS}>
            {hierarchyData.map(comp => (
              <div key={comp.id} style={itemS(col0?.id === comp.id)}
                onMouseEnter={() => { setCol0(comp); setCol1(null); setCol2(null); }}>
                {comp.name} <FiChevronRight size={12} />
              </div>
            ))}
          </div>
          {/* Col 1: Clients */}
          {col0 && (
            <div style={colS}>
              {(col0.clients || []).map(cli => (
                <div key={cli.id} style={itemS(col1?.id === cli.id)}
                  onMouseEnter={() => { setCol1(cli); setCol2(null); }}>
                  {cli.name} <FiChevronRight size={12} />
                </div>
              ))}
            </div>
          )}
          {/* Col 2: Zones */}
          {col1 && (
            <div style={colS}>
              {(col1.zones || []).map(z => (
                <div key={z.id} style={itemS(col2?.id === z.id)}
                  onMouseEnter={() => setCol2(z)}>
                  {z.name} <FiChevronRight size={12} />
                </div>
              ))}
            </div>
          )}
          {/* Col 3: Locations */}
          {col2 && (
            <div style={{ ...colS, borderRight: 'none' }}>
              {allLocations(col0, col1, col2).map(loc => (
                <div key={loc.id} style={itemS(value?.locationId === loc.id)}
                  onClick={() => select(loc, col2, col1, col0)}>
                  {loc.name}
                </div>
              ))}
              {allLocations(col0, col1, col2).length === 0 && (
                <div style={{ padding: '12px', color: subTextColor, fontSize: '12px' }}>No locations</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Helper: findLocationPath
   Traverses hierarchyData to find location by ID
   and returns the path of nodes.
───────────────────────────────────────────── */
const findLocationPath = (id, nodes, path = []) => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.locations) {
      const found = node.locations.find(l => String(l.id) === String(id));
      if (found) {
        return [...path, node, found];
      }
    }
    if (node.clients) {
      const res = findLocationPath(id, node.clients, [...path, node]);
      if (res) return res;
    }
    if (node.zones) {
      const res = findLocationPath(id, node.zones, [...path, node]);
      if (res) return res;
    }
    if (node.subZones) {
      const res = findLocationPath(id, node.subZones, [...path, node]);
      if (res) return res;
    }
  }
  return null;
};

/* ─────────────────────────────────────────────
   Helper: cleanDeviceName
   Strips raw internal format like "CLUSTER@374@UUID" or "DEVICE@1227@UUID"
   Auto-scans all string fields in obj to find a human-readable name.
   Expected output: "M022N3N0MN177" (gateway) / "MFM_177" (device)
───────────────────────────────────────────── */
const cleanDeviceName = (rawName, obj) => {
  if (!obj) return rawName || '';

  // Priority fields to check first (most likely to hold clean name)
  const priorityFields = [
    'serialNo', 'clusterSerialNo', 'gatewaySerialNo', 'deviceSerialNo',
    'shortName', 'alias', 'displayName', 'description', 'label',
    'macAddress', 'deviceName', 'gatewayName', 'clusterName'
  ];

  // Helper: is this string a "clean" human-readable name?
  const isClean = (s) => {
    if (!s || typeof s !== 'string') return false;
    const t = s.trim();
    if (!t) return false;
    if (t.includes('@')) return false; // internal format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false; // UUID
    if (/^\d+$/.test(t)) return false; // pure number
    return true;
  };

  // 1. Check priority fields
  for (const field of priorityFields) {
    if (isClean(obj[field])) return obj[field].trim();
  }

  // 2. Auto-scan ALL string fields (excluding known internal ones)
  const skip = new Set(['name', 'id', 'uuid', 'parentId', 'token', 'status', 'type', 'createdAt', 'updatedAt', 'dateCreated', 'lastUpdated']);
  for (const [key, val] of Object.entries(obj)) {
    if (skip.has(key)) continue;
    if (isClean(val)) return val.trim();
  }

  // 3. Fallback: strip "CLUSTER@374@UUID" → return numeric ID part
  if (rawName && rawName.includes('@')) {
    const parts = rawName.split('@');
    const numeric = parts.find((p, i) => i > 0 && /^\d+$/.test(p));
    return numeric || parts[parts.length - 1] || rawName;
  }

  return rawName || '';
};

/* ─────────────────────────────────────────────
   Edit Condition Modal
   Flow: Location → API(LOCATION/{id}) → Devices
         Device   → API(device/{numericId}) → Modules
         Module   → EventFields from device data
───────────────────────────────────────────── */
const EditConditionModal = ({
  condition, onClose, onSave,
  hierarchyData, isDark, textColor, subTextColor, borderColor
}) => {
  /* ── form fields ── */
  const [form, setForm] = useState({
    name: condition?.name || '',
    thresholdValue: condition?.thresholdValue || '',
    debounceTime: condition?.debounceTime || '',
    description: condition?.description || '',
    conditionType: condition?.conditionType?.name || 'IS_GREATER_THAN',
    eventFieldId: condition?.eventField?.id || '',
    moduleId: condition?.moduleId || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [useDevice, setUseDevice] = useState(true); // Module Group vs Device toggle

  /* ── location ── */
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [locationDevices, setLocationDevices] = useState([]); // [{id, uuid, name, gatewayName, label}]
  const [selectedDeviceId, setSelectedDeviceId] = useState(''); // numeric id string

  /* ── device → modules ── */
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [deviceModules, setDeviceModules] = useState([]); // [{id, name, eventFields:[]}]

  /* ── module → event fields ── */
  const [eventFields, setEventFields] = useState(
    condition?.eventField ? [condition.eventField] : []
  );

  /* ─── Waterfall cascade initialization for existing condition ─── */
  useEffect(() => {
    const initCascades = async () => {
      if (!condition?.locationId || !hierarchyData || hierarchyData.length === 0) return;

      const path = findLocationPath(condition.locationId, hierarchyData);
      if (path) {
        const locNode = path[path.length - 1];
        const locObj = {
          label: path.map(x => x.name).join(' > '),
          locationId: locNode.id,
          locationName: locNode.name
        };
        setSelectedLocation(locObj);

        setIsLoadingDevices(true);
        try {
          const data = await getSochiotLocationData(locNode.id);
          const locVOS = data?.locationVOS || [];
          const locNodeData = locVOS[0] || data;
          const gateways = locNodeData?.gatewayVOList || data?.gatewayVOList || [];
          // 🔍 Debug: inspect first gateway structure
          if (gateways.length > 0) {
            console.log('[DeviceDebug] Gateway object:', JSON.stringify(gateways[0], null, 2));
          }
          const devices = [];
          gateways.forEach(gw => {
            (gw.deviceEntityVOS || gw.deviceVOS || []).forEach(d => {
              devices.push({
                id: d.id,
                uuid: d.uuid,
                name: d.name,
                gatewayName: gw.name,
                label: `${cleanDeviceName(gw.name, gw)} / ${cleanDeviceName(d.name, d)}`
              });
            });
          });
          setLocationDevices(devices);

          const matchingDevice = devices.find(d => 
            String(d.uuid) === String(condition.deviceId) || 
            String(d.id) === String(condition.deviceId)
          );

          if (matchingDevice) {
            setSelectedDeviceId(matchingDevice.id);

            setIsLoadingModules(true);
            try {
              const deviceData = await getSochiotDeviceByNumericId(matchingDevice.id);
              // 🔍 Debug: see all fields in device detail API response
              console.log('[DeviceDebug] deviceData:', JSON.stringify(deviceData, null, 2));

              // ✅ Use rich deviceData fields to build a clean label
              const cleanDeviceLabel = cleanDeviceName(matchingDevice.name, deviceData) || cleanDeviceName(matchingDevice.name, {});
              const gatewayObj = gateways.find(g => (g.deviceEntityVOS || g.deviceVOS || []).some(d => String(d.id) === String(matchingDevice.id)));
              // Try to get clean gateway name from deviceData (may have clusterName, gatewayName etc.)
              const cleanGwLabel = cleanDeviceName(matchingDevice.gatewayName, deviceData) || cleanDeviceName(matchingDevice.gatewayName, gatewayObj || {});
              
              // Update the label in locationDevices if we got a better name
              if (cleanDeviceLabel || cleanGwLabel) {
                const newLabel = `${cleanGwLabel || matchingDevice.gatewayName} / ${cleanDeviceLabel || matchingDevice.name}`;
                setLocationDevices(prev => prev.map(d =>
                  d.id === matchingDevice.id ? { ...d, label: newLabel } : d
                ));
              }

              const mods = deviceData?.moduleEntityVOS
                || deviceData?.moduleVOS
                || deviceData?.modules
                || [];
              setDeviceModules(mods);

              const matchingModule = mods.find(m => String(m.id) === String(condition.moduleId));
              if (matchingModule) {
                const localFields = matchingModule?.eventFields || matchingModule?.eventFieldVOS || matchingModule?.fieldEntityVOS || [];
                if (localFields.length > 0) {
                  setEventFields(localFields);
                } else {
                  const moduleTypeId = matchingModule?.moduleTypeId || matchingModule?.moduleType?.id;
                  const fields = await getSochiotEventFields(condition.moduleId, moduleTypeId);
                  if (fields.length > 0) {
                    setEventFields(fields);
                  } else if (condition?.eventField) {
                    setEventFields([condition.eventField]);
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching device modules in cascade init:', err);
            } finally {
              setIsLoadingModules(false);
            }
          }
        } catch (err) {
          console.error('Error fetching location devices in cascade init:', err);
        } finally {
          setIsLoadingDevices(false);
        }
      }
    };

    initCascades();
  }, [condition, hierarchyData]);

  /* ─── When location selected → fetch location entity → extract devices ─── */
  const handleLocationSelect = async (locObj) => {
    setSelectedLocation(locObj);
    setSelectedDeviceId('');
    setLocationDevices([]);
    setDeviceModules([]);
    setEventFields([]);
    set('moduleId', '');
    set('eventFieldId', '');

    if (!locObj?.locationId) return;
    setIsLoadingDevices(true);
    try {
      const data = await getSochiotLocationData(locObj.locationId);
      const locVOS = data?.locationVOS || [];
      const locNode = locVOS[0] || data;
      const gateways = locNode?.gatewayVOList || data?.gatewayVOList || [];

      const devices = [];
      gateways.forEach(gw => {
        (gw.deviceEntityVOS || gw.deviceVOS || []).forEach(d => {
          devices.push({
            id: d.id,
            uuid: d.uuid,
            name: d.name,
            gatewayName: gw.name,
            label: `${cleanDeviceName(gw.name, gw)} / ${cleanDeviceName(d.name, d)}`
          });
        });
      });
      setLocationDevices(devices);
    } catch (e) {
      console.error('Location fetch error:', e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  /* ─── When device selected → GET /config-engine/device/{numericId} → modules ─── */
  const handleDeviceSelect = async (numericId) => {
    setSelectedDeviceId(numericId);
    setDeviceModules([]);
    setEventFields([]);
    set('moduleId', '');
    set('eventFieldId', '');

    if (!numericId) return;
    setIsLoadingModules(true);
    try {
      const deviceData = await getSochiotDeviceByNumericId(numericId);
      const mods = deviceData?.moduleEntityVOS
        || deviceData?.moduleVOS
        || deviceData?.modules
        || [];
      setDeviceModules(mods);
    } catch (e) {
      console.error('Device fetch error:', e);
    } finally {
      setIsLoadingModules(false);
    }
  };

  /* ─── When module selected → show event fields from module data ─── */
  const handleModuleSelect = async (moduleId) => {
    set('moduleId', moduleId);
    set('eventFieldId', '');
    setEventFields([]);

    if (!moduleId) return;

    const mod = deviceModules.find(m => String(m.id) === String(moduleId));
    const localFields = mod?.eventFields || mod?.eventFieldVOS || mod?.fieldEntityVOS || [];

    if (localFields.length > 0) {
      setEventFields(localFields);
    } else {
      try {
        const moduleTypeId = mod?.moduleTypeId || mod?.moduleType?.id;
        const fields = await getSochiotEventFields(moduleId, moduleTypeId);
        if (fields.length > 0) {
          setEventFields(fields);
        } else if (condition?.eventField) {
          setEventFields([condition.eventField]);
        }
      } catch (e) {
        if (condition?.eventField) setEventFields([condition.eventField]);
      }
    }
  };

  /* ─── Form submit handler ─── */
  const handleUpdate = () => {
    const selectedDevObj = locationDevices.find(d => String(d.id) === String(selectedDeviceId));
    const selectedModObj = deviceModules.find(m => String(m.id) === String(form.moduleId));
    const selectedFieldObj = eventFields.find(ef => String(ef.id) === String(form.eventFieldId));

    const conditionTypes = {
      'IS_GREATER_THAN': 'Is Greater Than',
      'IS_LESS_THAN': 'Is Less Than',
      'IS_EQUAL_TO': 'Is Equal To',
      'IS_NOT_EQUAL_TO': 'Is Not Equal To',
      'IS_GREATER_THAN_OR_EQUAL_TO': 'Is Greater Than Or Equal To',
      'IS_LESS_THAN_OR_EQUAL_TO': 'Is Less Than Or Equal To'
    };

    const updated = {
      ...condition,
      name: form.name,
      thresholdValue: form.thresholdValue,
      debounceTime: form.debounceTime ? Number(form.debounceTime) : null,
      description: form.description,
      conditionType: {
        name: form.conditionType,
        displayName: conditionTypes[form.conditionType] || form.conditionType
      },
      locationId: selectedLocation?.locationId || condition?.locationId,
      deviceId: selectedDevObj?.uuid || condition?.deviceId,
      moduleId: form.moduleId ? Number(form.moduleId) : condition?.moduleId,
      eventField: selectedFieldObj ? {
        ...selectedFieldObj,
        moduleTypeName: selectedFieldObj.moduleTypeName || selectedModObj?.name || selectedModObj?.moduleTypeName || ''
      } : condition?.eventField
    };

    onSave(updated);
  };

  /* ─── Styles ─── */
  const inp = {
    backgroundColor: isDark ? '#0f172a' : '#f8f9fa',
    color: textColor, border: `1px solid ${borderColor}`,
    borderRadius: '8px', padding: '10px 12px', width: '100%',
    fontSize: '13px', outline: 'none'
  };
  const sel = { ...inp, cursor: 'pointer', appearance: 'auto' };
  const lbl = { fontSize: '12px', fontWeight: '600', color: subTextColor, marginBottom: '5px', display: 'block' };

  const LoadingBadge = ({ text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: '8px', background: isDark ? '#0f172a' : '#f8f9fa', fontSize: '13px', color: subTextColor }}>
      <Spinner size="sm" animation="border" style={{ width: '14px', height: '14px' }} /> {text}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
      <div style={{
        background: isDark ? '#1e293b' : '#fff', borderRadius: '14px',
        width: '620px', maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)', padding: '28px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h5 style={{ margin: 0, fontWeight: '700', color: textColor }}>Edit Condition</h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer' }}><FiX size={20} /></button>
        </div>

        {/* Toggle: Module Group / Device */}
        <div style={{ marginBottom: '20px' }}>
          <label style={lbl}>Create Module Group on <span style={{ color: 'red' }}>*</span></label>
          <div style={{ display: 'inline-flex', border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
            {['Module Group', 'Device'].map(opt => {
              const active = useDevice === (opt === 'Device');
              return (
                <button key={opt} onClick={() => setUseDevice(opt === 'Device')} style={{
                  padding: '8px 22px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  background: active ? '#4f46e5' : (isDark ? '#0f172a' : '#f1f5f9'),
                  color: active ? '#fff' : textColor
                }}>{opt}</button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1: Location ── */}
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>
            Location <span style={{ color: 'red' }}>*</span>
            {isLoadingDevices && <Spinner size="sm" animation="border" className="ms-2" style={{ width: '12px', height: '12px' }} />}
          </label>
          <CascadingLocationPicker
            hierarchyData={hierarchyData}
            value={selectedLocation}
            onChange={handleLocationSelect}
            isDark={isDark} textColor={textColor} subTextColor={subTextColor} borderColor={borderColor}
          />
          {selectedLocation && locationDevices.length === 0 && !isLoadingDevices && (
            <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>⚠ No devices found at this location.</div>
          )}
        </div>

        {/* ── STEP 2: Device dropdown ── */}
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Device <span style={{ color: 'red' }}>*</span></label>
          {isLoadingDevices ? (
            <LoadingBadge text="Loading devices..." />
          ) : (
            <select style={sel} value={selectedDeviceId}
              onChange={e => handleDeviceSelect(e.target.value)}
              disabled={locationDevices.length === 0}>
              <option value="">
                {locationDevices.length === 0 ? '-- Select location first --' : '-- Select Device --'}
              </option>
              {locationDevices.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Name + Module ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={lbl}>Name <span style={{ color: 'red' }}>*</span></label>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Condition name" />
          </div>
          <div>
            <label style={lbl}>Module <span style={{ color: 'red' }}>*</span></label>
            {isLoadingModules ? (
              <LoadingBadge text="Loading modules..." />
            ) : (
              <select style={sel} value={form.moduleId}
                onChange={e => handleModuleSelect(e.target.value)}
                disabled={deviceModules.length === 0}>
                <option value="">
                  {deviceModules.length === 0 ? '-- Select device first --' : '-- Select Module --'}
                </option>
                {deviceModules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.moduleTypeName || m.displayName || `Module ${m.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── Event Field + Condition ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={lbl}>Event Field <span style={{ color: 'red' }}>*</span></label>
            <select style={sel} value={form.eventFieldId}
              onChange={e => set('eventFieldId', e.target.value)}
              disabled={eventFields.length === 0}>
              <option value="">
                {eventFields.length === 0 ? '-- Select module first --' : '-- Select Event Field --'}
              </option>
              {eventFields.map(ef => (
                <option key={ef.id} value={ef.id}>
                  {ef.displayName || ef.fieldName || `Field ${ef.id}`}
                </option>
              ))}
            </select>
            {condition?.eventField && eventFields.length === 0 && (
              <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                Current: <span style={{ color: '#06b6d4' }}>{condition.eventField.displayName}</span>
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Condition <span style={{ color: 'red' }}>*</span></label>
            <select style={sel} value={form.conditionType} onChange={e => set('conditionType', e.target.value)}>
              {[
                ['IS_GREATER_THAN', 'Is Greater Than'],
                ['IS_LESS_THAN', 'Is Less Than'],
                ['IS_EQUAL_TO', 'Is Equal To'],
                ['IS_NOT_EQUAL_TO', 'Is Not Equal To'],
                ['IS_GREATER_THAN_OR_EQUAL_TO', 'Is Greater Than Or Equal To'],
                ['IS_LESS_THAN_OR_EQUAL_TO', 'Is Less Than Or Equal To'],
              ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* ── Threshold + Debounce ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={lbl}>Threshold Value <span style={{ color: 'red' }}>*</span></label>
            <input style={inp} value={form.thresholdValue} onChange={e => set('thresholdValue', e.target.value)} placeholder="e.g. 400" />
          </div>
          <div>
            <label style={lbl}>Debounce Time</label>
            <input style={inp} value={form.debounceTime} onChange={e => set('debounceTime', e.target.value)} placeholder="e.g. 10" />
            <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>Time in seconds</div>
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ marginBottom: '24px' }}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }}
            value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. HIGH" />
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={handleUpdate}
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', borderRadius: '8px', fontWeight: '600', padding: '10px 28px' }}>
            Update
          </Button>
          <Button variant="outline-secondary" onClick={onClose} style={{ borderRadius: '8px', fontWeight: '600', padding: '10px 20px' }}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Edit Consequence Modal
───────────────────────────────────────────── */
const EditConsequenceModal = ({
  consequence, onClose, onSave,
  hierarchyData, isDark, textColor, subTextColor, borderColor
}) => {
  const [form, setForm] = useState({
    name: consequence?.name || '',
    cmdField: consequence?.cmdField || '',
    cmdArg: consequence?.cmdArg || '',
    argValue: consequence?.argValue ?? '',
    description: consequence?.description || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [locationDevices, setLocationDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  /* ─── Waterfall cascade initialization for existing consequence ─── */
  useEffect(() => {
    const initCascades = async () => {
      if (!consequence?.locationId || !hierarchyData || hierarchyData.length === 0) return;

      const path = findLocationPath(consequence.locationId, hierarchyData);
      if (path) {
        const locNode = path[path.length - 1];
        const locObj = {
          label: path.map(x => x.name).join(' > '),
          locationId: locNode.id,
          locationName: locNode.name
        };
        setSelectedLocation(locObj);

        setIsLoadingDevices(true);
        try {
          const data = await getSochiotLocationData(locNode.id);
          const locVOS = data?.locationVOS || [];
          const locNodeData = locVOS[0] || data;
          const gateways = locNodeData?.gatewayVOList || data?.gatewayVOList || [];
          const devices = [];
          gateways.forEach(gw => {
            (gw.deviceEntityVOS || gw.deviceVOS || []).forEach(d => {
              devices.push({
                id: d.id,
                uuid: d.uuid,
                name: d.name,
                gatewayName: gw.name,
                label: `${cleanDeviceName(gw.name, gw)} / ${cleanDeviceName(d.name, d)}`
              });
            });
          });
          setLocationDevices(devices);

          const matchingDevice = devices.find(d => 
            String(d.uuid) === String(consequence.deviceId) || 
            String(d.id) === String(consequence.deviceId)
          );

          if (matchingDevice) {
            setSelectedDeviceId(matchingDevice.id);
          }
        } catch (err) {
          console.error('Error fetching location devices for consequence cascade:', err);
        } finally {
          setIsLoadingDevices(false);
        }
      }
    };

    initCascades();
  }, [consequence, hierarchyData]);

  const handleLocationSelect = async (locObj) => {
    setSelectedLocation(locObj);
    setSelectedDeviceId('');
    setLocationDevices([]);
    if (!locObj?.locationId) return;
    setIsLoadingDevices(true);
    try {
      const data = await getSochiotLocationData(locObj.locationId);
      const locNode = data?.locationVOS?.[0] || data;
      const gateways = locNode?.gatewayVOList || data?.gatewayVOList || [];
      const devices = [];
      gateways.forEach(gw => {
        (gw.deviceEntityVOS || gw.deviceVOS || []).forEach(d => {
          devices.push({ id: d.id, uuid: d.uuid, name: d.name, gatewayName: gw.name, label: `${cleanDeviceName(gw.name, gw)} / ${cleanDeviceName(d.name, d)}` });
        });
      });
      setLocationDevices(devices);
    } catch (e) { console.error('Location fetch error:', e); }
    finally { setIsLoadingDevices(false); }
  };

  const handleUpdate = () => {
    const selectedDevObj = locationDevices.find(d => String(d.id) === String(selectedDeviceId));
    const updated = {
      ...consequence,
      ...form,
      locationId: selectedLocation?.locationId || consequence?.locationId,
      deviceId: selectedDevObj?.uuid || consequence?.deviceId,
      moduleTypeName: selectedDevObj?.name || consequence?.moduleTypeName || ''
    };
    onSave(updated);
  };

  const inp = {
    backgroundColor: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
    border: `1px solid ${borderColor}`, borderRadius: '8px',
    padding: '10px 12px', width: '100%', fontSize: '13px', outline: 'none'
  };
  const sel = { ...inp, cursor: 'pointer', appearance: 'auto' };
  const lbl = { fontSize: '12px', fontWeight: '600', color: subTextColor, marginBottom: '5px', display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ background: isDark ? '#1e293b' : '#fff', borderRadius: '14px', width: '620px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.45)', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <h5 style={{ margin: 0, fontWeight: '700', color: textColor }}>Edit Consequence</h5>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer' }}><FiX size={20} /></button>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Location <span style={{ color: 'red' }}>*</span></label>
          <CascadingLocationPicker hierarchyData={hierarchyData} value={selectedLocation} onChange={handleLocationSelect}
            isDark={isDark} textColor={textColor} subTextColor={subTextColor} borderColor={borderColor} />
        </div>

        {/* Device */}
        <div style={{ marginBottom: '16px' }}>
          <label style={lbl}>Device <span style={{ color: 'red' }}>*</span></label>
          {isLoadingDevices ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: '8px', background: isDark ? '#0f172a' : '#f8f9fa', fontSize: '13px', color: subTextColor }}>
              <Spinner size="sm" animation="border" style={{ width: '14px', height: '14px' }} /> Loading devices...
            </div>
          ) : (
            <select style={sel} value={selectedDeviceId} onChange={e => setSelectedDeviceId(e.target.value)} disabled={locationDevices.length === 0}>
              <option value="">{locationDevices.length === 0 ? '-- Select location first --' : '-- Select Device --'}</option>
              {locationDevices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
        </div>

        {/* Name + Cmd Field */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div><label style={lbl}>Name <span style={{ color: 'red' }}>*</span></label><input style={inp} value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label style={lbl}>Command Field <span style={{ color: 'red' }}>*</span></label><input style={inp} value={form.cmdField} onChange={e => set('cmdField', e.target.value)} /></div>
        </div>

        {/* Cmd Arg + Arg Value */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div><label style={lbl}>Command Arg</label><input style={inp} value={form.cmdArg} onChange={e => set('cmdArg', e.target.value)} /></div>
          <div><label style={lbl}>Argument Value</label><input style={inp} value={form.argValue} onChange={e => set('argValue', e.target.value)} /></div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '24px' }}>
          <label style={lbl}>Description</label>
          <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={handleUpdate}
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', borderRadius: '8px', fontWeight: '600', padding: '10px 28px' }}>Update</Button>
          <Button variant="outline-secondary" onClick={onClose} style={{ borderRadius: '8px', fontWeight: '600', padding: '10px 20px' }}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Rule Edit Modal
───────────────────────────────────────────── */
const RuleEditModal = ({ rule, onClose, onSaved, hierarchyData, isDark }) => {
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const [ruleName, setRuleName] = useState(rule?.name || '');
  const [conditions, setConditions] = useState(rule?.conditions || []);
  const [consequences, setConsequences] = useState(rule?.consequences || []);
  const [editingCondition, setEditingCondition] = useState(null);
  const [editingConsequence, setEditingConsequence] = useState(null);
  const [isActive, setIsActive] = useState(rule?.active || false);
  const [isSaving, setIsSaving] = useState(false);

  const sectionTitle = (label, color, icon) => (
    <div style={{ fontSize: '14px', fontWeight: '700', color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {icon} {label}
    </div>
  );

  const cardSt = (ac) => ({
    padding: '14px 16px', borderRadius: '10px',
    border: `1px solid ${ac}22`,
    background: isDark ? `${ac}0a` : `${ac}06`,
    marginBottom: '10px', position: 'relative'
  });

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await onSaved?.({ ...rule, name: ruleName, conditions, consequences, active: isActive });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000 }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '940px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto',
        background: isDark ? '#1e293b' : '#fff', borderRadius: '16px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)', zIndex: 2001, padding: '32px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase' }}>Edit Rule</div>
            <h4 style={{ margin: '4px 0 0', fontWeight: '700', color: textColor }}>#{rule?.id} · {rule?.name}</h4>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', padding: '8px' }}>
            <FiX size={22} />
          </button>
        </div>

        {/* Name + Push notif */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: '28px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: subTextColor, marginBottom: '5px', display: 'block' }}>
              Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input value={ruleName} onChange={e => setRuleName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${borderColor}`, borderRadius: '8px', background: isDark ? '#0f172a' : '#f8f9fa', color: textColor, outline: 'none' }} />
          </div>
          <Button variant="outline-primary" style={{ borderRadius: '8px', whiteSpace: 'nowrap', padding: '10px 18px' }}>
            🔔 Configure Push notifications
          </Button>
        </div>

        {/* Conditions | Consequences */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

          {/* Conditions */}
          <div>
            {sectionTitle(`Conditions (${conditions.length})`, '#06b6d4', <FiAlertCircle size={15} />)}
            {conditions.map((c, i) => (
              <React.Fragment key={c.id}>
                <div style={cardSt('#06b6d4')}>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                    <button onClick={() => setEditingCondition(c)} style={{ background: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#06b6d4' }}>
                      <FiEdit2 size={12} />
                    </button>
                    <button onClick={() => setConditions(prev => prev.filter(x => x.id !== c.id))} style={{ background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#ef4444' }}>
                      <FiX size={12} />
                    </button>
                  </div>
                  <div style={{ fontWeight: '600', color: textColor, marginBottom: '10px', fontSize: '13px' }}>{i + 1}. {c.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      ['Module', c.eventField?.moduleTypeName?.substring(0, 18), textColor],
                      ['Event Field', c.eventField?.displayName, '#06b6d4'],
                      ['Condition', c.conditionType?.displayName, '#f59e0b'],
                      ['Value', c.thresholdValue, textColor],
                      ['Debounce', c.debounceTime ? `${c.debounceTime}s` : '-', textColor],
                      ['Description', c.description, textColor],
                    ].map(([k, v, col]) => (
                      <div key={k}>
                        <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>{k}</div>
                        <div style={{ fontSize: '12px', color: col, fontWeight: '500' }}>{v || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* AND/OR toggle between conditions */}
                {i < conditions.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
                    <div style={{
                      display: 'inline-flex', border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden'
                    }}>
                      {['AND', 'OR'].map(op => {
                        // The operator belongs to the NEXT condition (first condition is always NONE)
                        const nextCondition = conditions[i + 1];
                        const current = (nextCondition?.logicalOperatorType && nextCondition.logicalOperatorType !== 'NONE') ? nextCondition.logicalOperatorType : 'AND';
                        const active = current === op;
                        return (
                          <button key={op} onClick={() => {
                            setConditions(prev => prev.map((cc, ci) =>
                              ci === i + 1 ? { ...cc, logicalOperatorType: op } : cc
                            ));
                          }} style={{
                            padding: '6px 20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                            background: active ? '#4f46e5' : (isDark ? '#0f172a' : '#f1f5f9'),
                            color: active ? '#fff' : subTextColor,
                            transition: 'all 0.2s ease'
                          }}>
                            {op}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
            <button onClick={() => setEditingCondition({ id: `new_${Date.now()}`, name: '', thresholdValue: '', debounceTime: '', description: '', conditionType: { name: 'IS_GREATER_THAN', displayName: 'Is Greater Than' }, logicalOperatorType: 'AND' })}
              style={{ width: '100%', padding: '10px', border: `2px dashed ${borderColor}`, borderRadius: '10px', background: 'transparent', color: '#06b6d4', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              <FiPlus size={14} /> Add Condition
            </button>
          </div>

          {/* Consequences */}
          <div>
            {sectionTitle(`Consequences (${consequences.length})`, '#f59e0b', <FiZap size={15} />)}
            {consequences.map((c, i) => (
              <div key={c.id} style={cardSt('#f59e0b')}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                  <button onClick={() => setEditingConsequence(c)} style={{ background: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#f59e0b' }}>
                    <FiEdit2 size={12} />
                  </button>
                  <button onClick={() => setConsequences(prev => prev.filter(x => x.id !== c.id))} style={{ background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#ef4444' }}>
                    <FiX size={12} />
                  </button>
                </div>
                <div style={{ fontWeight: '600', color: textColor, marginBottom: '10px', fontSize: '13px' }}>{i + 1}. {c.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    ['Cmd Field', c.cmdField, textColor],
                    ['Module', c.moduleTypeName, '#f59e0b'],
                    ['Cmd Arg', c.cmdArg, textColor],
                    ['Arg Value', String(c.argValue ?? '-'), textColor],
                    ['Description', c.description, textColor],
                  ].map(([k, v, col]) => (
                    <div key={k}>
                      <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: '12px', color: col, fontWeight: '500' }}>{v || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setEditingConsequence({ id: `new_${Date.now()}`, name: '', cmdField: '', cmdArg: '', argValue: '', description: '' })}
              style={{ width: '100%', padding: '10px', border: `2px dashed ${borderColor}`, borderRadius: '10px', background: 'transparent', color: '#f59e0b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              <FiPlus size={14} /> Add Consequence
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '20px' }}>
          <Button onClick={handleUpdate} disabled={isSaving}
            style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', borderRadius: '8px', fontWeight: '700', padding: '10px 32px' }}>
            {isSaving ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : 'Update'}
          </Button>
          <Button variant="outline-secondary" onClick={onClose} style={{ borderRadius: '8px', fontWeight: '600', padding: '10px 20px' }}>
            Cancel
          </Button>
          <div style={{ marginLeft: 'auto' }}>
            <Form.Check type="switch" id="edit-rule-active"
              label={<span style={{ fontSize: '13px', fontWeight: '600', color: textColor }}>Active</span>}
              checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          </div>
        </div>
      </div>

      {/* Edit Condition Sub-Modal */}
      {editingCondition && (
        <EditConditionModal
          condition={editingCondition}
          onClose={() => setEditingCondition(null)}
          onSave={(updated) => {
            if (String(updated.id).startsWith('new_')) {
              setConditions(prev => [...prev, { ...updated, id: Date.now() }]);
            } else {
              setConditions(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            }
            setEditingCondition(null);
          }}
          hierarchyData={hierarchyData}
          isDark={isDark} textColor={textColor} subTextColor={subTextColor} borderColor={borderColor}
        />
      )}

      {/* Edit Consequence Sub-Modal */}
      {editingConsequence && (
        <EditConsequenceModal
          consequence={editingConsequence}
          onClose={() => setEditingConsequence(null)}
          onSave={(updated) => {
            if (String(updated.id).startsWith('new_')) {
              setConsequences(prev => [...prev, { ...updated, id: Date.now() }]);
            } else {
              setConsequences(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            }
            setEditingConsequence(null);
          }}
          hierarchyData={hierarchyData}
          isDark={isDark} textColor={textColor} subTextColor={subTextColor} borderColor={borderColor}
        />
      )}
    </>
  );
};

export default RuleEditModal;
