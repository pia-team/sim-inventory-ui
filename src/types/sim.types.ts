// SIM Resource Types based on TMF Resource Inventory Specification
export enum SimType {
  PHYSICAL = 'Physical',
  ESIM = 'eSIM',
}

export enum SimStatus {
  AVAILABLE = 'Available',
  ALLOCATED = 'Allocated',
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  TERMINATED = 'Terminated',
  RETIRED = 'Retired',
}

// Allowed resourceStatus values used by backend
export type ResourceStatus =
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

export const RESOURCE_STATUS_VALUES: ReadonlyArray<ResourceStatus> = [
  'standby',
  'alarm',
  'available',
  'reserved',
  'inUse',
  'disposed',
  'unknown',
  'suspended',
  'completed',
  'cancelled',
];

// Operational/Administrative state enums
export enum AdministrativeState {
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
  SHUTDOWN = 'shutdown',
}

export enum OperationalState {
  ENABLE = 'enable',
  DISABLE = 'disable',
}

export enum UsageState {
  IDLE = 'idle',
  ACTIVE = 'active',
  BUSY = 'busy',
}

export enum ProfileType {
  PREPAID = 'Prepaid',
  POSTPAID = 'Postpaid',
}

export enum OrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'InProgress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
  ACKNOWLEDGED = 'Acknowledged',
  PARTIAL = 'Partial',
  REJECTED = 'Rejected',
}

export enum LifecycleAction {
  ACTIVATE = 'Activate',
  SUSPEND = 'Suspend',
  TERMINATE = 'Terminate',
  RELEASE = 'Release',
  RETIRE = 'Retire',
}

export interface SimResource {
  // Core identifiers
  id: string;
  href?: string;

 

  // Lifecycle and audit
  createdDate?: string;
  updatedDate?: string; // TMF field
  lastModifiedDate?: string; // legacy/UI convenience
  createdBy?: string;
  updatedBy?: string;
  revision?: number;

  // Descriptive
  category?: string;
  description?: string;
  name?: string;
  version?: string; // legacy/UI convenience
  resourceVersion?: string;
  startOperatingDate?: string;
  endOperatingDate?: string;

  // Administrative/operational states
  administrativeState?: AdministrativeState;
  operationalState?: OperationalState;
  resourceStatus?: ResourceStatus | string;
  usageState?: UsageState;
  statusReason?: string;

  // Relationships and references
  attachment?: Attachment[];
  note?: Note[];
  place?: Place | Place[]; // some backends may return array; schema shows object
  externalReference?: ExternalReference[];
  relatedParty?: RelatedParty[];
  resourceCharacteristic?: ResourceCharacteristic[];
  resourceRelationship?: ResourceRelationship[];
  resourceSpecification?: ResourceSpecification;
  activationFeature?: ActivationFeature[];
  resourceOrderItem?: ResourceOrderItemRef[];
  productOrderItem?: ProductOrderItemRef[];
  serviceOrderItem?: ServiceOrderItemRef[];
  relatedEntity?: RelatedEntity[];
  aclRelatedParty?: RelatedParty[];

