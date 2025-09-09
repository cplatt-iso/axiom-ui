# Axiom Flow - Frontend

A comprehensive React-based frontend for the Axiom Flow enterprise medical imaging platform, providing healthcare professionals and administrators with complete DICOM workflow management capabilities.

## Overview

Axiom Flow is a production-ready medical imaging workflow management platform that handles enterprise-scale DICOM data processing, routing, and compliance. The frontend provides intuitive interfaces for configuration, monitoring, analytics, and administration of complex healthcare IT infrastructure.

## Core Features

### 🏥 **Medical Imaging Dashboard**
- **Real-time System Health:** Monitor database, message broker, workers, and all DICOM services
- **DICOM Service Status:** DIMSE Listeners, DICOMweb Pollers, DIMSE Q/R Pollers with live metrics
- **Storage Analytics:** Disk usage, throughput monitoring, and capacity planning
- **Performance Metrics:** Query response times, success rates, and system efficiency

### 🔐 **Enterprise Authentication & Authorization**
- **Google OAuth 2.0:** Seamless enterprise SSO integration
- **Role-Based Access Control (RBAC):** Admin, User, and Superuser roles
- **API Key Management:** Generate, manage, and rotate API keys for system integrations
- **Protected Routes:** Granular access control for sensitive administrative functions

### ⚙️ **Comprehensive Configuration Management**

#### **DICOM Data Sources (Scrapers)**
- **DICOMweb Sources:** Configure QIDO-RS/WADO-RS endpoints with authentication
- **DIMSE Q/R Sources:** Set up DICOM Query/Retrieve SCU connections with TLS support
- **Google Healthcare API:** Integration with Google Cloud Healthcare DICOM stores
- **Advanced Authentication:** Bearer tokens, API keys, mutual TLS, and custom headers

#### **DICOM Listeners & Endpoints**
- **DIMSE SCP Listeners:** Configure DICOM C-STORE/C-FIND/C-MOVE listeners
- **STOW-RS Endpoints:** RESTful DICOM storage service configuration
- **JSON API Endpoints:** Custom JSON-based DICOM ingestion
- **TLS Configuration:** Full certificate management and secure transport

#### **Intelligent Scheduling System**
- **Cron-based Scheduling:** Flexible time-based automation
- **Polling Configuration:** Automated DICOM source polling with overlap detection
- **Batch Processing:** Configure bulk data processing windows
- **Retry Policies:** Configurable retry logic with exponential backoff

#### **Multi-Destination Storage Backends**
- **Filesystem Storage:** Local and network-attached storage
- **DICOM C-STORE:** Forward to downstream PACS systems
- **Google Cloud Storage:** Cloud-native object storage
- **Google Healthcare API:** Direct integration with Google's DICOM service
- **STOW-RS Destinations:** RESTful DICOM storage targets

### 🔄 **Advanced Rule Engine**
- **Visual Rule Builder:** Drag-and-drop rule creation interface
- **DICOM Tag Matching:** Complex criteria based on DICOM headers
- **Tag Modifications:** Anonymization, pseudonymization, and header manipulation
- **Conditional Routing:** Route studies based on modality, facility, or custom criteria
- **Rule Wizard:** Guided setup for common use cases
- **Ruleset Management:** Organize rules into logical groupings with inheritance

### 🗃️ **Enterprise Data Management**

#### **Multi-Source Data Browser**
- **Unified Search:** Query across DICOMweb, DIMSE Q/R, and Google Healthcare sources
- **Parallel Processing:** Execute queries across multiple sources simultaneously
- **Advanced Filtering:** Filter by patient, study, series, modality, date ranges
- **Instance-Level Detail:** Full DICOM tag inspection and metadata display
- **Export Capabilities:** Download search results and DICOM metadata

#### **Crosswalk Data Integration**
- **External Data Sources:** Connect to HL7 FHIR, databases, and custom APIs
- **Schema Mapping:** Visual mapping between external data and DICOM tags
- **Data Synchronization:** Automated updates from external systems
- **Connection Testing:** Validate connectivity and data access

