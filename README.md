# Barangay Document Issuance System

A modern, QR code-based document issuance system for Philippine barangays built with React, Supabase, and Google Drive integration.

![System Preview](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Barangay+Document+System)

## 🌟 Features

### Core Functionality
- **QR Code-Based Identification**: Fast resident identification using QR codes
- **Multi-Role Authentication**: Role-based access control for Admin, Clerk, and Record Keeper
- **Document Template Management**: Customizable document templates with variable substitution
- **Resident Enrollment**: Complete resident information management with QR code generation
- **Email Integration**: Automatic QR code delivery to residents' emails
- **Mobile QR Scanning**: Dedicated mobile interface for scanning and requesting documents
- **Cloud Storage**: Integration with Google Drive for document storage
- **Audit Logging**: Complete activity tracking for security and compliance

### User Roles
1. **System Administrator**
   - Full system access
   - User management
   - System settings configuration
   - Template management
   - Audit log review

2. **Barangay Clerk**
   - Process document requests
   - Generate documents
   - Upload to Google Drive
   - Release documents

3. **Record Keeper**
   - Resident enrollment
   - QR code generation
   - Resident information management
   - View document requests

## 🎨 Design Features

- **Modern Blue Theme**: Professional, ergonomic design with blue color palette
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Smooth Animations**: Polished user experience with thoughtful micro-interactions
- **Accessible Interface**: WCAG-compliant design for inclusive access

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern UI library
- **React Router DOM**: Client-side routing
- **Vite**: Fast build tool and dev server
- **Lucide React**: Beautiful icon library

### Backend & Services
- **Supabase**: PostgreSQL database with real-time capabilities
- **Google Drive API**: Cloud file storage
- **SMTP**: Email delivery for QR codes

### Libraries
- **qrcode.react**: QR code generation
- **html5-qrcode**: QR code scanning
- **jsPDF**: PDF document generation
- **date-fns**: Date manipulation
- **react-hot-toast**: Toast notifications

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm
- **Supabase Account** (free tier available)
- **Google Cloud Platform Account** (for Drive API)
- **Gmail Account** (for SMTP, or alternative email service)

## 🚀 Quick Start

### 1. Clone or Download the Repository

```bash
# Create project directory
mkdir barangay-doc-system
cd barangay-doc-system
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to SQL Editor in your Supabase dashboard
3. Copy and run the database schema from `INSTALLATION_GUIDE.md`
4. Note your Project URL and Anon Key from Settings > API

### 3. Configure Google Drive API

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Download credentials JSON

### 4. Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install all packages
npm install
```

### 5. Configure Environment Variables

Create a `.env` file in the frontend directory:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Drive (optional but recommended)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

# Email (optional)
VITE_SMTP_HOST=smtp.gmail.com
VITE_SMTP_PORT=587
VITE_SMTP_USER=your_email@gmail.com
VITE_SMTP_PASS=your_app_specific_password

