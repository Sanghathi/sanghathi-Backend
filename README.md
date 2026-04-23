# Sanghathi Backend

![Sanghathi App Logo](public/logo.jpeg)

Sanghathi Backend is the service layer of the Sanghathi mentoring platform. It manages authentication, role-based access, student lifecycle data, mentoring records, reporting APIs, and integrations used by the frontend.

## Project Report

### 1. Project Title
Sanghathi: AI-Powered Mentoring Tool (Backend Module)

### 2. Abstract
This project implements a scalable backend system for institutional mentoring workflows. It exposes REST APIs for authentication, user management, academic records, attendance, IAT and TYL scores, communication features, and notifications. The backend is designed to provide secure, consistent, and auditable data services for all role-based frontend modules.

### 3. Problem Statement
Educational mentoring data is often fragmented across spreadsheets and disconnected systems. This leads to poor traceability, delayed decisions, and inconsistent student records. Sanghathi Backend resolves this by centralizing data and business logic through structured APIs and database models.

### 4. Objectives
- Provide secure authentication and authorization for all user roles.
- Expose robust APIs for student and mentorship data operations.
- Maintain consistent data models for academic and performance records.
- Enable report and analytics workflows through clean service endpoints.
- Support integration-ready architecture for notifications and AI-assisted features.

### 5. Scope
- Auth and role management services.
- Student, mentor, and admin domain APIs.
- Attendance, IAT, TYL, MOOC, and mini-project data endpoints.
- Conversation, thread, and notification modules.
- File upload and bulk data operation support.
- Deployment-ready Node.js service configuration.

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Dotenv
- Swagger

## Core Modules

1. **Authentication and authorization**: JWT login, password management, and protected role-based access.
2. **User and role management**: Admin-controlled user and role workflows.
3. **Student lifecycle APIs**: Profile, academic, and semester-linked records.
4. **Score and performance APIs**: IAT, TYL, attendance, MOOC, and mini-project endpoints.
5. **Communication services**: Thread, message, conversation, and notification APIs.
6. **Upload and data tools**: File upload, bulk update, and rollback-capable operational flows.
7. **API documentation and integration**: Swagger support and service-level extensibility.

## Project Outcome

The Sanghathi Backend provides a stable and scalable API foundation for mentoring operations, enabling accurate data management, better process visibility, and reliable integration with the frontend platform.

## Contributors

- shovan-mondal
- monu564100
- SUJAY-HK
- vsuryacharan
- Kulsum06
- Sai-Emani25
- Kethan VR

See [contribute.md](contribute.md) for contribution standards.

## Doubts or Support

If you have any doubt about APIs, setup, or backend modules:

1. Open an issue with title prefix `Question:`.
2. Mention endpoint path and HTTP method.
3. Add request payload, response/error, and reproduction steps.

## License

This project is licensed under the [MIT License](LICENSE).