  // TMF metadata
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ResourceCharacteristic {
  id?: string;
  name: string;
  value: any;
  valueType?: string;
  characteristicRelationship?: CharacteristicRelationship[];
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface CharacteristicRelationship {
  id?: string;
  relationshipType: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ResourceRelationship {
  id?: string;
  relationshipType: string;
  resource: (Partial<SimResource> & { '@referredType'?: string });
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ResourceSpecification {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  '@referredType'?: string;
}

export interface Place {
  id?: string;
  href?: string;
  name?: string;
  role?: string;
  city?: string;
  country?: string;
  locality?: string;
  postcode?: string;
  stateOrProvince?: string;
  streetName?: string;
  streetNr?: string;
  streetNrLast?: string;
  streetNrLastSuffix?: string;
  streetNrSuffix?: string;
  streetSuffix?: string;
  streetType?: string;
  geographicLocation?: GeographicLocationRef;
  geographicSubAddress?: GeographicSubAddress[];
  externalReference?: ExternalReference[];
  '@referredType'?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface SimOrder {
  id: string;
  href?: string;
  orderDate: string;
  completionDate?: string;
  expectedCompletionDate?: string;
  requestedStartDate?: string;
  requestedCompletionDate?: string;
  // Some backends use `state` instead of `status` (TMF style). Keep both for compatibility.
  status?: OrderStatus;
  state?: OrderStatus;
  category?: string;
  description?: string;
  externalId?: string;
  priority?: string;
  orderItem: OrderItem[];
  relatedParty?: RelatedParty[];
  note?: Note[];
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  version?: string;
}

export interface OrderItem {
  id: string;
  quantity?: number;
  action: LifecycleAction;
  state?: string;
  resource?: SimResource;
  resourceSpecification?: ResourceSpecification;
  appointment?: string | AppointmentRef;
  orderItemRelationship?: OrderItemRelationship[];
}

export interface OrderItemRelationship {
  id?: string;
  relationshipType: string;
  orderItem: OrderItem;
}

export interface AppointmentRef {
  id?: string;
  href?: string;
  description?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface RelatedParty {
  id: string;
  href?: string;
  name?: string;
  role?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface Note {
  id?: string;
  author?: string;
  date?: string;
  text: string;
  system?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

// API Request/Response Types
export interface CreateSimResourceRequest {
  '@type'?: string;
  resourceCharacteristic?: ResourceCharacteristic[];
  description?: string;
  name?: string;
}

export interface UpdateSimResourceRequest {
  name?: string;
  status?: SimStatus;
  resourceStatus?: ResourceStatus | string;
  category?: string;
  administrativeState?: AdministrativeState;
  operationalState?: OperationalState;
  usageState?: UsageState;
  statusReason?: string;
  description?: string;
  resourceCharacteristic?: ResourceCharacteristic[];
}

export interface CreateSimOrderRequest {
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  category?: string;
  externalId?: string;
  description?: string;
  priority?: string;
  requestedStartDate?: string;
  requestedCompletionDate?: string;
  orderItem: Omit<OrderItem, 'id' | 'state'>[];
  relatedParty?: RelatedParty[];
  note?: Note[];
}

export interface SimResourceSearchCriteria {
  iccid?: string;
  imsi?: string;
  status?: (SimStatus | ResourceStatus | string)[];
  type?: SimType[];
  '@type'?: string[]; // TMF resource discriminator (e.g., 'LogicalResource' or 'PhysicalResource')
  batchId?: string;
  profileType?: ProfileType[];
  createdDate?: string; // comma-separated range: "fromISO,toISO"
  lastModifiedDateFrom?: string;
  lastModifiedDateTo?: string;
  limit?: number;
  offset?: number;
  fields?: string;
  sort?: string;
  // Allocation filters (TMF relatedParty based)
  allocationDistributor?: string; // party name or id
  allocationRepresentative?: string; // party name or id
  allocationCustomer?: string; // party name or id
  // Generic custom characteristic filters
  characteristicFilters?: { name: string; value: string }[];
}

export interface BatchSimImportRequest {
  batchId: string;
  sims: CreateSimResourceRequest[];
  description?: string;
}

export interface BatchSimImportResponse {
  batchId: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  failures?: BatchImportFailure[];
}

export interface BatchImportFailure {
  iccid: string;
  error: string;
  lineNumber?: number;
}

// Bulk endpoints (Swagger) types
export interface BulkCharacteristic {
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  name: string;
  isUnique?: boolean;
  isVisible?: boolean;
  isIdentifier?: boolean;
  counterType?: string;
  valueMask?: string;
  valueFrom?: string;
  valueTo?: string;
  isPopulateCharacteristicValueToResourceName?: boolean;
}

export interface ResourceCreateBase {
  '@type': 'LogicalResource' | 'PhysicalResource';
  name: string;
  description?: string;
  resourceCharacteristic?: ResourceCharacteristic[];
}

export type LogicalResourceCreate = ResourceCreateBase & { '@type': 'LogicalResource' };
export type PhysicalResourceCreate = ResourceCreateBase & { '@type': 'PhysicalResource' };

export interface BulkResourceCreateRequest {
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  jobReference?: string;
  itemCount: number;
  baseResource: LogicalResourceCreate | PhysicalResourceCreate;
  bulkCharacteristic: BulkCharacteristic[];
}

export interface BulkResourceStatusUpdateRequest {
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  resourceStatus?: string;
  jobReference?: string;
  itemCount: number;
  bulkCharacteristic: BulkCharacteristic;
}

// Pagination and API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
  path?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
  timestamp: string;
}

// --- Additional types from schema ---

export interface Attachment {
  id?: string;
  href?: string;
  attachmentType?: string;
  content?: string;
  description?: string;
  mimeType?: string;
  name?: string;
  url?: string;
  size?: Size;
  validFor?: ValidFor;
  '@referredType'?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface Size {
  amount?: number;
  units?: string;
}

export interface ValidFor {
  startDateTime?: string;
  endDateTime?: string;
}

export interface GeographicLocationRef {
  id?: string;
  href?: string;
  name?: string;
  bbox?: number[];
  '@referredType'?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface GeographicSubAddress {
  id?: string;
  href?: string;
  buildingName?: string;
  levelNumber?: string;
  levelType?: string;
  name?: string;
  privateStreetName?: string;
  privateStreetNumber?: string;
  subAddressType?: string;
  subUnitNumber?: string;
  subUnitType?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ExternalReference {
  id?: string;
  href?: string;
  externalReferenceType?: string;
  name?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ActivationFeature {
  id?: string;
  isBundle?: boolean;
  isEnabled?: boolean;
  name?: string;
  constraint?: ConstraintRef[];
  featureCharacteristic?: FeatureCharacteristic[];
  featureRelationship?: FeatureRelationship[];
  featureBundle?: FeatureBundleRef[];
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ConstraintRef {
  id?: string;
  href?: string;
  name?: string;
  version?: string;
  '@referredType'?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface FeatureCharacteristic {
  id?: string;
  name?: string;
  valueType?: string;
  characteristicRelationship?: CharacteristicRelationship[];
  value?: any;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface FeatureRelationship {
  id?: string;
  name?: string;
  relationshipType?: string;
  validFor?: ValidFor;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface FeatureBundleRef {
  href?: string;
  id?: string;
  lifecycleStatus?: string;
  name?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}

export interface ResourceOrderItemRef {
  itemId?: string;
  role?: string;
  resourceOrderHref?: string;
  resourceOrderId?: string;
  itemAction?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  '@referredType'?: string;
}

export interface ServiceOrderItemRef {
  itemId?: string;
  role?: string;
  serviceOrderHref?: string;
  serviceOrderId?: string;
  itemAction?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  '@referredType'?: string;
}

export interface ProductOrderItemRef {
  orderItemAction?: string;
  orderItemId?: string;
  productOrderHref?: string;
  productOrderId?: string;
  role?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
  '@referredType'?: string;
}

export interface RelatedEntity {
  id?: string;
  href?: string;
  name?: string;
  role?: string;
  '@referredType'?: string;
  '@baseType'?: string;
  '@type'?: string;
  '@schemaLocation'?: string;
}
