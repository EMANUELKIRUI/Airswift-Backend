# Airswift Backend

A centralized job portal backend where admins manage jobs and users apply for Canada-based positions.

## Features

- **Admin-controlled job postings** for Canada immigration jobs
- **User registration and profiles** with CV upload
- **Application tracking** with status updates
- **Interview scheduling** and notifications
- **Payment integration** for interview fees and visa processing
- **Email notifications** for status updates

## Tech Stack

- **Node.js** with Express
- **PostgreSQL** with Sequelize ORM
- **JWT** for authentication
- **Multer** for file uploads
- **Nodemailer** for emails
- **Redis** for background jobs (planned)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Configure environment variables in `.env`
5. Run database sync: `npm start` (syncs on startup)
6. Start server: `npm start`

## Environment Variables

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASS`
- `SENDINBLUE_API_KEY` (e.g. `your_sendinblue_api_key_here`)
- `SENDINBLUE_SMTP_USER` (optional, default `apikey`)
- `PORT`

## Default Admin Credentials

A default admin user is created on startup if it does not already exist:

- Email: `emanuelkirui1@gmail.com`
- Password: `Ee0795565529@`

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Profile
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/upload-cv`

### Jobs
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/admin/jobs` (admin)
- `PUT /api/admin/jobs/:id` (admin)
- `DELETE /api/admin/jobs/:id` (admin)

### Applications
- `POST /api/applications/apply`
- `GET /api/applications/my`
- `GET /api/admin/applications` (admin)
- `PUT /api/admin/applications/:id/status` (admin)

### Interviews
- `POST /api/admin/interviews/schedule` (admin)
- `GET /api/interviews/my`

### Payments
- `POST /api/payment/initiate`
- `POST /api/payment/verify`

## Workflows

### Job Seeker
1. Register and complete profile with CV
2. Browse active jobs
3. Apply for jobs
4. Get shortlisted and pay interview fee (3)
5. Attend interview
6. Get hired and pay visa fee (30,000 KSH)

### Admin
1. Create job postings with expiry dates
2. Review applications
3. Schedule interviews (triggers notifications)
4. Update application statuses

## Background Jobs (Planned)

- Auto-close expired jobs
- Send interview reminders
- Asynchronous email sending

## Deployment

- Backend: AWS EC2 / Render
- Database: AWS RDS PostgreSQL
- Storage: AWS S3 for files

## Security

- JWT authentication
- Password hashing
- Rate limiting
- Input validation
- File type restrictions (PDF only)