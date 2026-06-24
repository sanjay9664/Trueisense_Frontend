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

const AQIPDFReport = () => {
  const { getOverallStatus } = useDeviceStatus();
  const [templates, setTemplates] = useState([]);
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

  // Load templates on mount
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse templates:', e);
      }
    }

    fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const mapped = data.map(t => {
          const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
          const defValues = hasDef ? t.defaultValues : null;
          const mappingSource = defValues || t.settings?.[0]?.meta || {};
          return {
            id: t.id,
            name: t.name,
            category: (defValues && defValues.category) || t.category || 'Water Management',
            module: (defValues && defValues.module) || t.settings?.[0]?.eventKey || 'AG Tank',
            mapping: mappingSource
          };
        });
        setTemplates(mapped);
        localStorage.setItem('scada_templates', JSON.stringify(mapped));
      })
      .catch(err => console.error('Error fetching templates:', err));
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
    return templates
      .filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity')
      .map(t => ({
        id: t.id,
        label: t.mapping?.vrvConfig?.vrvZone || t.name,
        type: 'aqi'
      }))
      .sort((a, b) => naturalSort(a.label, b.label));
  }, [templates]);

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
    setGenerating(true);
    setDownloadType(type);
    setDownloadSuccess(null);
    setErrorMsg(null);

    try {
      // Bypassing API fetches for PDF Reports as requested - generate client-side simulated data instead
      setTimeout(() => {
        try {
          generateClientSideReport(type);
        } catch (e) {
          console.error('Failed to generate report:', e);
          setErrorMsg('Failed to generate report.');
        } finally {
          setGenerating(false);
          setDownloadType(null);
        }
      }, 1000);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(`Failed to generate report: ${err.message || err}`);
      setGenerating(false);
      setDownloadType(null);
    }
  };

  const generatePdfFromMergedData = (rows) => {
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

    const tableBody = rows.map(r => [
      new Date(r.windowStart).toLocaleString('en-IN'),
      new Date(r.windowEnd).toLocaleString('en-IN'),
      fmt(r.values.temp, 2),
      fmt(r.values.hum, 1),
      fmt(r.values.co2, 0),
      fmt(r.values.tvoc, 0),
      fmt(r.values.aqi, 2)
    ]);

    autoTable(doc, {
      startY: 46,
      head: [[
        'Start Time', 'End Time', 
        'Temperature (°C)', 'Humidity (%)', 'CO2 (PPM)', 'TVOC (PPM)', 'AQI (Index)'
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
      columnStyles: {
        0: { halign: 'left', cellWidth: 45 },
        1: { halign: 'left', cellWidth: 45 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    doc.save(`AQI_Telemetry_Report_${sensorLabel.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    setDownloadSuccess('PDF Report downloaded successfully.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const generateExcelFromMergedData = (rows) => {
    const sensorLabel = selectedSensorInfo?.label || 'AQI Sensor';
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Title
    csvContent += `"AQI & ENVIRONMENT TELEMETRY REPORT - ${sensorLabel}"\r\n`;
    csvContent += `"Generated on: ${new Date().toLocaleString()}"\r\n`;
    csvContent += `"Ledger Period: From ${fromDate} to ${toDate} (Interval: ${interval})"\r\n\r\n`;
    
    // Headers
    csvContent += `"Start Time","End Time","Temperature (Deg.C)","Humidity (%)","CO2 (PPM)","TVOC (PPM)","AQI (Index)"\r\n`;

    const fmt = (val, dec = 2) => val !== null && val !== undefined ? Number(val).toFixed(dec) : '';

    rows.forEach(r => {
      const startTime = new Date(r.windowStart).toLocaleString('en-IN');
      const endTime = new Date(r.windowEnd).toLocaleString('en-IN');
      csvContent += `"${startTime}","${endTime}",${fmt(r.values.temp, 2)},${fmt(r.values.hum, 1)},${fmt(r.values.co2, 0)},${fmt(r.values.tvoc, 0)},${fmt(r.values.aqi, 2)}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AQI_Telemetry_${sensorLabel.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('CSV Spreadsheet downloaded successfully.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  // Fallback client side simulator
  const generateClientSideReport = (type) => {
    const sensorLabel = selectedSensorInfo?.label || 'AQI Sensor';
    const rows = [];
    const fromTime = new Date(`${fromDate}T00:00:00`);
    const toTime = new Date(`${toDate}T23:59:59`);
    
    let intervalMs = 60 * 60 * 1000; // Hourly
    if (interval === '15_MIN') intervalMs = 15 * 60 * 1000;
    else if (interval === 'DAILY') intervalMs = 24 * 60 * 60 * 1000;
    else if (interval === 'YEARLY') intervalMs = 365 * 24 * 60 * 60 * 1000;

    let steps = Math.min(100, Math.floor((toTime - fromTime) / intervalMs));
    if (steps <= 0) steps = 24;

    for (let i = 0; i <= steps; i++) {
      const snapStart = new Date(fromTime.getTime() + (i * intervalMs));
      if (snapStart > toTime) break;
      const snapEnd = new Date(snapStart.getTime() + intervalMs);
      
      rows.push({
        windowStart: snapStart.toISOString(),
        windowEnd: snapEnd.toISOString(),
        values: {
          temp: 21.4 + (Math.random() * 4 - 2),
          hum: 48.5 + (Math.random() * 10 - 5),
          co2: 480 + Math.round(Math.random() * 80),
          tvoc: 62 + Math.round(Math.random() * 15),
          aqi: 22.45 + (Math.random() * 5)
        }
      });
    }

    if (type === 'pdf') {
      generatePdfFromMergedData(rows);
    } else {
      generateExcelFromMergedData(rows);
    }
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
                  <Col md={6}>
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
                  <Col md={6}>
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
                  <Col md={4}>
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
                  <Col md={4}>
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
                  <Col md={4}>
                    <div className="d-flex gap-3">
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
