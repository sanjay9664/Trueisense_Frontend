import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Form, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FileText, Download, FileSpreadsheet, Leaf, CheckCircle2, AlertCircle, Activity, BarChart3, Clock, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDeviceStatus } from '../../services/DeviceStatusContext';

const PARAMETERS = [
  { key: 'temp', label: 'Temperature (°C)', defaultKey: 'temperature' },
  { key: 'hum', label: 'Humidity (%)', defaultKey: 'humidity' },
  { key: 'co2', label: 'CO2 (PPM)', defaultKey: 'co2' },
  { key: 'tvoc', label: 'TVOC (PPM)', defaultKey: 'tvoc' },
  { key: 'aqi', label: 'AQI (Index)', defaultKey: 'aqi' }
];

const API_BASE_URL = import.meta.env.VITE_BACKEND_BMS_URL || 'http://localhost:3002/api/v1';

const AQIPDFReport = () => {
  const { getOverallStatus } = useDeviceStatus();
  const [templates, setTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scada_templates') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [devices, setDevices] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`scada_devices_${siteId}`) || '[]');
    } catch (e) {
      return [];
    }
  });
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [interval, setIntervalVal] = useState('HOURLY');
  const [errorMsg, setErrorMsg] = useState(null);

  const siteId = useMemo(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      return userData?.siteId || localStorage.getItem('selectedSiteId') || '1';
    } catch (e) {
      return localStorage.getItem('selectedSiteId') || '1';
    }
  }, []);

  // Fetch dynamic devices in background
  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true);
      setErrorMsg(null);
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/sites/${siteId}/devices`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch devices: ${res.statusText}`);
        }
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setDevices(result.data);
          localStorage.setItem(`scada_devices_${siteId}`, JSON.stringify(result.data));
        } else {
          setDevices([]);
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
        setErrorMsg('Failed to fetch devices. Using cached templates.');
        
        // Fallback: templates cache
        const saved = localStorage.getItem('scada_templates');
        if (saved) {
          try {
            setTemplates(JSON.parse(saved));
          } catch (e) {}
        }
      } finally {
        setLoadingDevices(false);
      }
    };

    fetchDevices();
  }, [siteId]);

  // Load templates on mount as fallback from local storage
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Natural sort helper
  const naturalSort = (a, b) => {
    const partsA = String(a).split(/(\d+)/);
    const partsB = String(b).split(/(\d+)/);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      if (partsA[i] === undefined) return -1;
      if (partsB[i] === undefined) return 1;
      const nA = parseInt(partsA[i], 10);
      const nB = parseInt(partsB[i], 10);
      if (!isNaN(nA) && !isNaN(nB) && nA !== nB) return nA - nB;
      if (partsA[i] !== partsB[i]) return partsA[i].localeCompare(partsB[i]);
    }
    return 0;
  };

  // Filter templates for AQI Sensors / Temp & Humidity
  const aqiSensorOptions = useMemo(() => {
    if (devices.length > 0) {
      return devices
        .filter(d => String(d.category).toUpperCase() === 'AQI_SENSOR')
        .map(d => ({
          id: d.id,
          label: d.name,
          description: d.description,
          areaName: d.area?.name || d.building?.name || '',
          sochiotDeviceId: d.sochiotDeviceId,
          sochiotMeta: d.sochiotMeta,
          isActive: d.isActive
        }))
        .sort((a, b) => naturalSort(a.label, b.label));
    }

    // Fallback: templates mapping
    return templates
      .filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity')
      .map(t => ({
        id: t.id,
        label: t.mapping?.vrvConfig?.vrvZone || t.name,
        description: 'AQI Sensor • Environmental target',
        areaName: '',
        sochiotDeviceId: t.mapping?.deviceId || t.mapping?.vrvConfig?.device,
        sochiotMeta: null,
        isActive: false
      }))
      .sort((a, b) => naturalSort(a.label, b.label));
  }, [devices, templates]);

  // Auto-select first sensor
  useEffect(() => {
    if (aqiSensorOptions.length > 0 && !selectedSensor) {
      setSelectedSensor(String(aqiSensorOptions[0].id));
    }
  }, [aqiSensorOptions, selectedSensor]);

  const selectedSensorInfo = useMemo(() => {
    return aqiSensorOptions.find(s => String(s.id) === selectedSensor) || null;
  }, [selectedSensor, aqiSensorOptions]);

  // Helper to check device online status
  const getSensorOnlineStatus = (sensorId) => {
    const option = aqiSensorOptions.find(s => String(s.id) === String(sensorId));
    if (!option) return false;
    
    if (option.sochiotMeta) {
      return option.sochiotMeta.mode === 'ONLINE' || option.isActive;
    }

    const template = templates.find(t => String(t.id) === String(sensorId));
    if (!template || !template.mapping) return false;

    let devId = template.mapping.deviceId || template.mapping.vrvConfig?.device;
    if (!devId) {
      const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
      if (anyConfig) devId = anyConfig.device;
    }
    const gatewayUuid = template.mapping.gatewayUuid;
    if (devId && getOverallStatus) {
      return !!getOverallStatus(devId, gatewayUuid);
    }
    return false;
  };

  const handleDownload = async (type) => {
    if (!selectedSensor) return;
    setGenerating(true);
    setDownloadType(type);
    setDownloadSuccess(null);
    setErrorMsg(null);

    const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token');
    const startDate = `${fromDate}T00:00:00Z`;
    const endDate = `${toDate}T23:59:59Z`;
    const apiInterval = interval === '15_MIN' ? 'MIN_15' : interval;

    try {
      if (type === 'excel') {
        const url = `${API_BASE_URL}/reports/temperature-humidity?deviceId=${selectedSensor}&startDate=${startDate}&endDate=${endDate}&interval=${apiInterval}&format=xlsx`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const text = await res.text();
          let json;
          try { json = JSON.parse(text); } catch (e) {}
          const errorMsg = (typeof json?.error === 'object' && json?.error?.message) 
            ? json.error.message 
            : (json?.message || (typeof json?.error === 'string' ? json.error : null) || `Download failed: ${res.statusText}`);
          throw new Error(errorMsg);
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${selectedSensorInfo?.label || 'Sensor'}_Temp_Humidity_Report_${fromDate}_to_${toDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        
        setDownloadSuccess('excel');
        setTimeout(() => setDownloadSuccess(null), 4000);
      } else if (type === 'pdf') {
        const url = `${API_BASE_URL}/reports/temperature-humidity?deviceId=${selectedSensor}&startDate=${startDate}&endDate=${endDate}&interval=${apiInterval}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const text = await res.text();
          let json;
          try { json = JSON.parse(text); } catch (e) {}
          const errorMsg = (typeof json?.error === 'object' && json?.error?.message) 
            ? json.error.message 
            : (json?.message || (typeof json?.error === 'string' ? json.error : null) || `Fetch failed: ${res.statusText}`);
          throw new Error(errorMsg);
        }

        const result = await res.json();
        if (result.success && result.data) {
          generatePdfFromMergedData(result.data);
        } else {
          throw new Error(result.error || 'Failed to retrieve report data');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(`Failed to generate report: ${err.message || err}`);
    } finally {
      setGenerating(false);
      setDownloadType(null);
    }
  };

  const generatePdfFromMergedData = (reportData) => {
    const sensorLabel = selectedSensorInfo?.label || 'AQI Sensor';
    const dateStr = new Date().toLocaleString();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    
    doc.setFontSize(18);
    doc.setTextColor(224, 94, 0); // TRUEiSENSE Orange
    doc.text(`AQI & ENVIRONMENT TELEMETRY REPORT`, 14, 20);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${dateStr}`, 14, 28);
    doc.text(`Sensor Asset: ${sensorLabel}`, 14, 33);
    doc.text(`Interval Ledger: ${interval} (From: ${fromDate} to: ${toDate})`, 14, 38);
    
    doc.setDrawColor(224, 94, 0, 0.3);
    doc.line(14, 42, 283, 42); // Horizontal line
    
    const fmt = (val, dec = 2) => val !== null && val !== undefined ? Number(val).toFixed(dec) : '-';

    const summary = reportData?.summary;
    if (summary) {
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY STATISTICS', 14, 48);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // Slate 600
      
      doc.text(`Average Temperature: ${fmt(summary.avgTemperature, 2)} °C`, 14, 54);
      doc.text(`Average Humidity: ${fmt(summary.avgHumidity, 2)} %`, 14, 59);
      doc.text(`Min Temperature: ${fmt(summary.minTemperature, 2)} °C`, 95, 54);
      doc.text(`Max Temperature: ${fmt(summary.maxTemperature, 2)} °C`, 95, 59);
      
      doc.setDrawColor(224, 94, 0, 0.15);
      doc.line(14, 68, 283, 68);
    }

    const rows = reportData?.data || [];
    const tableBody = rows.map((item, idx) => {
      const start = new Date(item.windowStart);
      const end = new Date(item.windowEnd);
      const devTemp = item.temperatureAvg !== null ? item.temperatureAvg - 24 : null;
      const devHum = item.humidityAvg !== null ? item.humidityAvg - 50 : null;

      const formatDate = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      };

      const formatTimeRange = (s, e) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())} - ${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`;
      };

      return [
        idx + 1,
        selectedSensorInfo?.areaName || '-',
        sensorLabel,
        formatDate(start),
        formatTimeRange(start, end),
        fmt(item.temperatureAvg, 2),
        fmt(item.humidityAvg, 2),
        fmt(devTemp, 2),
        fmt(devHum, 2)
      ];
    });

    const startTableY = summary ? 72 : 46;

    autoTable(doc, {
      startY: startTableY,
      head: [[
        'Sr.No', 'Zone', 'Node', 'Date', 'Time', 
        'Avg. Temp (°C)', 'Avg. Humidity (%)', 'Deviation Temp', 'Deviation Hum'
      ]],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [224, 94, 0], // TRUEiSENSE Orange
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount} - TRUEiSENSE Smart Monitoring System`, 14, 200);
    }

    doc.save(`AQI_Telemetry_Report_${sensorLabel.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    setDownloadSuccess('PDF Report downloaded successfully.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="fade-in p-2" style={{
      background: 'radial-gradient(circle at 50% 0%, rgba(224, 94, 0, 0.05) 0%, rgba(10, 15, 26, 0.4) 70%), #07070a',
      minHeight: '100vh',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.02)'
    }}>
      {/* CSS Tokens to match custom themes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        :root {
          --scada-card: #090d16;
          --scada-border: rgba(255, 255, 255, 0.05);
          --scada-text: #cbd5e1;
          --scada-accent: #e05e00; /* Signature TRUEiSENSE orange theme color */
        }
        .emr-card-header {
          border-bottom: 1px solid var(--scada-border) !important;
          padding: 20px 24px !important;
        }
        .emr-label {
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        .emr-select {
          background-color: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(224, 94, 0, 0.2) !important;
          color: #f8fafc !important;
          padding: 12px 20px !important;
          border-radius: 12px !important;
          font-size: 0.82rem !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
        }
        .emr-select:focus {
          border-color: var(--scada-accent) !important;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.15) !important;
          outline: none !important;
        }
        .emr-select option {
          background: var(--scada-card);
          color: var(--scada-text);
          padding: 10px;
        }
        .emr-select optgroup {
          font-weight: 800;
          color: var(--scada-accent);
          background: var(--scada-card);
        }
        .emr-dl-btn {
          padding: 14px 28px !important;
          border-radius: 14px !important;
          font-size: 0.85rem !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          border: none !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.4);
        }
        .emr-dl-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -4px rgba(0, 0, 0, 0.5);
        }
        .emr-dl-pdf {
          background: linear-gradient(135deg, var(--scada-accent) 0%, #7c2d12 100%) !important;
          color: white !important;
        }
        .emr-dl-pdf:hover:not(:disabled) {
          background: linear-gradient(135deg, #f97316 0%, #c2410c 100%) !important;
        }
        .emr-dl-excel {
          background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%) !important;
          color: white !important;
        }
        .emr-dl-excel:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        }
        .emr-info-card {
          background: var(--scada-card) !important;
          border-radius: 20px !important;
          border: 1px solid var(--scada-border) !important;
          box-shadow: 0 4px 25px -8px rgba(0, 0, 0, 0.4);
        }
        .emr-sensor-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(224, 94, 0, 0.15) 0%, rgba(224, 94, 0, 0.05) 100%);
          color: var(--scada-accent);
          border: 1px solid rgba(224, 94, 0, 0.15);
        }
        .emr-badge {
          display: inline-flex !important;
          align-items: center;
          gap: 5px;
          padding: 6px 14px !important;
          border-radius: 50px !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          background: transparent !important;
        }
        .emr-badge-pdf {
          background: rgba(224, 94, 0, 0.08) !important;
          color: #f97316 !important;
          border: 1px solid rgba(224, 94, 0, 0.18) !important;
        }
        .emr-badge-excel {
          background: rgba(37, 99, 235, 0.08) !important;
          color: #60a5fa !important;
          border: 1px solid rgba(37, 99, 235, 0.18) !important;
        }
        .emr-badge-type {
          background: rgba(224, 94, 0, 0.08) !important;
          color: var(--scada-accent) !important;
          border: 1px solid rgba(224, 94, 0, 0.18) !important;
        }
        .emr-success-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 14px;
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.15);
          color: #4ade80;
          font-size: 0.85rem;
          font-weight: 600;
          animation: emrSlideIn 0.3s ease;
        }
        @keyframes emrSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ===== MOBILE RESPONSIVE PDF REPORT ===== */
        @media (max-width: 767.98px) {
          .emr-card-header {
            padding: 14px 16px !important;
          }
          .emr-select {
            padding: 10px 14px !important;
            font-size: 0.78rem !important;
            border-radius: 10px !important;
          }
          .emr-dl-btn {
            padding: 12px 16px !important;
            font-size: 0.78rem !important;
            border-radius: 10px !important;
            letter-spacing: 0.8px;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .emr-download-actions {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .emr-label {
            font-size: 0.68rem;
          }
          .emr-info-card {
            border-radius: 14px !important;
          }
          .page-header h2 {
            font-size: 1.15rem !important;
          }
          .page-header p {
            font-size: 0.75rem !important;
          }
        }

        @media (max-width: 400px) {
          .emr-dl-btn {
            padding: 10px 12px !important;
            font-size: 0.72rem !important;
          }
        }
      `}} />

      {/* HEADER SECTION */}
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 text-white fw-bold d-flex align-items-center gap-2">
            <Leaf style={{ color: 'var(--scada-accent)' }} size={26} /> Environmental Reports & Ledgers
          </h2>
          <p className="text-secondary fs-7 mb-0">Generate, review, and download telemetry data ledgers for AQI and Environmental parameters.</p>
        </div>
      </div>

      <Row className="g-4">
        {/* OPTIONS CONTROL PANEL (FULL WIDTH) */}
        <Col xs={12}>
          <Card className="emr-info-card border-0">
            <Card.Header className="emr-card-header bg-transparent">
              <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2 fs-6 uppercase tracking-wider">
                <Activity size={18} style={{ color: 'var(--scada-accent)' }} /> Report Criteria Configurator
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form>
                <Row className="g-4 mb-4">
                  {/* Meter Selection */}
                  <Col md={6} xs={12}>
                    <Form.Group>
                      <Form.Label className="emr-label">Select target AQI Sensor / Zone</Form.Label>
                      {aqiSensorOptions.length === 0 ? (
                        <Alert variant="warning" className="bg-dark bg-opacity-25 border-warning border-opacity-25 text-warning rounded-4 p-3 m-0">
                          <AlertCircle className="me-2" size={16} />
                          No mapped AQI Sensors found. Please map sensors in the Templates page.
                        </Alert>
                      ) : (
                        <Form.Select 
                          className="emr-select w-100"
                          value={selectedSensor}
                          onChange={(e) => setSelectedSensor(e.target.value)}
                        >
                          {aqiSensorOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label} (AQI Sensor)
                            </option>
                          ))}
                        </Form.Select>
                      )}
                    </Form.Group>
                  </Col>

                  {/* Interval Selection */}
                  <Col md={6} xs={12}>
                    <Form.Group>
                      <Form.Label className="emr-label d-flex align-items-center gap-2">
                        <Clock size={13} style={{ color: 'var(--scada-accent)' }} /> Ledger Interval Scale
                      </Form.Label>
                      <Form.Select 
                        className="emr-select w-100"
                        value={interval}
                        onChange={(e) => setIntervalVal(e.target.value)}
                      >
                        <option value="15_MIN">15 MINUTES LEDGER</option>
                        <option value="HOURLY">HOURLY LEDGER</option>
                        <option value="DAILY">DAILY LEDGER</option>
                        <option value="YEARLY">YEARLY LEDGER</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-4 mb-4 align-items-end">
                  {/* From Date */}
                  <Col md={4} xs={12}>
                    <Form.Group>
                      <Form.Label className="emr-label d-flex align-items-center gap-2">
                        <Calendar size={13} style={{ color: 'var(--scada-accent)' }} /> From Date
                      </Form.Label>
                      <Form.Control 
                        type="date"
                        className="emr-select text-white w-100"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </Form.Group>
                  </Col>
                  
                  {/* To Date */}
                  <Col md={4} xs={12}>
                    <Form.Group>
                      <Form.Label className="emr-label d-flex align-items-center gap-2">
                        <Calendar size={13} style={{ color: 'var(--scada-accent)' }} /> To Date
                      </Form.Label>
                      <Form.Control 
                        type="date"
                        className="emr-select text-white w-100"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </Form.Group>
                  </Col>

                  {/* Download Actions */}
                  <Col md={4} xs={12}>
                    <div className="d-flex gap-3 flex-wrap emr-download-actions">
                      <Button 
                        className="emr-dl-btn emr-dl-pdf flex-fill d-flex align-items-center justify-content-center gap-2"
                        disabled={generating || !selectedSensor}
                        onClick={() => handleDownload('pdf')}
                        style={{ height: '50px' }}
                      >
                        {generating && downloadType === 'pdf' ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Download size={16} />
                        )}
                        Download PDF
                      </Button>
                      <Button 
                        className="emr-dl-btn emr-dl-excel flex-fill d-flex align-items-center justify-content-center gap-2"
                        disabled={generating || !selectedSensor}
                        onClick={() => handleDownload('excel')}
                        style={{ height: '50px' }}
                      >
                        {generating && downloadType === 'excel' ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FileSpreadsheet size={16} />
                        )}
                        Download CSV
                      </Button>
                    </div>
                  </Col>
                </Row>

                {/* Alerts */}
                {errorMsg && (
                  <Alert variant="danger" className="bg-danger bg-opacity-10 border-danger border-opacity-10 text-danger rounded-4 mb-3 d-flex align-items-center gap-2 fs-13 py-3">
                    <AlertCircle size={16} /> {errorMsg}
                  </Alert>
                )}

                {downloadSuccess && (
                  <div className="emr-success-alert mb-3">
                    <CheckCircle2 size={16} /> {downloadSuccess}
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AQIPDFReport;
