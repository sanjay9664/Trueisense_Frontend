import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Form, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FileText, Download, FileSpreadsheet, Zap, CheckCircle2, AlertCircle, Activity, BarChart3, Clock, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDeviceStatus } from '../../services/DeviceStatusContext';

const PARAMETERS = [
  { key: 'ebKwh', label: 'EB Active Energy (EB KWH)', defaultKey: '3,151' },
  { key: 'totalKw', label: 'Active Power (Total kW)', defaultKey: '3,152' },
  { key: 'totalKva', label: 'Apparent Power (Total kVA)', defaultKey: '3,153' },
  { key: 'vR', label: 'Voltage R', defaultKey: '3,154' },
  { key: 'vY', label: 'Voltage Y', defaultKey: '3,155' },
  { key: 'vB', label: 'Voltage B', defaultKey: '3,156' },
  { key: 'iR', label: 'Current R', defaultKey: '3,157' },
  { key: 'iY', label: 'Current Y', defaultKey: '3,158' },
  { key: 'iB', label: 'Current B', defaultKey: '3,159' },
  { key: 'pf', label: 'Power Factor (PF)', defaultKey: '4,24F' }
];
const API_BASE_URL = import.meta.env.VITE_BACKEND_BMS_URL || 'http://localhost:3002/api/v1';

