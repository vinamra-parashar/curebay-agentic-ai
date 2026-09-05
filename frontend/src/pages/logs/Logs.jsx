import { useState, useEffect } from "react";
import { agentLogsAPI } from "../../services/api";
import "./logs.css";

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('recent'); // recent, session, order, patient
    const [searchValue, setSearchValue] = useState('');
    const [selectedLog, setSelectedLog] = useState(null);

    const loadLogs = async () => {
        setLoading(true);
        setError(null);
        
        try {
            let response;
            switch (filter) {
                case 'recent':
                    response = await agentLogsAPI.getRecentLogs(50);
                    break;
                case 'session':
                    if (searchValue) {
                        response = await agentLogsAPI.getLogsBySession(searchValue);
                    } else {
                        setError('Please enter a session ID');
                        setLoading(false);
                        return;
                    }
                    break;
                case 'order':
                    if (searchValue) {
                        response = await agentLogsAPI.getLogsByOrder(searchValue);
                    } else {
                        setError('Please enter an order ID');
                        setLoading(false);
                        return;
                    }
                    break;
                case 'patient':
                    if (searchValue) {
                        response = await agentLogsAPI.getLogsByPatient(searchValue, 50);
                    } else {
                        setError('Please enter a patient ID');
                        setLoading(false);
                        return;
                    }
                    break;
                default:
                    response = await agentLogsAPI.getRecentLogs(20);
            }
            
            setLogs(response.data.data || response.data);
        } catch (err) {
            console.error('Error loading logs:', err);
            setError('Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    const loadSessionSummary = async (sessionId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await agentLogsAPI.getSessionSummary(sessionId);
            setSelectedLog(response.data.data);
        } catch (err) {
            console.error('Error loading session summary:', err);
            setError('Failed to load session summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [filter]);

    const getEventTypeColor = (eventType) => {
        const colors = {
            'analysis_started': '#3498db',
            'recommendation_generated': '#9b59b6',
            'confirmation_initiated': '#f39c12',
            'patient_response': '#1abc9c',
            'order_updated': '#2ecc71',
            'order_unchanged': '#95a5a6',
            'error_occurred': '#e74c3c'
        };
        return colors[eventType] || '#7f8c8d';
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="logs">
            <main className="container">
                <section className="card filters">
                    <h2>Filter Logs</h2>
                    
                    <div className="filter-controls">
                        <select 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="recent">Recent Logs</option>
                            <option value="session">By Session ID</option>
                            <option value="order">By Order ID</option>
                            <option value="patient">By Patient ID</option>
                        </select>

                        {(filter === 'session' || filter === 'order' || filter === 'patient') && (
                            <input 
                                type="text" 
                                placeholder={`Enter ${filter} ID`}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        )}

                        <button onClick={loadLogs} disabled={loading}>
                            {loading ? 'Loading...' : 'Apply Filter'}
                        </button>
                    </div>
                </section>

                {error && (
                    <section className="card error">
                        <p>{error}</p>
                        <button onClick={() => setError(null)}>Dismiss</button>
                    </section>
                )}

                <section className="card logs-container">
                    <div className="logs-header">
                        <h2>Agent Logs ({logs.length})</h2>
                    </div>

                    {logs.length === 0 ? (
                        <p>No logs found</p>
                    ) : (
                        <div className="logs-list">
                            {logs.map((log, index) => (
                                <div key={index} className="log-item">
                                    <div className="log-header">
                                        <span 
                                            className="event-type" 
                                            style={{ backgroundColor: getEventTypeColor(log.eventType) }}
                                        >
                                            {log.eventType.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                        <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
                                    </div>
                                    
                                    <div className="log-details">
                                        <p><strong>Session:</strong> {log.sessionId}</p>
                                        <p><strong>Order:</strong> {log.orderId}</p>
                                        <p><strong>Patient:</strong> {log.patientId}</p>
                                        
                                        {log.recommendations && log.recommendations.length > 0 && (
                                            <div className="recommendations">
                                                <strong>Recommendations:</strong>
                                                {log.recommendations.map((rec, idx) => (
                                                    <span key={idx}>{rec.recommendedTest}</span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {log.patientResponse && (
                                            <p><strong>Patient Response:</strong> {log.patientResponse}</p>
                                        )}
                                        
                                        {log.actionTaken && (
                                            <p><strong>Action:</strong> {log.actionTaken}</p>
                                        )}
                                    </div>

                                    {log.sessionId && (
                                        <button 
                                            className="view-summary"
                                            onClick={() => loadSessionSummary(log.sessionId)}
                                        >
                                            View Session Summary
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {selectedLog && (
                    <section className="card session-summary">
                        <div className="summary-header">
                            <h2>Session Summary</h2>
                            <button onClick={() => setSelectedLog(null)}>Close</button>
                        </div>
                        
                        <div className="summary-content">
                            <p><strong>Session ID:</strong> {selectedLog.sessionId}</p>
                            <p><strong>Order ID:</strong> {selectedLog.orderId}</p>
                            <p><strong>Patient ID:</strong> {selectedLog.patientId}</p>
                            <p><strong>Total Events:</strong> {selectedLog.totalEvents}</p>
                            <p><strong>Final Outcome:</strong> {selectedLog.finalOutcome}</p>
                            
                            <div className="event-breakdown">
                                <h3>Event Breakdown:</h3>
                                {Object.entries(selectedLog.eventBreakdown).map(([event, count]) => (
                                    <div key={event}>
                                        <span>{event.replace(/_/g, ' ')}:</span>
                                        <strong>{count}</strong>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="timeline">
                                <h3>Timeline:</h3>
                                {selectedLog.timeline.map((event, index) => (
                                    <div key={index} className="timeline-item">
                                        <span>{formatTimestamp(event.timestamp)}</span>
                                        <span>{event.eventType.replace(/_/g, ' ')}</span>
                                        {event.actionTaken && <span>{event.actionTaken}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default Logs;
