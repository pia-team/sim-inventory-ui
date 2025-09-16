# SIM Inventory Management System

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/react-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-4.9-blue?logo=typescript&logoColor=white)
![Ant%20Design](https://img.shields.io/badge/ant--design-5-blue)

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
├── App.tsx
├── index.tsx
├── i18n.ts
├── components/
│   ├── common/          # Common components (LoadingSpinner, etc.)
│   └── layout/          # MainLayout, header/sidebar
├── contexts/
│   ├── KeycloakContext.tsx
│   └── ThemeContext.tsx
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── sim-resources/   # List, Detail, Create, BatchImport
│   ├── sim-orders/
│   ├── reports/
│   └── user/
├── routes/
│   └── AppRoutes.tsx
├── services/
│   └── api.service.ts
├── types/
│   └── sim.types.ts
├── styles/
└── utils/
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
- **Internationalization**: i18next + react-i18next (runtime loading from `public/locales`)
- **Translation Automation**: OpenAI-powered `translate.js` + GitHub Actions workflow

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
REACT_APP_KEYCLOAK_URL=https://diam.dnext-pia.com
REACT_APP_KEYCLOAK_REALM=orbitant-realm
REACT_APP_KEYCLOAK_CLIENT_ID=orbitant-ui-client
REACT_APP_REDIRECT_URI=http://localhost:3000/dashboard
OPENAI_API_KEY=sk-...
REACT_APP_RIM_BASE_URL=https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4
REACT_APP_ROM_BASE_URL=https://dro-api.dnext-pia.com/api/resourceOrderingManagement/v4
REACT_APP_PM_BASE_URL=https://dri-api.dnext-pia.com/api/partyManagement/v4
```

Note: API base URLs are configurable via env (see `src/services/api.service.ts`). If these variables are not set, the app falls back to the defaults shown above. Restart the dev server after changing env.

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
- Route gating via `KeycloakContext` in `AppRoutes.tsx` (waits for `authenticated` & token)
- Component-level conditional rendering using `useKeycloak().hasRole('sim_admin')`
- API authorization handled by Axios interceptors injecting `Authorization: Bearer <token>`

## 📊 API Integration

### Base Configuration
- **Base URL**: `https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4`
- **Authentication**: Bearer token (JWT from Keycloak)
- **Content Type**: application/json
- **Error Handling**: Centralized error responses
- **Default Sorting**: resources `-createdDate`, orders `-orderDate`

### Key Endpoints
Inventory (TMF639):
- `GET /resource` – List SIM resources (filters, pagination, sort)
- `POST /resource` – Create SIM resource
- `GET /resource/{id}` – Get SIM details
- `PATCH /resource/{id}` – Update resource (characteristics, `resourceStatus`)
- `DELETE /resource/{id}` – Delete resource

Ordering (TMF652):
- `GET /resourceOrder` – List orders
- `GET /resourceOrder/{id}` – Get order details
- `POST /resourceOrder` – Create order

Party (TMF632):
- `GET /party?name=...` – Party lookup for allocation (Distributor/Representative/Customer)

Bulk (optional, Swagger dependent):
- `POST /bulkResourceCreate`
- `POST /bulkResourceStatusUpdate`

Statistics: computed on client by paging `/resource` (no dedicated endpoint assumed)

## 🌐 Internationalization (i18n)

- Runtime locales under `public/locales/{en,tr,de,fr}/translation.json`
- Initialization in `src/i18n.ts` with language detection and HTTP backend
- Automation: `translate.js` uses OpenAI to backfill missing keys
  - Example: `node translate.js --source=en --languages=tr,de,fr --mode=missing`
  - Requires `OPENAI_API_KEY`

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

## 🖼️ Screenshots & Demos

Drop your images and GIFs under `docs/screenshots/` and `docs/demos/`, then update the links below as you capture them.

### Mini Gallery

| Screen           | Route                   | Preview |
|------------------|-------------------------|---------|
| Dashboard        | `/dashboard`            | [![Dashboard](docs/screenshots/dashboard.png)](http://localhost:3000/dashboard) |
| SIM Resources    | `/sim-resources`        | [![SIM Resources List](docs/screenshots/sim-list.png)](http://localhost:3000/sim-resources) |
| SIM Detail       | `/sim-resources/:id`    | [![SIM Detail](docs/screenshots/sim-detail.png)](http://localhost:3000/sim-resources) |
| Batch Import     | `/sim-resources/batch-import` | [![Batch Import](docs/screenshots/batch-import.png)](http://localhost:3000/sim-resources/batch-import) |
| Orders           | `/sim-orders`           | [![Orders](docs/screenshots/orders.png)](http://localhost:3000/sim-orders) |

### Screenshots
- Dashboard overview
  
  [![Dashboard](docs/screenshots/dashboard.png)](http://localhost:3000/dashboard)

- SIM Resources list (filters, bulk toolbar, allocation popover)
  
  [![SIM Resources List](docs/screenshots/sim-list.png)](http://localhost:3000/sim-resources)

- SIM Resource detail (status/state, characteristics, sensitive fields, allocation)
  
  [![SIM Detail](docs/screenshots/sim-detail.png)](http://localhost:3000/sim-resources)

- Batch Import (CSV preview, validation, results)
  
  [![Batch Import](docs/screenshots/batch-import.png)](http://localhost:3000/sim-resources/batch-import)

- Orders list and details
  
  [![Orders](docs/screenshots/orders.png)](http://localhost:3000/sim-orders)

### Demo GIFs
- Batch onboarding flow (CSV -> preview -> import)
  
  [![Batch Import Demo](docs/demos/batch-import.gif)](http://localhost:3000/sim-resources/batch-import)

- Lifecycle actions (Activate, Suspend, Terminate, Release, Retire)
  
  [![Lifecycle Demo](docs/demos/lifecycle.gif)](http://localhost:3000/sim-resources)

Tips (Windows): Use ScreenToGif or Xbox Game Bar (Win+Alt+R) for GIF/screen recordings. Keep files small and crop to essential UI.

## 🔧 Development

### Available Scripts
- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run lint` - ESLint checking
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - TypeScript checking
- `npm run translate` - Auto-translate i18n JSON files using OpenAI

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
type ResourceStatus =
  | 'standby'
  | 'alarm'
  | 'available'
  | 'reserved'
  | 'inUse'
  | 'disposed'
  | 'unknown'
  | 'suspended'
  | 'completed'
  | 'cancelled';

interface SimResource {
  id: string;
  createdDate?: string;
  updatedDate?: string;
  resourceStatus?: ResourceStatus | string; // canonical status
  // Key attributes are modeled as characteristics by name:
  // ICCID, IMSI, SIMType, ProfileType, BatchId, RESOURCE_STATE, PIN, PUK1, PUK2, ESIM_ACT_CODE
  resourceCharacteristic?: Array<{ name: string; value: any; valueType?: string }>;
  relatedParty?: Array<{ id: string; name?: string; role?: 'Distributor' | 'Representative' | 'Customer'; '@referredType'?: string }>;
}
```

### SIM Order
```typescript
interface SimOrder {
  id: string;
  orderDate: string;
  status?: 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled' | 'Acknowledged' | 'Partial' | 'Rejected';
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
**Last Updated**: 2025-09-16  
**Minimum Node Version**: 16.0.0