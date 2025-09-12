# SIM Inventory Management System

A comprehensive, professional React application for managing SIM card inventory and lifecycle operations. Built with modern technologies and enterprise-grade security.

## 🌟 Features

### Core Functionality
- **SIM Resource Management**: Complete CRUD operations for SIM cards
- **Batch Import/Export**: CSV-based bulk operations
- **Order Management**: Create and track SIM orders with lifecycle actions
- **Advanced Search & Filtering**: Multi-criteria search with pagination
- **Real-time Statistics**: Dashboard with comprehensive analytics
- **Lifecycle Management**: Activate, suspend, terminate, and retire SIMs

### Security & Authentication
- **Keycloak Integration**: Enterprise-grade SSO authentication
- **Role-Based Access Control**: Granular permissions (sim_admin, sim_user)
- **JWT Token Management**: Automatic refresh and validation
- **Session Management**: Secure session handling

### User Experience
- **Responsive Design**: Mobile-first, works on all devices
- **Modern UI**: Ant Design components with custom styling
- **Accessibility**: WCAG compliant with keyboard navigation
- **Performance**: Optimized with React Query caching
- **Error Handling**: Comprehensive error boundaries and validation

### Technical Features
- **TypeScript**: Full type safety and IntelliSense
- **TMF Compliance**: Based on TMF Resource Inventory Management API
- **RESTful API Integration**: Swagger API integration
- **Export Capabilities**: CSV exports for all data
- **Form Validation**: Real-time validation with yup schemas