### 🏥 **Healthcare Infrastructure Management**

#### **Facility & Modality Configuration**
- **Multi-Facility Support:** Manage multiple healthcare facilities
- **Modality Registration:** Configure CT, MRI, X-Ray, Ultrasound, and custom modalities
- **Facility-Specific Routing:** Route data based on source facility
- **Equipment Tracking:** Monitor imaging equipment status and utilization

#### **Query Spanning System**
- **Enterprise DICOM Queries:** Span queries across multiple PACS systems
- **Source Aggregation:** Combine results from multiple DICOM sources
- **Deduplication Engine:** Intelligent duplicate detection and removal
- **Performance Analytics:** Monitor query performance across all sources
- **Service Management:** Control and monitor spanning services

### 📊 **Comprehensive Analytics & Monitoring**

#### **Advanced Log Management**
- **Elasticsearch Integration:** Centralized logging with powerful search
- **Log Retention Policies:** Automated tiering (Hot/Warm/Cold) with HIPAA compliance
- **Compliance Monitoring:** Track retention policy effectiveness
- **Storage Optimization:** Automatic log lifecycle management
- **Audit Trails:** Complete medical imaging audit history

#### **Exception Management**
- **DICOM Exception Tracking:** Monitor and resolve processing failures
- **Hierarchical Error Display:** Organize exceptions by study/series/instance
- **Bulk Actions:** Resolve multiple exceptions simultaneously
- **Retry Management:** Automated and manual retry capabilities
- **Root Cause Analysis:** Detailed error reporting and resolution tracking

#### **System Analytics Dashboard**
- **Storage Analytics:** Multi-tier storage utilization and trends
- **Ingestion Metrics:** Data processing rates and throughput analysis
- **Service Performance:** Response times, success rates, and availability
- **Compliance Reporting:** HIPAA compliance status and policy effectiveness

### 🔧 **System Administration**

#### **Runtime Configuration Management**
- **Live Settings Updates:** Modify system settings without restarts
- **Category-Based Organization:** Group settings by function (DICOM, AI, Storage)
- **Configuration Validation:** Real-time input validation and error checking
- **Backup & Restore:** Configuration versioning and rollback capabilities

#### **User & Role Management**
- **User Administration:** Create, modify, and deactivate user accounts
- **Role Assignment:** Assign and modify user roles and permissions
- **Activity Monitoring:** Track user actions and system access
- **Security Auditing:** Comprehensive security event logging

#### **AI & Machine Learning Integration**
- **OpenAI Configuration:** Integrate with OpenAI services for image analysis
- **Vertex AI Support:** Google Cloud AI/ML pipeline integration
- **Custom AI Prompts:** Configure AI analysis prompts for medical imaging
- **Model Management:** Deploy and manage custom ML models

### 📋 **Medical Workflow Management**

#### **Order Management System**
- **DICOM Worklists:** Manage imaging orders and scheduling
- **Status Tracking:** Monitor order completion and delivery
- **Priority Management:** Handle urgent and routine imaging orders
- **Integration Support:** Connect with RIS/HIS systems

#### **Inventory Management**
- **DICOM Asset Tracking:** Monitor and catalog DICOM studies
- **Storage Utilization:** Track storage consumption by facility/modality
- **Data Lifecycle:** Manage study retention and archival
- **Compliance Tracking:** Ensure data retention meets regulatory requirements

#### **Experimental Features**
- **System Logs:** Advanced system logging and monitoring (Admin-only)
- **Beta Features:** Access to cutting-edge functionality
- **Research Tools:** Specialized tools for medical imaging research
- **Development APIs:** Access to experimental APIs and integrations

## Technical Architecture

### **Frontend Stack**
- **React 18+** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with custom medical imaging themes
- **Shadcn UI** for consistent, accessible components
- **TanStack Query** for intelligent server state management
- **React Hook Form + Zod** for bulletproof form validation
- **React Router v6** with nested routing and guards

