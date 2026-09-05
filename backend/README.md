# Patient Test Panel Backend

Backend API for the Patient Test Panel Assistant - an AI-powered medical test recommendation system.

## Features

- **Patient Management**: CRUD operations for patient profiles
- **Order Management**: Test order creation and updates
- **Test Catalog**: Available medical tests database
- **Medical History**: Patient medical records
- **Gap Analysis**: Rule-based test recommendation engine
- **AI Agent**: Gemini API integration for intelligent recommendations
- **Patient Confirmation**: YES/NO workflow for test additions
- **Order Updates**: Validated order modifications after confirmation
- **Agent Logging**: Comprehensive audit trail for all agent activities

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- Gemini AI API
- LangChain.js

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Gemini API Key (optional - runs in mock mode without it)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/patient-test-panel
GEMINI_API_KEY=your_gemini_api_key_here
```

## Running the Backend

### Development Mode

Start the server:
```bash
node src/index.js
```

Or with nodemon for auto-restart:
```bash
nodemon src/index.js
```

The server will start at `http://localhost:3001`

### Production Mode

For production, you may want to:
1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2
3. Configure proper MongoDB connection string for production

## API Endpoints

### Patient APIs
- `GET /patients` - Get all patients
- `GET /patients/:id` - Get patient by ID
- `POST /patients` - Create new patient

### Order APIs
- `GET /orders` - Get all orders
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create new order
- `PUT /orders/:id` - Update order
- `POST /orders/:id/add-test` - Add test to order

### Test APIs
- `GET /tests` - Get all available tests
- `GET /tests/:id` - Get test by ID
- `POST /tests` - Create new test

### Medical History APIs
- `GET /medical-history/:id` - Get medical history by patient ID
- `POST /medical-history` - Create medical history
- `PUT /medical-history/:id` - Update medical history

### Gap Analysis APIs
- `GET /gap-analysis/order/:orderId` - Analyze gaps for specific order
- `GET /gap-analysis/patient/:patientId` - Analyze gaps for patient orders
- `GET /gap-analysis/rules` - Get recommendation rules

### Agent APIs
- `POST /agent/analyze/:orderId` - Analyze order with AI agent
- `POST /agent/confirm/initiate/:orderId` - Initiate confirmation session
- `POST /agent/confirm/:sessionId` - Process patient confirmation
- `GET /agent/confirm/:sessionId/status` - Get session status
- `GET /agent/status` - Check agent initialization status

### Agent Logs APIs
- `GET /agent-logs/session/:sessionId` - Get logs by session
- `GET /agent-logs/order/:orderId` - Get logs by order
- `GET /agent-logs/patient/:patientId` - Get logs by patient
- `GET /agent-logs/session/:sessionId/summary` - Get session summary
- `GET /agent-logs/recent` - Get recent logs
- `GET /agent-logs/event/:eventType` - Get logs by event type
- `GET /agent-logs/date-range` - Get logs by date range
- `GET /agent-logs/statistics` - Get agent statistics

## Mock Data

The system uses mock data files located in `../mock-data/`:
- `patients.json` - Sample patient profiles
- `orders.json` - Sample test orders
- `tests.json` - Available medical tests
- `medical-history.json` - Sample medical histories
- `recommendation-rules.json` - Test recommendation rules

## AI Agent Configuration

The AI agent can run in two modes:

### Mock Mode (Default)
- Runs without Gemini API key
- Uses rule-based gap analysis
- Provides recommendations based on medical conditions and ordered tests

### AI Mode
- Requires valid `GEMINI_API_KEY` in `.env`
- Uses Gemini Pro for intelligent analysis
- Provides enhanced recommendations with AI insights

## Project Structure

```
backend/
├── src/
│   ├── agents/           # AI agent implementation
│   ├── controllers/      # API controllers
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── tools/           # Agent tools
│   ├── utils/           # Utility functions
│   ├── conn.js          # Database connection
│   └── index.js         # Server entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies
└── README.md           # This file
```

## Database Schema

### Patient
- patientId (string)
- name (string)
- age (number)
- gender (string)
- condition (string)

### Order
- orderId (string)
- patientId (string)
- tests (array of strings)
- status (string: pending/confirmed/completed/cancelled)
- createdAt (date)
- updatedAt (date)

### Test
- testName (string)
- category (string)
- description (string)
- price (number)

### MedicalHistory
- patientId (string)
- conditions (array of strings)
- allergies (array of strings)
- medications (array of strings)

### AgentAuditLog
- sessionId (string)
- orderId (string)
- patientId (string)
- eventType (string)
- eventData (object)
- recommendations (array)
- patientResponse (string)
- actionTaken (string)
- timestamp (date)

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check `MONGO_URI` in `.env`
- Verify MongoDB credentials

### Port Already in Use
- Change `PORT` in `.env`
- Kill process using port 3001: `lsof -ti:3001 | xargs kill`

### AI Agent Not Initializing
- Check `GEMINI_API_KEY` in `.env`
- Verify API key is valid
- System will run in mock mode if key is missing

## Development Notes

- The backend uses MongoDB for data persistence
- Mock data is loaded from JSON files in the parent directory
- All order updates require patient confirmation
- Comprehensive logging tracks all agent activities
- Gap analysis uses rule-based matching for recommendations
