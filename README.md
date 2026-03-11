# AASHA — Offline-First Health Data & Risk Flagging System

Digitizing rural healthcare workflows without requiring internet connectivity.

AASHA is an AI-assisted, offline-first health data capture and risk flagging system designed for ASHA workers operating in low-connectivity rural areas. The system converts unstructured voice or text input into structured health records and applies explainable rule-based risk indicators — without providing diagnosis or prescriptions.

Write Data → Capture Offline → Flag Risk → Sync Automatically → Enable Action.

---

## Problem

ASHA workers in rural India face operational constraints:

- Unreliable or no internet connectivity  
- Paper-based health record maintenance  
- Delayed data reporting to PHCs  
- Difficulty identifying high-risk health cases  
- Lack of real-time decision support  

Because existing digital systems assume continuous connectivity:

- Data is lost or delayed  
- Supervisors receive late updates  
- High-risk cases may not be prioritized  
- Health reporting becomes inefficient  

### Root Cause

Most digital health systems are cloud-first and form-heavy, while rural health workflows are conversation-driven and offline-dependent.

---

## Solution

AASHA transforms rural health data capture into an offline-first, structured, explainable system.

Everything works without internet.

The system:

- Accepts voice or text in local languages  
- Converts unstructured input into structured health fields  
- Applies rule-based risk flagging (no diagnosis)  
- Stores data securely offline  
- Automatically syncs when connectivity returns  
- Provides role-based dashboards  

No forced long forms.  
No constant internet requirement.  
No black-box AI decisions.

---

## System Workflow

1. ASHA visits a household  
2. Captures health details via voice or text  
3. Data stored locally (offline mode)  
4. AI structures data into standardized health fields  
5. Risk engine flags abnormal conditions  
6. When internet returns → auto sync to PHC  
7. ANM reviews structured data  
8. PHC doctor sees summarized high-risk view  

---
---

## Screenshots

### Role Selection Interface
![Role Selection](screenshots/role-selection.png)

Allows users to choose between ASHA worker and PHC staff dashboards.

---

### Patient Health Record Entry
![Add Patient](screenshots/add-patient.png)

Offline-first patient record entry with voice/text observations and automatic risk evaluation.

---

### Risk Monitoring Dashboard
![Dashboard](screenshots/dashboard.png)

PHC dashboard showing structured health records and filtering by risk severity.

---

## Installation (Development Setup)

### Prerequisites

- Node.js 18+
- Java 17+
- Maven or Gradle
- Python 3.10+
- PostgreSQL 14+
- Docker (optional for deployment)

### Clone Repository

```bash
git clone https://github.com/your-username/AASHA.git
cd AASHA
```

---

## Repository Structure

```
AASHA/
│
├── frontend/       # Offline-first PWA
├── backend/        # Spring Boot REST API
├── ai-service/     # Python NLP + Risk Engine
├── database/       # PostgreSQL schema & migrations
├── docs/           # Architecture & requirements
├── deployment/     # Docker & cloud configs
└── README.md
```

---

## Core Design Principles

- Offline-first architecture
- Rule-based risk assessment (not diagnosis)
- Explainable AI outputs
- Role-based access control
- Secure data encryption
- Rural device optimization
- Zero data loss during sync

---

## Architecture

AASHA follows a multi-service architecture:

### Client Layer (PWA)

- Progressive Web App
- IndexedDB offline storage
- Local rule engine
- Sync manager
- Language localization
- Encrypted local storage

### Backend Layer

- REST API (Spring Boot)
- Authentication service
- Case management
- Reporting engine
- Centralized rule management

### AI Service

- Speech-to-text (offline when possible)
- Entity extraction
- Structured data mapping
- Rule-based risk evaluation

### Database

- PostgreSQL
- Structured health records
- Case history tracking
- Role-based access control

---

## Core Modules

- Offline Data Capture
- Structured Data Processor
- Risk Assessment Engine
- Synchronization Manager
- Authentication Manager
- Case Manager
- Reporting Engine
- Localization Module
- Device Performance Optimizer

Each module follows a single responsibility principle.

---

## Target Users

- ASHA Workers
- ANMs (Supervisors)
- PHC Doctors
- Health Administrators

---

## Role-Based Access

### ASHA Worker
- Capture health data offline
- View patient history
- Receive risk alerts
- Track follow-ups

### ANM
- View structured records
- Filter by risk level
- Monitor ASHA performance
- Escalate cases

### PHC Doctor
- View summarized patient data
- Review high-risk cases
- Generate reports

### Administrator
- Manage users and roles
- Monitor system health
- Generate audit logs

---

## Risk Flagging Model

- Uses transparent, rule-based logic
- Assigns severity: Low / Medium / High / Critical
- Shows why a case was flagged
- Does not diagnose or prescribe

Example:

- Late pregnancy + swelling → High Risk
- Missed ANC visits → Medium Risk
- Abnormal vitals → Critical

---

## Data Synchronization

- Records marked as Pending / Synced / Failed
- Auto-sync on connectivity restoration
- Conflict resolution rules applied
- No manual upload required
- Retry logic implemented

---

## Security

- AES-256 encryption for health data
- Encrypted local storage
- Encrypted data transmission
- Role-based access control
- Audit logging
- No credentials stored in code

---

## Non-Functional Goals

- App startup < 10 seconds
- Sync completion < 5 minutes
- Offline support for 30+ days
- 99.5% uptime target
- Works on Android 8+ with 2GB RAM

---

## Tech Stack

### Frontend
- React (PWA)
- TypeScript
- IndexedDB
- Service Workers

### Backend
- Spring Boot (Java 17)
- REST API
- JWT Authentication

### AI Service
- Python
- spaCy
- Whisper (speech-to-text)
- Rule-based engine

### Database
- PostgreSQL

### Deployment
- Docker
- AWS-ready infrastructure

---

## Folder Structure Generated (Per Health Record)

Each captured record contains:

- Patient metadata
- Structured health fields
- Risk assessment results
- Follow-up tasks
- Sync status
- Timestamp & sequence number

---

## Testing Strategy

- Unit testing (core modules)
- Property-based testing
- Integration testing (offline → sync → dashboard)
- Performance testing (low-resource devices)
- Security validation

Minimum:
- 80% code coverage
- 100% coverage for security-critical modules

---

## Scalability Vision

- Multi-district deployment
- State-level reporting
- Modular health program addition
- Future ML model integration
- National rural healthcare integration

---

## Project Status

- Architecture defined
- Requirements finalized
- Monorepo structure initialized
- Ready for module-level development

---

## Authors

- Shreya Awari – [Github](https://github.com/shreyaawari28)  
- Sujal Patil – [Github](https://github.com/SujalPatil21)  
- Tejas Halvankar – [Github](https://github.com/Tejas-H01)  
- Nihal Mishra – [Github](https://github.com/NihalMishra3009)  

---

## License

MIT License
