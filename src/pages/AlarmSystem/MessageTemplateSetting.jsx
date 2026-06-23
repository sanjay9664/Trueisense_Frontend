import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table } from 'react-bootstrap';
import { FiTrash2, FiEdit2 } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';

const deduplicateTemplates = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter(item => {
    const key = `${item.name?.trim()}-${item.content?.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const MessageTemplateSetting = () => {
  const { isDark } = useTheme();

  // Styles matching the premium look of the SCADA layout
  const pageBg = isDark ? '#0b1120' : '#f8f9fa';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const userRole = localStorage.getItem('userRole') || 'USER';
  const storageKey = userRole === 'SUPER_ADMIN' ? 'super_admin_alarm_message_templates' : 'admin_alarm_message_templates';

  // State for Message Templates
  const [messageTemplates, setMessageTemplates] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [
      { id: '1', name: 'Critical Alert', content: 'CRITICAL ALERT: [Parameter] has crossed [Condition] [Threshold] value. Immediate action required!' },
      { id: '2', name: 'Warning Alert', content: 'Warning: [Parameter] is [Condition] [Threshold].' },
      { id: '3', name: 'Status Notification', content: 'Notification: [Parameter] current value is [Value].' }
    ];
    return deduplicateTemplates(parsed);
  });

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);

  const handleAddTemplate = () => {
    if (!newTemplateName || !newTemplateContent) {
      alert('Please enter template name and message body.');
      return;
    }
    if (editTemplateId) {
      const updated = messageTemplates.map(t =>
        t.id === editTemplateId ? { ...t, name: newTemplateName, content: newTemplateContent } : t
      );
      const deduped = deduplicateTemplates(updated);
      setMessageTemplates(deduped);
      localStorage.setItem(storageKey, JSON.stringify(deduped));
      setSaveMsg({ type: 'success', text: 'Template updated successfully!' });
      setEditTemplateId(null);
    } else {
      const newTpl = {
        id: Date.now().toString(),
        name: newTemplateName,
        content: newTemplateContent
      };
      const updated = [...messageTemplates, newTpl];
      const deduped = deduplicateTemplates(updated);
      setMessageTemplates(deduped);
      localStorage.setItem(storageKey, JSON.stringify(deduped));
      setSaveMsg({ type: 'success', text: 'Template saved successfully!' });
    }
    
    setNewTemplateName('');
    setNewTemplateContent('');
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleEditClick = (tpl) => {
    setEditTemplateId(tpl.id);
    setNewTemplateName(tpl.name);
    setNewTemplateContent(tpl.content);
  };

  const handleDeleteTemplate = (id) => {
    const updated = messageTemplates.filter(t => t.id !== id);
    const deduped = deduplicateTemplates(updated);
    setMessageTemplates(deduped);
    localStorage.setItem(storageKey, JSON.stringify(deduped));
    
    setSaveMsg({ type: 'success', text: 'Template deleted successfully!' });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  return (
    <Container fluid className="py-4" style={{ backgroundColor: pageBg, minHeight: '100vh', color: textColor }}>
      {/* Header */}
      <div className="mb-4">
        <h2 style={{ fontWeight: '700', margin: 0 }}>Message Template Settings</h2>
        <small style={{ color: subTextColor }}>Configure and manage alarm message templates for the BMS Alarm notifications</small>
      </div>

      {/* Success/Error Message */}
      {saveMsg && (
        <div style={{
          padding: '12px 20px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '600',
          background: saveMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: saveMsg.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${saveMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
        }}>
          {saveMsg.text}
        </div>
      )}

      <Row className="g-4">
        {/* Create Template Form */}
        <Col lg={4}>
          <div style={{
            background: cardBg, borderRadius: '16px', padding: '20px',
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <h5 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: textColor }}>
              {editTemplateId ? 'Edit Message Template' : 'Create Message Template'}
            </h5>

            <div className="mb-3">
              <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                Template Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <Form.Control
                size="sm"
                placeholder="e.g. Critical Current Alert"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                style={{
                  background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                  borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                }}
              />
            </div>

            <div className="mb-4">
              <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                Message Body <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Use placeholder tokens like: [Parameter], [Condition], [Threshold]"
                value={newTemplateContent}
                onChange={e => setNewTemplateContent(e.target.value)}
                style={{
                  background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                  borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                }}
              />
              <small style={{ fontSize: '10px', color: subTextColor, marginTop: '6px', display: 'block' }}>
                💡 Tokens like <code>[Parameter]</code>, <code>[Condition]</code>, and <code>[Threshold]</code> will be auto-replaced when applied to an alarm.
              </small>
            </div>

            <Button
              onClick={handleAddTemplate}
              className="w-100"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px'
              }}
            >
              {editTemplateId ? 'Update Template' : 'Save Template'}
            </Button>
            {editTemplateId && (
              <Button
                onClick={() => {
                  setEditTemplateId(null);
                  setNewTemplateName('');
                  setNewTemplateContent('');
                }}
                className="w-100 mt-2"
                style={{
                  background: 'transparent', border: `1px solid ${borderColor}`, color: textColor,
                  padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px'
                }}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </Col>

        {/* List of Templates */}
        <Col lg={8}>
          <div style={{
            background: cardBg, borderRadius: '16px', padding: '20px',
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
            minHeight: '340px'
          }}>
            <h5 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: textColor }}>
              Saved Templates ({messageTemplates.length})
            </h5>

            {messageTemplates.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: '220px' }}>
                <span style={{ fontSize: '32px' }}>💬</span>
                <small className="mt-2 fw-semibold">No message templates saved yet</small>
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table hover responsive variant={isDark ? 'dark' : 'light'} style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ fontSize: '11px', textTransform: 'uppercase', color: subTextColor }}>
                      <th>Template Name</th>
                      <th>Message Body</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '13px' }}>
                    {messageTemplates.map((tpl) => (
                      <tr key={tpl.id} style={{ verticalAlign: 'middle' }}>
                        <td style={{ fontWeight: '600', color: textColor, width: '200px' }}>{tpl.name}</td>
                        <td style={{ color: subTextColor, fontSize: '12px' }}>{tpl.content}</td>
                        <td className="text-end">
                          <button
                            onClick={() => handleEditClick(tpl)}
                            style={{
                              border: 'none', background: 'transparent', color: '#3b82f6',
                              padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s', marginRight: '4px'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Edit"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            style={{
                              border: 'none', background: 'transparent', color: '#ef4444',
                              padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default MessageTemplateSetting;