# Application
VITE_APP_NAME=Barangay Document System
VITE_APP_URL=http://localhost:5173
```

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 7. First Login

Use the default admin credentials:
- **Email**: admin@barangay.local
- **Password**: Admin@123

⚠️ **Important**: Change the default password immediately after first login!

## 📁 Project Structure

```
barangay-doc-system/
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── layout/      # Layout components (Navbar, Sidebar)
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── residents/   # Resident management components
│   │   │   ├── documents/   # Document components
│   │   │   └── common/      # Reusable components
│   │   ├── pages/           # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ResidentsPage.jsx
│   │   │   ├── DocumentRequestsPage.jsx
│   │   │   ├── DocumentTemplatesPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── QRScanPage.jsx
│   │   ├── services/        # API and utility services
│   │   │   ├── supabaseClient.js
│   │   │   ├── emailService.js
│   │   │   ├── gdriveService.js
│   │   │   └── documentGenerator.js
│   │   ├── utils/           # Utility functions
│   │   │   └── qrCodeUtils.js
│   │   ├── context/         # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── SettingsContext.jsx
│   │   ├── App.jsx          # Main App component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── .env                 # Environment variables
│   ├── package.json         # Dependencies
│   └── vite.config.js       # Vite configuration
├── INSTALLATION_GUIDE.md    # Detailed installation guide
└── README.md               # This file
```

## 🔄 System Workflow

### Resident Enrollment Flow
1. Record Keeper logs in
2. Navigate to Residents > Add New Resident
3. Fill in resident information
4. System generates unique QR code
5. QR code sent to resident's email
6. Resident receives and saves QR code

### Document Request Flow
1. Resident presents QR code at barangay office
2. Staff scans QR code using mobile device
3. System retrieves resident information
4. Staff selects document type and purpose
5. Request submitted to system
6. Clerk processes request
7. System generates document using template
8. Document uploaded to Google Drive
9. Document released to resident

## 🔐 Security Features

- **Role-Based Access Control (RBAC)**: Different permissions for each user role
- **Row Level Security (RLS)**: Database-level security policies
- **Audit Logging**: All actions tracked with user, timestamp, and details
- **Password Hashing**: Secure password storage (implement bcrypt in production)
- **Session Management**: Automatic session timeout
- **HTTPS Required**: Enforce secure connections in production

## 📊 Database Schema

### Main Tables
- **users**: System users with role-based access
- **residents**: Barangay resident information
- **document_templates**: Customizable document templates
- **document_requests**: Document request tracking
- **system_settings**: Configuration settings
- **audit_logs**: Activity tracking

## 🎯 User Guide

### For Administrators
1. **System Configuration**: Update barangay information, logo, and settings
2. **User Management**: Create and manage user accounts
3. **Template Management**: Create and customize document templates
4. **Monitor Activity**: Review audit logs and system usage

### For Record Keepers
1. **Enroll Residents**: Add new residents to the system
2. **Generate QR Codes**: Create and send QR codes to residents
3. **Update Information**: Maintain accurate resident records
4. **Search Residents**: Find residents quickly using various filters

### For Clerks
1. **Process Requests**: Review and approve document requests
2. **Generate Documents**: Create documents using templates
3. **Upload to Drive**: Store documents in Google Drive
4. **Release Documents**: Mark documents as released

## 🔧 Customization

### Adding New Document Templates

1. Login as Administrator
2. Go to Templates > Add New Template
3. Enter template details
4. Use variables in format: `{{variable_name}}`
5. Available variables:
   - `{{full_name}}`, `{{age}}`, `{{address}}`
   - `{{date_issued}}`, `{{purpose}}`
   - See full list in `documentGenerator.js`

### Modifying the UI Theme

Edit `index.css` to customize colors:
```css
:root {
  --primary-600: #2563eb;  /* Change primary color */
  --primary-700: #1d4ed8;  /* Change primary dark */
  /* ... other color variables */
}
```

## 📱 Mobile Scanning

Access the mobile QR scanner at: `http://your-domain.com/scan`

This page is optimized for mobile devices and provides:
- Camera-based QR code scanning
- Resident information display
- Document type selection
- Request submission

## 🌐 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts to deploy

### Deploy to Netlify

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables

### Deploy to Custom Server

1. Build the project: `npm run build`
2. Upload `dist/` folder to your server
3. Configure web server (nginx/Apache) to serve the files
4. Ensure environment variables are set

## 🐛 Troubleshooting

### QR Code Not Generating
- Check if `qrcode.react` is installed
- Verify resident data is complete
- Check browser console for errors

### Email Not Sending
- Verify SMTP credentials in `.env`
- Enable "Less secure app access" for Gmail
- Use app-specific password
- Check spam/junk folder

### Database Connection Failed
- Verify Supabase URL and key
- Check if Supabase project is active
- Review network/firewall settings

### Google Drive Upload Failed
- Verify OAuth credentials
- Ensure Drive API is enabled
- Check service account permissions

## 📄 License

This system is for official barangay use only. Modify and distribute according to your local government's policies.

## 🤝 Support

For issues, questions, or contributions:
1. Check the `INSTALLATION_GUIDE.md` for detailed setup instructions
2. Review the troubleshooting section above
3. Contact your system administrator

## 🎓 Credits

Built with modern web technologies:
- React Team for React
- Supabase Team for the database platform
- Google for Drive API
- Open source community for various libraries

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Maintained by**: Your Barangay IT Team

## 🚦 Getting Started Checklist

- [/] Install Node.js and npm
- [/] Create Supabase account and project
- [/] Set up Google Cloud Platform project
- [ ] Clone/download project files
- [ ] Install dependencies with `npm install`
- [ ] Configure `.env` file
- [ ] Run database migration in Supabase
- [ ] Start development server
- [ ] Login with default credentials
- [ ] Change default password
- [ ] Configure system settings
- [ ] Create user accounts
- [ ] Test resident enrollment
- [ ] Test QR code generation
- [ ] Test document request flow
- [ ] Deploy to production

---

**Ready to revolutionize your barangay's document processing? Let's get started! 🚀**