const EnergyPDFReport = () => {
  const { getOverallStatus } = useDeviceStatus();
  
  const siteId = useMemo(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      return userData?.siteId || localStorage.getItem('selectedSiteId') || '1';
    } catch (e) {
      return localStorage.getItem('selectedSiteId') || '1';
    }
  }, []);

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
  const [selectedMeter, setSelectedMeter] = useState('');
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
        
        // Fallback: load templates from local storage
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

  // Filter devices to show all energy meters
  const energyMeterOptions = useMemo(() => {
    if (devices.length > 0) {
      return devices
        .filter(d => String(d.category).toUpperCase() === 'ENERGY_METER')
        .map(d => ({
          id: d.id,
          label: d.name,
          description: d.description,
          sochiotDeviceId: d.sochiotDeviceId,
          sochiotMeta: d.sochiotMeta,
          isActive: d.isActive
        }))
        .sort((a, b) => naturalSort(a.label, b.label));
    }
    
    // Fallback: templates mapping
    return templates
      .filter(t => t.module === 'Sub Meters')
      .map(t => ({
        id: t.id,
        label: t.mapping?.energyMeteringTarget || t.name,
        description: 'Sub Meter • Energy Report Target',
        sochiotDeviceId: t.mapping?.deviceId,
        sochiotMeta: null,
        isActive: false
      }))
      .sort((a, b) => naturalSort(a.label, b.label));
  }, [devices, templates]);

  // Combined meters list (only sub-meters / energy meters)
  const allMeterOptions = useMemo(() => {
    return energyMeterOptions;
  }, [energyMeterOptions]);

  const subMeterOptions = allMeterOptions;

  // Auto-select first meter or handle mismatch
  useEffect(() => {
    if (allMeterOptions.length > 0) {
      const exists = allMeterOptions.some(m => String(m.id) === String(selectedMeter));
      if (!selectedMeter || !exists) {
        setSelectedMeter(String(allMeterOptions[0].id));
      }
    }
  }, [allMeterOptions, selectedMeter]);

  const selectedMeterInfo = useMemo(() => {
    return allMeterOptions.find(m => String(m.id) === selectedMeter) || null;
  }, [selectedMeter, allMeterOptions]);

  // Helper to check device online status
  const getMeterOnlineStatus = (meterId) => {
    const option = allMeterOptions.find(m => String(m.id) === String(meterId));
    if (!option) return false;
    
    if (option.sochiotMeta) {
      return option.sochiotMeta.mode === 'ONLINE' || option.isActive;
    }
    
    const template = templates.find(t => String(t.id) === String(meterId));
    if (!template || !template.mapping) return false;

    let devId = template.mapping.deviceId;
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
    if (!selectedMeter) return;
    setGenerating(true);
    setDownloadType(type);
    setDownloadSuccess(null);
    setErrorMsg(null);

    const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token');
    const startDate = `${fromDate}T00:00:00Z`;
    const endDate = `${toDate}T23:59:59Z`;

    try {
      if (type === 'excel') {
        const url = `${API_BASE_URL}/reports/energy?deviceId=${selectedMeter}&startDate=${startDate}&endDate=${endDate}&interval=${interval}&format=xlsx`;
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
        a.download = `${selectedMeterInfo?.label || 'Meter'}_Energy_Report_${fromDate}_to_${toDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        
        setDownloadSuccess('excel');
        setTimeout(() => setDownloadSuccess(null), 4000);
      } else if (type === 'pdf') {
        const url = `${API_BASE_URL}/reports/energy?deviceId=${selectedMeter}&startDate=${startDate}&endDate=${endDate}&interval=${interval}`;
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
    const meterLabel = selectedMeterInfo?.label || 'Meter';
    const dateStr = new Date().toLocaleString();
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    doc.setFontSize(18);
    doc.setTextColor(224, 94, 0); // TRUEiSENSE Orange
    doc.text(`ENERGY TELEMETRY CONSOLIDATED REPORT`, 14, 20);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${dateStr}`, 14, 28);
    doc.text(`Target Asset: ${meterLabel} (Sub Meter)`, 14, 33);
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
      
      doc.text(`Total Energy Consumed: ${fmt(summary.totalEnergyConsumed, 2)} kWh`, 14, 54);
      doc.text(`Average Power Factor: ${fmt(summary.pfAvg, 4)}`, 14, 59);
      doc.text(`Voltage Avg: ${fmt(summary.voltageAvg, 2)} V`, 95, 54);
      doc.text(`Voltage Min: ${fmt(summary.voltageMin, 2)} V`, 95, 59);
      doc.text(`Voltage Max: ${fmt(summary.voltageMax, 2)} V`, 95, 64);
      doc.text(`Current Avg: ${fmt(summary.currentAvg, 2)} A`, 180, 54);
      
      doc.setDrawColor(224, 94, 0, 0.15);
      doc.line(14, 68, 283, 68);
    }

    const rows = reportData?.data || [];
    const tableBody = rows.map(item => {
      const start = new Date(item.windowStart);
      const end = new Date(item.windowEnd);
      
      const totalKwh = item.closingEnergy !== null && item.openingEnergy !== null
        ? Math.max(0, item.closingEnergy - item.openingEnergy)
        : null;

      const totalKvah = item.closingKvah !== null && item.openingKvah !== null
        ? Math.max(0, item.closingKvah - item.openingKvah)
        : null;

      return [
        start.toLocaleString('en-IN'),
        end.toLocaleString('en-IN'),
        fmt(totalKwh, 2),
        fmt(totalKvah, 2),
        fmt(item.demandMax, 2),
        fmt(item.voltageAvg, 2),
        fmt(item.voltageMax, 2),
        fmt(item.voltageMin, 2),
        fmt(item.currentAvg, 2),
        fmt(item.currentMax, 2),
        fmt(item.currentMin, 2),
        fmt(item.pfAvg, 4)
      ];
    });

    const startTableY = summary ? 72 : 46;

    autoTable(doc, {
      startY: startTableY,
      head: [[
        'Start Time', 'End Time', 
        'Energy (kWh)', 'Apparent (kVAh)', 'Max Demand (kW)', 
        'Volt Avg (V)', 'Volt Max (V)', 'Volt Min (V)', 
        'Amp Avg (A)', 'Amp Max (A)', 'Amp Min (A)', 
        'Avg. PF'
      ]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [224, 94, 0], textColor: 255 },
      styles: { fontSize: 7, cellPadding: 2 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - TRUEiSENSE Smart Monitoring System`, 14, 200);
    }

    doc.save(`${meterLabel.replace(/\s+/g, '_')}_Consolidated_Report.pdf`);
    setDownloadSuccess('pdf');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const currentDate = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="emr-fade-in">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h2 className="mb-1 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--scada-text)' }}>
            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--scada-accent), #b34500)', boxShadow: '0 4px 15px rgba(224, 94, 0, 0.3)' }}>
              <FileText size={20} className="text-white" />
            </div>
            Energy Report
          </h2>
          <p className="mb-0" style={{ color: 'var(--scada-text-muted)', fontSize: '0.85rem' }}>
            <Clock size={13} className="me-1" style={{ opacity: 0.6 }} />
            {currentDate}
          </p>
        </div>

        {/* Stats Badges */}
        <div className="d-flex gap-2 flex-wrap">
          {subMeterOptions.length > 0 && (
            <div className="emr-stat-badge emr-stat-sub">
              <Activity size={14} />
              <span>{subMeterOptions.length} Sub Meter{subMeterOptions.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Report Card */}
      <Card className="emr-main-card border-0 mb-4">
        <Card.Body className="p-4 p-md-5">
          <Row className="g-4 mb-4">
            {/* Meter Selection */}
            <Col md={6} xs={12}>
              <Form.Group>
                <Form.Label className="emr-label d-flex align-items-center gap-2 mb-2">
                  <Zap size={14} style={{ color: 'var(--scada-accent)' }} />
                  Select Meter
                </Form.Label>
                <Form.Select
                  className="emr-select"
                  value={selectedMeter}
                  onChange={(e) => setSelectedMeter(e.target.value)}
                >
                  {allMeterOptions.length === 0 && (
                    <option value="">No meters configured</option>
                  )}
                  {subMeterOptions.map(meter => (
                    <option key={meter.id} value={String(meter.id)}>
                      {meter.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Interval Selection */}
            <Col md={6} xs={12}>
              <Form.Group>
                <Form.Label className="emr-label d-flex align-items-center gap-2 mb-2">
                  <Clock size={14} style={{ color: 'var(--scada-accent)' }} />
                  Select Interval
                </Form.Label>
                <Form.Select
                  className="emr-select"
                  value={interval}
                  onChange={(e) => setIntervalVal(e.target.value)}
                >
                  <option value="MIN_15">15 Minutes</option>
                  <option value="HOURLY">Hourly</option>
                  <option value="DAILY">Daily</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-4 align-items-end">
            {/* From Date */}
            <Col md={6} lg={4} xs={12}>
              <Form.Group>
                <Form.Label className="emr-label d-flex align-items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: 'var(--scada-accent)' }} />
                  From Date
                </Form.Label>
                <Form.Control
                  type="date"
                  className="emr-select text-white"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </Form.Group>
            </Col>

            {/* To Date */}
            <Col md={6} lg={4} xs={12}>
              <Form.Group>
                <Form.Label className="emr-label d-flex align-items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: 'var(--scada-accent)' }} />
                  To Date
                </Form.Label>
                <Form.Control
                  type="date"
                  className="emr-select text-white"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </Form.Group>
            </Col>

            {/* Download Buttons */}
            <Col lg={4} xs={12}>
              <div className="d-flex gap-3 flex-wrap emr-download-actions">
                <Button
                  onClick={() => handleDownload('pdf')}
                  disabled={generating || !selectedMeter}
                  className="emr-dl-btn emr-dl-pdf d-flex align-items-center gap-2 flex-grow-1 justify-content-center"
                >
                  {generating && downloadType === 'pdf' ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>Download PDF</span>
                </Button>

                <Button
                  onClick={() => handleDownload('excel')}
                  disabled={generating || !selectedMeter}
                  className="emr-dl-btn emr-dl-excel d-flex align-items-center gap-2 flex-grow-1 justify-content-center"
                >
                  {generating && downloadType === 'excel' ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FileSpreadsheet size={18} />
                  )}
                  <span>Download Excel</span>
                </Button>
              </div>
            </Col>
          </Row>

          {/* Error Alert */}
          {errorMsg && (
            <Alert variant="danger" className="mt-4 border-danger border-opacity-25 bg-danger bg-opacity-10 text-danger rounded-4 d-flex align-items-center gap-2">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </Alert>
          )}

          {/* Success Alert */}
          {downloadSuccess && (
            <div className="emr-success-alert mt-4">
              <CheckCircle2 size={18} />
              <span>
                {downloadSuccess === 'pdf' ? 'PDF' : 'Excel'} report for <strong>{selectedMeterInfo?.label}</strong> downloaded successfully!
              </span>
            </div>
          )}
        </Card.Body>
      </Card>



      {/* No Meters Warning */}
      {allMeterOptions.length === 0 && (
        <Card className="emr-warn-card border-0 mt-4">
          <Card.Body className="p-4 d-flex align-items-center gap-3">
            <AlertCircle size={22} style={{ color: 'var(--scada-accent)' }} />
            <div>
              <strong style={{ color: 'var(--scada-text)' }}>No meters configured</strong>
              <p className="mb-0 mt-1" style={{ color: 'var(--scada-text-muted)', fontSize: '0.85rem' }}>
                Please configure Sub Meters in the Templates section first to generate reports.
              </p>
            </div>
          </Card.Body>
        </Card>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .emr-fade-in {
          animation: emrFadeIn 0.4s ease;
        }
        @keyframes emrFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stat badges */
        .emr-stat-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .emr-stat-sub {
          background: rgba(56, 189, 248, 0.08);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.18);
        }

        /* Main card */
        .emr-main-card {
          background: var(--scada-card) !important;
          border-radius: 20px !important;
          border: 1px solid var(--scada-border) !important;
          box-shadow: 0 8px 40px -10px rgba(0, 0, 0, 0.5);
          transition: box-shadow 0.3s ease;
        }
        .emr-main-card:hover {
          box-shadow: 0 12px 50px -10px rgba(0, 0, 0, 0.6);
        }

        /* Label */
        .emr-label {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--scada-text-muted);
        }

        /* Select */
        .emr-select {
          background-color: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid var(--scada-border) !important;
          color: var(--scada-text) !important;
          border-radius: 14px !important;
          padding: 14px 18px !important;
          font-weight: 600 !important;
          font-size: 0.92rem !important;
          transition: all 0.3s ease;
        }
        .emr-select:focus {
          border-color: var(--scada-accent) !important;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.12) !important;
          outline: none;
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

        /* Download buttons */
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
        .emr-dl-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .emr-dl-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .emr-dl-pdf {
          background: linear-gradient(135deg, var(--scada-accent) 0%, #b34500 100%) !important;
          color: white !important;
        }
        .emr-dl-pdf:hover:not(:disabled) {
          background: linear-gradient(135deg, #f97316 0%, #c2410c 100%) !important;
        }
        .emr-dl-excel {
          background: linear-gradient(135deg, #16a34a 0%, #14532d 100%) !important;
          color: white !important;
        }
        .emr-dl-excel:hover:not(:disabled) {
          background: linear-gradient(135deg, #22c55e 0%, #15803d 100%) !important;
        }

        /* Success alert */
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

        /* Info Card */
        .emr-info-card {
          background: var(--scada-card) !important;
          border-radius: 20px !important;
          border: 1px solid var(--scada-border) !important;
          box-shadow: 0 4px 25px -8px rgba(0, 0, 0, 0.4);
        }
        .emr-meter-icon {
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

        /* Badges */
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
          color: #fb923c !important;
          border: 1px solid rgba(224, 94, 0, 0.18) !important;
        }
        .emr-badge-excel {
          background: rgba(22, 163, 74, 0.08) !important;
          color: #4ade80 !important;
          border: 1px solid rgba(22, 163, 74, 0.18) !important;
        }
        .emr-badge-type {
          background: rgba(224, 94, 0, 0.08) !important;
          color: var(--scada-accent) !important;
          border: 1px solid rgba(224, 94, 0, 0.18) !important;
        }

        /* Warning card */
        .emr-warn-card {
          background: var(--scada-card) !important;
          border-radius: 20px !important;
          border: 1px solid rgba(224, 94, 0, 0.15) !important;
        }

        /* Live pulsating indicator dot */
        .pulse-dot-green {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse-dot-key 1.5s infinite;
          display: inline-block;
        }
        .pulse-dot-red {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: pulse-dot-key 1.5s infinite;
          display: inline-block;
        }
        @keyframes pulse-dot-key {
          0% { transform: scale(0.85); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.6; }
        }

        /* Light mode overrides */
        body.light-mode .emr-select {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
          border-color: rgba(0, 0, 0, 0.08) !important;
        }
        body.light-mode .emr-select:focus {
          border-color: var(--scada-accent) !important;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.1) !important;
        }
        body.light-mode .emr-select option,
        body.light-mode .emr-select optgroup {
          background: #ffffff !important;
          color: #1e293b !important;
        }

        /* ===== MOBILE RESPONSIVE ENERGY REPORT ===== */
        @media (max-width: 767.98px) {
          .emr-main-card .p-md-5 {
            padding: 1rem !important;
          }
          .emr-select {
            padding: 10px 14px !important;
            font-size: 0.82rem !important;
            border-radius: 10px !important;
          }
          .emr-dl-btn {
            padding: 12px 16px !important;
            font-size: 0.78rem !important;
            border-radius: 10px !important;
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
          .emr-main-card,
          .emr-info-card,
          .emr-warn-card {
            border-radius: 14px !important;
          }
          .emr-info-card .p-4 {
            padding: 1rem !important;
          }
          .emr-info-card h5 {
            font-size: 1rem !important;
          }
          .emr-badge {
            padding: 4px 10px !important;
            font-size: 0.65rem !important;
          }
        }

        @media (max-width: 400px) {
          .emr-dl-btn {
            padding: 10px 12px !important;
            font-size: 0.72rem !important;
          }
          .emr-main-card .p-md-5 {
            padding: 0.75rem !important;
          }
        }
      `}} />
    </div>
  );
};

export default EnergyPDFReport;