### **Medical Imaging Support**
- **DICOM Standards Compliance:** Full DICOM 3.0 standard support
- **HL7 FHIR Integration:** Healthcare interoperability standards
- **HIPAA Compliance:** Built-in privacy and security controls
- **Multi-Modality Support:** CT, MRI, X-Ray, Ultrasound, PET, Nuclear Medicine
- **Enterprise Scalability:** Designed for hospital and health system scale

### **Security & Compliance**
- **End-to-End Encryption:** TLS 1.3 for all communications
- **OAuth 2.0 + JWT:** Industry-standard authentication
- **RBAC Authorization:** Granular permission system
- **Audit Logging:** Complete activity tracking
- **Data Governance:** Automated retention and deletion policies

## Project Structure

```
src/
├── components/
│   ├── ui/                     # Shadcn UI components
│   ├── log-management/         # Log analytics & retention
│   ├── exceptions/             # Exception handling UI
│   ├── orders/                 # Order management
│   ├── rule-form/              # Rule engine interfaces
│   ├── rule-wizard/            # Guided rule creation
│   ├── spanner/                # Query spanning system
│   └── system-config/          # System configuration
├── context/
│   └── AuthContext.tsx         # Authentication state
├── dicom/
│   └── dictionary.ts           # DICOM tag definitions
├── hooks/
│   └── useOrderEvidence.ts     # Medical workflow hooks
├── pages/
│   ├── *Page.tsx              # 74+ specialized pages
│   ├── *Layout.tsx            # Nested route layouts
│   └── *ConfigPage.tsx        # Configuration interfaces
├── schemas/                    # Zod validation schemas
│   ├── dicom*.ts              # DICOM-specific schemas
│   ├── logManagement*.ts      # Log management schemas
│   └── system.ts              # System configuration
├── services/
│   └── api.ts                 # Comprehensive API client
├── types/                     # TypeScript definitions
└── utils/                     # Medical imaging utilities
```

## Development

### Prerequisites
- **Node.js 18+** (20+ recommended)
- **npm or yarn**
- **Access to backend API** (FastAPI-based medical imaging platform)

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## API Integration

The frontend integrates with a comprehensive FastAPI backend providing:

- **DICOM Processing APIs:** Complete DICOM 3.0 standard support
- **Healthcare Integrations:** HL7 FHIR, RIS/HIS connectivity
- **AI/ML Services:** OpenAI and Vertex AI integration
- **Analytics Engine:** Elasticsearch-based analytics
- **Security Services:** OAuth 2.0, RBAC, audit logging
- **Configuration Management:** Runtime system configuration
- **Monitoring APIs:** Real-time system health and metrics

## Production Deployment

### Docker Support
```bash
# Build production image
docker build -t axiom-frontend .

# Run container
docker run -p 80:80 axiom-frontend
```

### Environment Configuration
```bash
# Production environment variables
VITE_API_BASE_URL=https://api.axiom.healthcare
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_ENVIRONMENT=production
```

### Health & Monitoring
- **Health Check Endpoint:** `/health`
- **Build Info:** `/build-info`
- **Performance Monitoring:** Integrated with backend telemetry

## Healthcare Compliance

### HIPAA Compliance
- **Data Encryption:** All PHI encrypted in transit and at rest
- **Access Controls:** Role-based access with audit trails
- **Data Retention:** Automated compliance with retention policies
- **Audit Logging:** Complete activity tracking and reporting

### DICOM Conformance
- **DICOM 3.0 Standard:** Full compliance with medical imaging standards
- **SOP Class Support:** Comprehensive imaging modality support
- **Transfer Syntax:** All standard and compressed transfer syntaxes
- **Character Sets:** Full international character set support

### Security Features
- **Multi-Factor Authentication:** Optional MFA for enhanced security
- **Session Management:** Secure session handling with automatic timeout
- **API Rate Limiting:** Protection against abuse and DoS attacks
- **Input Validation:** Comprehensive input sanitization and validation

## Contributing

Please refer to our [Contributing Guidelines](CONTRIBUTING.md) for development standards, testing requirements, and submission processes.

## License

Copyright © 2024 Axiom Healthcare Systems. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
