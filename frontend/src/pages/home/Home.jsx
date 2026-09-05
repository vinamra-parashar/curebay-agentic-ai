import { useState, useEffect } from "react";
import { patientAPI, orderAPI, agentAPI, testAPI, medicalHistoryAPI } from "../../services/api";
import "./home.css";

// ─────────────────────────────────────────────────────────────────────────────
// Demo Scenarios Configuration
// Each scenario specifies a patient, medical history, and order that can be
// created automatically in the database for evaluation / demonstration.
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_SCENARIOS = [
    {
        id: 'S1',
        number: 1,
        title: 'Diabetes + CBC Ordered',
        description: 'A diabetic patient aged 45 has only a Complete Blood Count in the order.',
        hint: 'Click Analyze Order to see HbA1c and Lipid Profile recommended.',
        expected: [
            'HbA1c — Priority: High',
            'Lipid Profile — Priority: High (2 reasons: Diabetes + age ≥ 40)'
        ],
        patient: {
            patientId: 'P_DEMO1',
            name: 'Alice (Demo)',
            age: 45,
            gender: 'Female',
            condition: 'Diabetes'
        },
        medicalHistory: {
            patientId: 'P_DEMO1',
            conditions: ['Diabetes'],
            allergies: [],
            medications: ['Metformin']
        },
        order: {
            orderId: 'ORD_DEMO1',
            patientId: 'P_DEMO1',
            tests: ['Complete Blood Count'],
            status: 'pending'
        }
    },
    {
        id: 'S2',
        number: 2,
        title: 'Diabetes + Hypertension + CBC + Lipid Profile',
        description: 'Patient with both Diabetes and Hypertension. CBC and Lipid Profile are already in the order.',
        hint: 'Kidney Function Test appears ONCE with 2 merged reasons (Diabetes + Hypertension).',
        expected: [
            'HbA1c — Priority: High',
            'Kidney Function Test — Priority: High (2 reasons merged ✓)',
            'Electrolyte Panel — Priority: Medium',
            'Liver Function Test — Priority: Medium'
        ],
        patient: {
            patientId: 'P_DEMO2',
            name: 'Bob (Demo)',
            age: 50,
            gender: 'Male',
            condition: 'Diabetes'
        },
        medicalHistory: {
            patientId: 'P_DEMO2',
            conditions: ['Diabetes', 'Hypertension'],
            allergies: [],
            medications: ['Metformin', 'Lisinopril']
        },
        order: {
            orderId: 'ORD_DEMO2',
            patientId: 'P_DEMO2',
            tests: ['Complete Blood Count', 'Lipid Profile'],
            status: 'pending'
        }
    },
    {
        id: 'S3',
        number: 3,
        title: 'HbA1c Already Ordered → Not Recommended Again',
        description: 'Diabetic patient whose order already includes HbA1c.',
        hint: 'HbA1c must NOT appear in recommendations even though Diabetes triggers it.',
        expected: [
            'Lipid Profile — Priority: High (2 reasons merged ✓)',
            'HbA1c — NOT recommended (already in order ✓)'
        ],
        patient: {
            patientId: 'P_DEMO3',
            name: 'Carol (Demo)',
            age: 45,
            gender: 'Female',
            condition: 'Diabetes'
        },
        medicalHistory: {
            patientId: 'P_DEMO3',
            conditions: ['Diabetes'],
            allergies: [],
            medications: []
        },
        order: {
            orderId: 'ORD_DEMO3',
            patientId: 'P_DEMO3',
            tests: ['Complete Blood Count', 'HbA1c'],
            status: 'pending'
        }
    },
    {
        id: 'S4',
        number: 4,
        title: 'Patient Rejects Recommendation → Order Unchanged',
        description: 'Hypertension patient with Kidney Function Test ordered. Recommendations are shown but the patient clicks "No, Continue Without Adding".',
        hint: 'After clicking "No, Continue Without Adding", the order must stay unchanged.',
        expected: [
            'Lipid Profile — Priority: High (recommended)',
            'Order remains [Kidney Function Test] — unchanged after rejection ✓'
        ],
        patient: {
            patientId: 'P_DEMO4',
            name: 'David (Demo)',
            age: 55,
            gender: 'Male',
            condition: 'Hypertension'
        },
        medicalHistory: {
            patientId: 'P_DEMO4',
            conditions: ['Hypertension'],
            allergies: [],
            medications: ['Amlodipine']
        },
        order: {
            orderId: 'ORD_DEMO4',
            patientId: 'P_DEMO4',
            tests: ['Kidney Function Test'],
            status: 'pending'
        }
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const Home = () => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showRecommendation, setShowRecommendation] = useState(false);
    const [orderUpdated, setOrderUpdated] = useState(false);
    const [lastAddedTest, setLastAddedTest] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [scenarioLoading, setScenarioLoading] = useState(null); // which scenario is loading

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({ open: false, testName: null });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setInitialLoading(true);
        try {
            await Promise.all([loadPatients(), loadOrders()]);
        } catch (err) {
            console.error('Error loading initial data:', err);
        } finally {
            setInitialLoading(false);
        }
    };

    const loadPatients = async () => {
        try {
            const response = await patientAPI.getAllPatients();
            setPatients(response.data || []);
            if (response.data && response.data.length > 0) {
                setSelectedPatient(response.data[0]);
            }
        } catch (err) {
            console.error('Error loading patients:', err);
            setError('Failed to load patients');
        }
    };

    const loadOrders = async () => {
        try {
            const response = await orderAPI.getAllOrders();
            setOrders(response.data || []);
            if (response.data && response.data.length > 0) {
                setSelectedOrder(response.data[0]);
            }
        } catch (err) {
            console.error('Error loading orders:', err);
            setError('Failed to load orders');
        }
    };

    // ── Setup a demo scenario ────────────────────────────────────────────────
    const setupDemoScenario = async (scenario) => {
        setScenarioLoading(scenario.id);
        setError(null);
        setShowRecommendation(false);
        setOrderUpdated(false);
        setLastAddedTest(null);
        setAnalysisResult(null);

        try {
            // Ensure required tests exist (silently ignore duplicates)
            const requiredTests = [
                { testId: 'T001', testName: 'Complete Blood Count', category: 'Hematology', description: 'Blood test to evaluate overall health', price: 500 },
                { testId: 'T002', testName: 'Lipid Profile', category: 'Biochemistry', description: 'Test to measure cholesterol levels', price: 800 },
                { testId: 'T005', testName: 'Kidney Function Test', category: 'Biochemistry', description: 'Test to evaluate kidney health', price: 600 },
                { testId: 'T006', testName: 'HbA1c', category: 'Biochemistry', description: 'Test to measure average blood sugar levels', price: 400 },
                { testId: 'T007', testName: 'Electrolyte Panel', category: 'Biochemistry', description: 'Test to measure electrolytes in the blood', price: 350 },
                { testId: 'T004', testName: 'Liver Function Test', category: 'Biochemistry', description: 'Test to evaluate liver health', price: 700 },
            ];
            for (const t of requiredTests) {
                try { await testAPI.createTest(t); } catch (e) { /* already exists */ }
            }

            // Create patient (silently ignore duplicate)
            try { await patientAPI.createPatient(scenario.patient); } catch (e) { /* already exists */ }

            // Create medical history (silently ignore duplicate)
            try { await medicalHistoryAPI.createMedicalHistory(scenario.medicalHistory); } catch (e) { /* already exists */ }

            // Create order (silently ignore duplicate)
            try { await orderAPI.createOrder(scenario.order); } catch (e) { /* already exists */ }

            // Reload all data fresh from DB
            const [pRes, oRes] = await Promise.all([
                patientAPI.getAllPatients(),
                orderAPI.getAllOrders()
            ]);

            const allPatients = pRes.data || [];
            const allOrders = oRes.data || [];
            setPatients(allPatients);
            setOrders(allOrders);

            // Auto-select the demo patient and order
            const demoPatient = allPatients.find(p => p.patientId === scenario.patient.patientId);
            const demoOrder = allOrders.find(o => o.orderId === scenario.order.orderId);

            if (demoPatient) setSelectedPatient(demoPatient);
            if (demoOrder) setSelectedOrder(demoOrder);

            setActiveScenarioId(scenario.id);
        } catch (err) {
            console.error('Error setting up demo scenario:', err);
            setError('Failed to set up scenario. Please try again.');
        } finally {
            setScenarioLoading(null);
        }
    };

    // ── Analyze order ────────────────────────────────────────────────────────
    const analyzeOrder = async () => {
        if (!selectedOrder) return;

        setLoading(true);
        setError(null);
        setOrderUpdated(false);
        setLastAddedTest(null);

        try {
            const confirmResponse = await agentAPI.initiateConfirmation(selectedOrder.orderId);
            console.log('API Response:', confirmResponse.data);
            setSessionId(confirmResponse.data.data.sessionId);
            setAnalysisResult(confirmResponse.data.data);
            setShowRecommendation(true);
        } catch (err) {
            console.error('Error analyzing order:', err);
            setError('Failed to analyze order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Confirmation dialog ──────────────────────────────────────────────────
    const requestAddTest = (testName) => {
        setConfirmDialog({ open: true, testName });
    };

    const cancelAddTest = () => {
        setConfirmDialog({ open: false, testName: null });
    };

    const confirmAddTest = async () => {
        const testName = confirmDialog.testName;
        setConfirmDialog({ open: false, testName: null });

        if (!sessionId || !selectedOrder || !testName) return;

        setLoading(true);
        setError(null);

        try {
            const recommendations = analysisResult.recommendations || [];
            const testIndex = recommendations.findIndex(r => r.recommendedTest === testName);

            const response = await agentAPI.processPatientConfirmation(sessionId, {
                patientResponse: 'yes',
                selectedTestIndex: testIndex
            });

            if (response.data.action === 'test_added') {
                setLastAddedTest(testName);
                setOrderUpdated(true);
                setShowRecommendation(false);
                // Refresh order so "Current Tests" shows the newly added test
                const oRes = await orderAPI.getAllOrders();
                const allOrders = oRes.data || [];
                setOrders(allOrders);
                const refreshed = allOrders.find(o => o.orderId === selectedOrder.orderId);
                if (refreshed) setSelectedOrder(refreshed);
            } else {
                setError('Could not add test. Please try again.');
            }
        } catch (err) {
            console.error('Error adding test:', err);
            setError(`Failed to add "${testName}" to the order. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    const continueWithoutAdding = async () => {
        if (!sessionId) return;

        setLoading(true);
        setError(null);

        try {
            await agentAPI.processPatientConfirmation(sessionId, {
                patientResponse: 'no'
            });
            setShowRecommendation(false);
        } catch (err) {
            console.error('Error declining recommendation:', err);
            setError('Failed to process response');
        } finally {
            setLoading(false);
        }
    };

    // ── Create sample data ───────────────────────────────────────────────────
    const createSampleData = async () => {
        setLoading(true);
        setError(null);

        try {
            await testAPI.createTest({ testId: 'T001', testName: 'Complete Blood Count', category: 'Hematology', description: 'Blood test to evaluate overall health', price: 500 });
            await testAPI.createTest({ testId: 'T002', testName: 'Lipid Profile', category: 'Biochemistry', description: 'Test to measure cholesterol levels', price: 800 });
            await testAPI.createTest({ testId: 'T003', testName: 'Thyroid Function Test', category: 'Endocrinology', description: 'Test to check thyroid function', price: 600 });
            await testAPI.createTest({ testId: 'T004', testName: 'Liver Function Test', category: 'Biochemistry', description: 'Test to evaluate liver health', price: 700 });
            await testAPI.createTest({ testId: 'T005', testName: 'Kidney Function Test', category: 'Biochemistry', description: 'Test to evaluate kidney health', price: 600 });
            await testAPI.createTest({ testId: 'T006', testName: 'HbA1c', category: 'Biochemistry', description: 'Test to measure average blood sugar levels over past 3 months', price: 400 });
            await testAPI.createTest({ testId: 'T007', testName: 'Electrolyte Panel', category: 'Biochemistry', description: 'Test to measure electrolytes in the blood', price: 350 });
            await testAPI.createTest({ testId: 'T008', testName: 'Urine Albumin', category: 'Clinical Pathology', description: 'Test to detect protein in urine for kidney health', price: 300 });

            await patientAPI.createPatient({ patientId: 'P001', name: 'John Doe', age: 45, gender: 'Male', condition: 'Diabetes' });
            await medicalHistoryAPI.createMedicalHistory({ patientId: 'P001', conditions: ['Diabetes', 'Hypertension'], allergies: ['Penicillin'], medications: ['Metformin', 'Lisinopril'] });
            await orderAPI.createOrder({ orderId: 'ORD001', patientId: 'P001', tests: ['Complete Blood Count'], status: 'pending' });

            await loadInitialData();
        } catch (err) {
            console.error('Error creating sample data:', err);
            setError('Failed to create sample data');
        } finally {
            setLoading(false);
        }
    };

    // ── Render helpers ───────────────────────────────────────────────────────
    const renderReasons = (rec) => {
        const reasons = rec.reasons || (rec.reason ? [rec.reason] : []);
        if (reasons.length === 0) return null;

        if (reasons.length === 1) {
            return <p className="reason-text">{reasons[0]}</p>;
        }

        return (
            <ul className="reasons-list">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
        );
    };

    // Use the freshly loaded order for "Current Tests" display
    const currentOrderDisplay = orders.find(o => o.orderId === selectedOrder?.orderId) || selectedOrder;
    const activeScenario = DEMO_SCENARIOS.find(s => s.id === activeScenarioId);

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="home">
            <main className="container">
                {initialLoading ? (
                    <section className="card">
                        <p>Loading data...</p>
                    </section>
                ) : (
                    <>
                        {error && (
                            <section className="card error">
                                <p>{error}</p>
                                <button onClick={() => setError(null)}>Dismiss</button>
                            </section>
                        )}



                        {patients.length === 0 && orders.length === 0 ? (
                            <section className="card">
                                <h2>No Data Available</h2>
                                <p>The database is currently empty. Select a demo scenario from the dropdown above, or create sample data below.</p>
                                <div className="actions">
                                    <button onClick={createSampleData} disabled={loading}>
                                        {loading ? 'Creating Data...' : 'Create Sample Data'}
                                    </button>
                                    <button className="secondary" onClick={loadInitialData} disabled={loading}>
                                        Refresh Data
                                    </button>
                                </div>
                            </section>
                        ) : (
                            <>
                                <div className="actions" style={{ marginBottom: '20px' }}>
                                    <button className="secondary" onClick={createSampleData} disabled={loading}>
                                        {loading ? 'Creating Data...' : 'Add Missing Tests'}
                                    </button>
                                </div>

                                {/* Patient Selection */}
                                <section className="card">
                                    <h2>Patient Selection</h2>

                                    {/* Demo Scenario dropdown */}
                                    <div className="demo-select-row">
                                        <label htmlFor="demo-scenario-select" className="demo-select-label">
                                            🧪 Demo Scenario:
                                        </label>
                                        <select
                                            id="demo-scenario-select"
                                            className="demo-select"
                                            value={activeScenarioId || ''}
                                            onChange={(e) => {
                                                const scenario = DEMO_SCENARIOS.find(s => s.id === e.target.value);
                                                if (scenario) setupDemoScenario(scenario);
                                            }}
                                            disabled={scenarioLoading !== null || loading}
                                        >
                                            <option value="">-- Select a demo scenario --</option>
                                            {DEMO_SCENARIOS.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    Scenario {s.number}: {s.title}
                                                </option>
                                            ))}
                                        </select>
                                        {scenarioLoading && (
                                            <span className="demo-select-loading">Setting up...</span>
                                        )}
                                    </div>

                                    {activeScenario && (
                                        <div className="scenario-hint" style={{ marginBottom: '12px' }}>
                                            💡 <strong>{activeScenario.title}:</strong> {activeScenario.hint}
                                        </div>
                                    )}

                                    {patients.length > 0 ? (
                                        <select
                                            value={selectedPatient?.patientId || ''}
                                            onChange={(e) => {
                                                setSelectedPatient(patients.find(p => p.patientId === e.target.value));
                                                setActiveScenarioId(null);
                                            }}
                                        >
                                            {patients.map(patient => (
                                                <option key={patient.patientId} value={patient.patientId}>
                                                    {patient.name} (ID: {patient.patientId})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p>No patients available. Load a demo scenario above.</p>
                                    )}

                                    {selectedPatient && (
                                        <div className="info">
                                            <strong>{selectedPatient.name}</strong>
                                            <span>Age: {selectedPatient.age}</span>
                                            <span>Gender: {selectedPatient.gender}</span>
                                            <span>Condition: {selectedPatient.condition || 'None'}</span>
                                        </div>
                                    )}
                                </section>

                                {/* Order Selection */}
                                <section className="card">
                                    <h2>Order Selection</h2>

                                    {orders.length > 0 ? (
                                        <select
                                            value={selectedOrder?.orderId || ''}
                                            onChange={(e) => {
                                                setSelectedOrder(orders.find(o => o.orderId === e.target.value));
                                                setShowRecommendation(false);
                                                setOrderUpdated(false);
                                                setLastAddedTest(null);
                                                setActiveScenarioId(null);
                                            }}
                                        >
                                            {orders.map(order => (
                                                <option key={order.orderId} value={order.orderId}>
                                                    Order {order.orderId} - {order.status}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p>No orders available. Load a demo scenario above.</p>
                                    )}

                                    {currentOrderDisplay && (
                                        <div className="order">
                                            <h3>Current Tests:</h3>
                                            {currentOrderDisplay.tests && currentOrderDisplay.tests.length > 0 ? (
                                                currentOrderDisplay.tests.map((test, index) => (
                                                    <span key={index}>{test}</span>
                                                ))
                                            ) : (
                                                <span>No tests in order</span>
                                            )}
                                        </div>
                                    )}

                                    {selectedOrder && !showRecommendation && !orderUpdated && (
                                        <button id="analyze-order-btn" onClick={analyzeOrder} disabled={loading}>
                                            {loading ? 'Analyzing...' : 'Analyze Order'}
                                        </button>
                                    )}
                                </section>
                            </>
                        )}

                        {/* AI Recommendation Panel */}
                        {showRecommendation && analysisResult && (
                            <section className="card recommendation">
                                <h2>🤖 AI Recommendation</h2>

                                {/* Active scenario context */}
                                {activeScenario && (
                                    <div className="scenario-context-banner">
                                        🧪 <strong>{activeScenario.title}</strong> — {activeScenario.hint}
                                    </div>
                                )}

                                {/* AI fallback banner */}
                                {analysisResult.aiFallback && (
                                    <div className="ai-fallback-banner">
                                        ⚠️ AI explanation is currently unavailable. Showing rule-based recommendations.
                                    </div>
                                )}

                                {/* Summary from Gemini or default text */}
                                <div className="recommendation-message">
                                    <p>
                                        {analysisResult.aiSummary ||
                                            'Based on your profile and current order, we found the following potentially relevant tests.'}
                                    </p>
                                </div>

                                {analysisResult.recommendations && analysisResult.recommendations.length > 0 ? (
                                    <div className="recommendations-list">
                                        <h3>Recommended Tests:</h3>
                                        {analysisResult.recommendations.map((rec, index) => (
                                            <div key={index} className="recommendation-item">
                                                <strong>{rec.recommendedTest}</strong>
                                                <span className={`priority-badge priority-${rec.priority}`}>
                                                    Priority: {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                                                </span>
                                                {renderReasons(rec)}
                                                <button
                                                    id={`add-test-${index}`}
                                                    onClick={() => requestAddTest(rec.recommendedTest)}
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Adding...' : `Add ${rec.recommendedTest}`}
                                                </button>
                                            </div>
                                        ))}
                                        <div className="actions">
                                            <button
                                                id="continue-without-adding"
                                                className="secondary"
                                                onClick={continueWithoutAdding}
                                                disabled={loading}
                                            >
                                                No, Continue Without Adding
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="no-gaps-message">
                                            No additional tests were identified based on the available information.
                                        </p>
                                        <div className="actions">
                                            <button
                                                id="continue-button"
                                                onClick={continueWithoutAdding}
                                                disabled={loading}
                                            >
                                                Continue
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Success State */}
                        {orderUpdated && lastAddedTest && (
                            <section className="success">
                                ✓ <strong>{lastAddedTest}</strong> has been added to order <strong>{selectedOrder?.orderId}</strong>.
                                {activeScenario && (
                                    <div className="success-scenario-note">
                                        Scenario {activeScenario.number} verified: test addition confirmed and order updated.
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </main>

            {/* Confirmation Dialog Overlay */}
            {confirmDialog.open && (
                <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
                    <div className="confirm-dialog">
                        <h3 id="confirm-dialog-title">Confirm Test Addition</h3>
                        <p>Are you sure you want to add <strong>{confirmDialog.testName}</strong> to your order?</p>
                        <div className="confirm-actions">
                            <button id="confirm-add-btn" onClick={confirmAddTest} disabled={loading}>
                                {loading ? 'Adding...' : 'Confirm & Add'}
                            </button>
                            <button id="cancel-add-btn" className="secondary" onClick={cancelAddTest} disabled={loading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;