## 🏗️ Architecture

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (LoadingSpinner, ErrorBoundary)
│   └── layout/          # Layout components (MainLayout, Header, Sidebar)
├── contexts/            # React contexts (KeycloakContext)
├── pages/               # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard and analytics
│   ├── sim-resources/  # SIM resource management
│   ├── sim-orders/     # Order management
│   ├── reports/        # Reports and analytics
│   └── user/           # User profile and settings
├── routes/              # Routing configuration
├── services/            # API service layer
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── hooks/               # Custom React hooks
├── styles/              # CSS styles
└── assets/              # Static assets
```

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **UI Framework**: Ant Design 5.x
- **State Management**: React Query for server state
- **Authentication**: Keycloak JS
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router v6
- **Form Handling**: Ant Design Forms + React Hook Form
- **Validation**: Yup schemas
- **Styling**: CSS + Ant Design theme
- **Build Tool**: Create React App
- **Package Manager**: npm

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Access to Keycloak server
- Access to the TMF API endpoint

### Installation

1. **Clone and setup**:
```bash
cd sim-inventory-ui
npm install
```

2. **Configure Environment**:
Create `.env.local`:
```env
REACT_APP_API_BASE_URL=https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4
REACT_APP_KEYCLOAK_URL=https://diam.dnext-pia.com
REACT_APP_KEYCLOAK_REALM=orbitant-realm
REACT_APP_KEYCLOAK_CLIENT_ID=orbitant-ui-client
```

3. **Start Development Server**:
```bash
npm start
```

4. **Build for Production**:
```bash
npm run build
```

## 🔐 Authentication Configuration

### Keycloak Setup
The application uses the following Keycloak configuration:

```javascript
{
  realm: 'orbitant-realm',
  clientId: 'orbitant-ui-client',
  url: 'https://diam.dnext-pia.com',
}
```

### Required Roles
- **sim_admin**: Full access to all features
- **sim_user**: Limited access for order creation and viewing
- **realm roles**: Additional system-level permissions

### RBAC Implementation
- Route-level protection with `ProtectedRoute` component
- Component-level conditional rendering
- API-level authorization through JWT tokens

## 📊 API Integration

### Base Configuration
- **Base URL**: `https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4`
- **Authentication**: Bearer token (JWT from Keycloak)
- **Content Type**: application/json
- **Error Handling**: Centralized error responses

### Key Endpoints
- `GET /resource` - List SIM resources with filtering
- `POST /resource` - Create new SIM resource
- `GET /resource/{id}` - Get SIM resource details
- `PATCH /resource/{id}` - Update SIM resource
- `DELETE /resource/{id}` - Delete SIM resource
- `POST /resource/batch` - Batch import SIMs
- `POST /resource/{id}/activate` - Activate SIM
- `POST /resource/{id}/suspend` - Suspend SIM
- `POST /resource/{id}/terminate` - Terminate SIM
- `GET /productOrder` - List orders
- `POST /productOrder` - Create order
- `GET /resource/statistics` - Get statistics

## 🎨 UI/UX Features

### Design System
- **Primary Color**: #1890ff (Ant Design blue)
- **Success**: #52c41a (green)
- **Warning**: #faad14 (orange) 
- **Error**: #ff4d4f (red)
- **Border Radius**: 6px
- **Typography**: System fonts with fallbacks

### Responsive Breakpoints
- **xs**: < 576px
- **sm**: ≥ 576px
- **md**: ≥ 768px
- **lg**: ≥ 992px
- **xl**: ≥ 1200px

### Accessibility Features
- ARIA labels and roles
- Keyboard navigation
- Focus indicators
- Screen reader support
- High contrast mode support

## 📱 Key User Flows

### 1. SIM Resource Management
1. **View All SIMs**: Browse, search, and filter SIM resources
2. **Create SIM**: Individual SIM creation with validation
3. **Batch Import**: CSV upload with preview and validation
4. **Lifecycle Actions**: Activate, suspend, terminate operations
5. **Export Data**: CSV export of filtered results

### 2. Order Management
1. **Create Order**: Multi-step order creation with SIM selection
2. **Track Orders**: Real-time order status tracking
3. **Order Details**: Comprehensive order information
4. **Cancel Orders**: Administrative order cancellation

### 3. Dashboard & Analytics
1. **Statistics Overview**: Real-time inventory statistics
2. **Status Distribution**: Visual status breakdowns
3. **Activity Timeline**: Recent changes and updates
4. **Batch Analysis**: Batch-based reporting

## 🔧 Development

### Available Scripts
- `npm start` - Development server
- `npm build` - Production build
- `npm test` - Run tests
- `npm run lint` - ESLint checking
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - TypeScript checking

### Code Quality
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks for quality gates

### Testing Strategy
- **Unit Tests**: Component-level testing with React Testing Library
- **Integration Tests**: API integration testing
- **E2E Tests**: Full user flow testing
- **Accessibility Testing**: WCAG compliance testing

## 🚀 Deployment

### Build Optimization
- Code splitting with React.lazy()
- Bundle analysis and optimization
- Asset compression and caching
- PWA capabilities (optional)

### Environment Configuration
Different configurations for:
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Optimized production build

### Docker Support (Optional)
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📋 Data Models

### SIM Resource
```typescript
interface SimResource {
  id: string;
  iccid: string;          // 19-20 digit unique identifier
  imsi?: string;          // 15 digit mobile identity
  type: 'Physical' | 'eSIM';
  status: 'Available' | 'Allocated' | 'Active' | 'Suspended' | 'Terminated' | 'Retired';
  batchId?: string;
  profileType?: 'Prepaid' | 'Postpaid';
  createdDate: string;
  lastModifiedDate: string;
}
```

### SIM Order
```typescript
interface SimOrder {
  id: string;
  orderDate: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled';
  orderItem: OrderItem[];
  description?: string;
  priority?: 'high' | 'medium' | 'low';
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Keycloak server availability
   - Verify realm and client configuration
   - Ensure user has required roles

2. **API Connection Issues**
   - Verify API endpoint URL
   - Check CORS configuration
   - Validate JWT token format

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript configuration
   - Verify all dependencies are compatible

### Performance Optimization
- Enable React Query stale-while-revalidate
- Implement virtual scrolling for large lists
- Use React.memo for expensive components
- Optimize bundle size with code splitting

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Coding Standards
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Add comprehensive documentation

## 📄 License

This project is proprietary software developed for SIM inventory management.

## 📞 Support

For technical support and questions:
- **Documentation**: Check this README and inline comments
- **Issues**: Use the issue tracker for bugs and feature requests
- **Development**: Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Minimum Node Version**: 16.0.0
node translate.js --source=en --languages=tr,de,fr --ignoreQuota
When you add credits and want full automatic translation, switch back to --overwrite (without --ignoreQuota).