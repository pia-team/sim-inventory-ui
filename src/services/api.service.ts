  import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  SimResource, 
  SimOrder, 
  CreateSimResourceRequest, 
  UpdateSimResourceRequest,
  CreateSimOrderRequest,
  SimResourceSearchCriteria,
  BatchSimImportRequest,
  BatchSimImportResponse,
  PaginatedResponse,
  ApiResponse,
  BulkResourceCreateRequest,
} from '../types/sim.types';

// Base URLs are configurable via environment variables (CRA). Fallbacks preserve current defaults.
const RIM_BASE_URL = process.env.REACT_APP_RIM_BASE_URL || 'https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4';
const ROM_BASE_URL = process.env.REACT_APP_ROM_BASE_URL || 'https://dro-api.dnext-pia.com/api/resourceOrderingManagement/v4';
const PM_BASE_URL  = process.env.REACT_APP_PM_BASE_URL  || 'https://dri-api.dnext-pia.com/api/partyManagement/v4';

class ApiService {
  private api: AxiosInstance;
  private orderApi: AxiosInstance;
  private partyApi: AxiosInstance;
  private keycloakToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: RIM_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.orderApi = axios.create({
      baseURL: ROM_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Party Management (TMF632) - assumed base on same host. Adjust if your env differs.
    this.partyApi = axios.create({
      baseURL: PM_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors(this.api);
    this.setupInterceptors(this.orderApi);
    this.setupInterceptors(this.partyApi);
  }

  // Public wrapper for clearing allocation role
  public async clearAllocationByRole(id: string, role: 'Distributor' | 'Representative' | 'Customer'): Promise<ApiResponse<SimResource>> {
    return this.removeRelatedPartyByRole(id, role);
  }

  // Public wrapper for relatedParty upsert (accepts id or name; will lookup id by name if missing)
  public async setAllocationRelatedParty(id: string, role: 'Distributor' | 'Representative' | 'Customer', party: { id?: string; name?: string; '@referredType'?: string }): Promise<ApiResponse<SimResource>> {
    let payload = { ...party } as { id?: string; name?: string; '@referredType'?: string };
    if (!payload.id && payload.name) {
      const found = await this.findPartyByName(payload.name);
      if (found) {
        payload.id = found.id;
        // prefer explicit provided name; else use found.name
        payload.name = payload.name || found.name;
        payload['@referredType'] = payload['@referredType'] || found['@referredType'] || 'Party';
      } else {
        return {
          success: false,
          error: {
            code: 'PARTY_NOT_FOUND',
            message: `Party not found by name: ${payload.name}`,
            timestamp: new Date().toISOString(),
            path: '/partyManagement/v4/party',
          },
          timestamp: new Date().toISOString(),
        };
      }
    }
    // Default referred type if still missing
    payload['@referredType'] = payload['@referredType'] || 'Party';
    // Read current status to decide if we should set Reserved on Customer allocation
    let currentStatus: string | undefined;
    try {
      const read = await this.api.get<SimResource>(`/resource/${id}`);
      currentStatus = (read.data as any)?.resourceStatus || (read.data as any)?.status;
    } catch {
      currentStatus = undefined;
    }

    const res = await this.upsertRelatedParty(id, role, payload);
    if (!res.success) return res;
    // If Customer allocated manually and not already in use, set status to Reserved
    if (role === 'Customer' && String(currentStatus || '').toLowerCase() !== 'inuse') {
      return this.setResourceStatus(id, 'reserved');
    }
    return res;
  }

  // Helper: remove a characteristic by name while preserving others
  private async removeResourceCharacteristic(id: string, name: string, extraPatch?: Record<string, any>): Promise<ApiResponse<SimResource>> {
    let existing: SimResource | undefined;
    try {
      const read = await this.api.get<SimResource>(`/resource/${id}`);
      existing = read.data;
    } catch (e) {
      existing = undefined;
    }

    const current = Array.isArray(existing?.resourceCharacteristic)
      ? [...(existing!.resourceCharacteristic as any[])]
      : [];

    const next = current.filter((c: any) => String(c?.name || '').toLowerCase() !== String(name).toLowerCase());
    const body: any = { resourceCharacteristic: next, ...(extraPatch || {}) };
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, body, {
        headers: { 'Content-Type': 'application/merge-patch+json;charset=utf-8' },
      })
    );
  }

  // Helper: set resourceStatus field
  private async setResourceStatus(id: string, status: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, { resourceStatus: status }, {
        headers: { 'Content-Type': 'application/merge-patch+json;charset=utf-8' },
      })
    );
  }

  // Public wrapper for setting resourceStatus
  public async updateResourceStatus(id: string, status: string): Promise<ApiResponse<SimResource>> {
    return this.setResourceStatus(id, status);
  }

  // Helper: upsert a relatedParty by role (by name or id)
  private async upsertRelatedParty(id: string, role: string, party: { id?: string; name?: string; '@referredType'?: string }): Promise<ApiResponse<SimResource>> {
    let existing: SimResource | undefined;
    try {
      const read = await this.api.get<SimResource>(`/resource/${id}`);
      existing = read.data;
    } catch (e) {
      existing = undefined;
    }

    const current = Array.isArray((existing as any)?.relatedParty) ? [ ...(existing as any).relatedParty as any[] ] : [];
    const idx = current.findIndex((p: any) => String(p?.role || '').toLowerCase() === role.toLowerCase());
    const next = { ...(idx >= 0 ? current[idx] : {}), role, ...(party.id ? { id: party.id } : {}), ...(party.name ? { name: party.name } : {}), '@referredType': (idx >= 0 ? current[idx]['@referredType'] : (party['@referredType'] || 'Party')) };
    if (idx >= 0) current[idx] = next; else current.push(next);
    const body: any = { relatedParty: current };
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, body, {
        headers: { 'Content-Type': 'application/merge-patch+json;charset=utf-8' },
      })
    );
  }

  private async removeRelatedPartyByRole(id: string, role: string): Promise<ApiResponse<SimResource>> {
    let existing: SimResource | undefined;
    try {
      const read = await this.api.get<SimResource>(`/resource/${id}`);
      existing = read.data;
    } catch (e) {
      existing = undefined;
    }

    const current = Array.isArray((existing as any)?.relatedParty) ? [ ...(existing as any).relatedParty as any[] ] : [];
    const next = current.filter((p: any) => String(p?.role || '').toLowerCase() !== role.toLowerCase());
    const body: any = { relatedParty: next };
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, body, {
        headers: { 'Content-Type': 'application/merge-patch+json;charset=utf-8' },
      })
    );
  }

  // Business helpers
  async assignSimToAccount(id: string, msisdn: string): Promise<ApiResponse<SimResource>> {
    // Upsert MSISDN characteristic and set status to 'in use'; also upsert relatedParty as Customer
    const res1 = await this.upsertResourceCharacteristic(id, 'MSISDN', msisdn);
    if (!res1.success) return res1 as any;
    const res2 = await this.setResourceStatus(id, 'inUse');
    if (!res2.success) return res2 as any;
    // Backend requires id and @referredType; default to Party when assigning by MSISDN/Account reference
    const res3 = await this.upsertRelatedParty(id, 'Customer', { id: msisdn, name: msisdn, '@referredType': 'Party' });
    return res3;
  }

  async unassignSimResource(id: string, behavior: 'reserved' | 'disposed'): Promise<ApiResponse<SimResource>> {
    // Remove MSISDN and Customer relatedParty; set status based on behavior
    const res1 = await this.removeResourceCharacteristic(id, 'MSISDN');
    if (!res1.success) return res1 as any;
    const res2 = await this.removeRelatedPartyByRole(id, 'Customer');
    if (!res2.success) return res2 as any;
    const res3 = await this.setResourceStatus(id, behavior);
    return res3;
  }

  // Public wrapper to upsert a single characteristic
  public async upsertCharacteristic(id: string, name: string, value: any, extraPatch?: Record<string, any>): Promise<ApiResponse<SimResource>> {
    return this.upsertResourceCharacteristic(id, name, value, extraPatch);
  }

  private setupInterceptors(instance: AxiosInstance): void {
    // Request interceptor to add auth token
    instance.interceptors.request.use(
      (config) => {
        if (this.keycloakToken) {
          config.headers.Authorization = `Bearer ${this.keycloakToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Avoid hard reloads which cause auth redirect loops.
          // Let the caller decide how to handle 401 (e.g., show message or call login()).
          console.warn('API 401 Unauthorized');
        }
        
        if (error.response?.status === 403) {
          console.error('Access forbidden - insufficient permissions');
        }

        return Promise.reject(error);
      }
    );
  }

  public setAuthToken(token: string): void {
    this.keycloakToken = token;
  }

  public clearAuthToken(): void {
    this.keycloakToken = null;
  }

  // Helper method to handle API responses
  private async handleResponse<T>(promise: Promise<AxiosResponse<T>>): Promise<ApiResponse<T>> {
    try {
      const response = await promise;
      return {
        data: response.data,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: {
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.message || error.message || 'An unknown error occurred',
          details: error.response?.data?.details,
          timestamp: new Date().toISOString(),
          path: error.config?.url,
        },
        success: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Party lookup by name (TMF632 Party)
  private async findPartyByName(name: string): Promise<{ id: string; name?: string; '@referredType'?: string } | null> {
    try {
      const resp = await this.partyApi.get<any>('/party', { params: { name, limit: 1 } });
      const data = resp.data;
      const arr: any[] = Array.isArray(data) ? data : (data?.data || []);
      if (arr && arr.length > 0) {
        const p = arr[0] || {};
        const id = p.id || p.partyId || p.identifier || p.uuid;
        const displayName = p.name || p.tradingName || p.fullName || name;
        const refType = p['@type'] || p['@referredType'] || 'Party';
        if (id) {
          return { id, name: displayName, '@referredType': refType };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  // SIM Resource APIs
  async getSimResources(searchCriteria?: SimResourceSearchCriteria): Promise<ApiResponse<PaginatedResponse<SimResource>>> {
    const params = new URLSearchParams();
    
    if (searchCriteria) {
      Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // characteristicFilters are handled separately below
          if (key === 'characteristicFilters') return;
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    // Default sorting to -createdDate (descending) if not explicitly provided
    if (!params.has('sort')) {
      params.set('sort', '-createdDate');
    }

    // Compatibility: /resource expects only 'resourceStatus'.
    // Merge any provided 'status' and 'resourceStatus' values, normalize, and send as a single
    // comma-separated 'resourceStatus' param (e.g., resourceStatus=available,assigned).
    if (params.has('status') || params.has('resourceStatus')) {
      const collected: string[] = [];
      if (params.has('status')) {
        collected.push(...params.getAll('status'));
        params.delete('status');
      }
      if (params.has('resourceStatus')) {
        collected.push(...params.getAll('resourceStatus'));
        params.delete('resourceStatus');
      }

      const canonical = collected
        .flatMap(v => String(v).split(','))
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => {
          const lower = v.toLowerCase();
          // Keep canonical camelCase for 'inUse'
          if (lower === 'inuse') return 'inUse';
          // Other statuses are canonical in lowercase per backend
          return lower;
        });

      if (canonical.length) {
        const unique = Array.from(new Set(canonical));
        params.set('resourceStatus', unique.join(','));
      }
    }

    // Map UI batchId filter to TMF characteristic query (BatchId stored in resourceCharacteristic)
    if (params.has('batchId')) {
      const vals = params.getAll('batchId');
      params.delete('batchId');
      // Support multiple values by repeating value param; name stays 'BatchId'
      if (vals.length) {
        params.append('resourceCharacteristic.name', 'BatchId');
        vals.forEach(v => params.append('resourceCharacteristic.value', v));
      }
    }

    // Map UI imsi filter to TMF characteristic query (IMSI stored in resourceCharacteristic)
    if (params.has('imsi')) {
      const vals = params.getAll('imsi');
      params.delete('imsi');
      if (vals.length) {
        params.append('resourceCharacteristic.name', 'IMSI');
        vals.forEach(v => params.append('resourceCharacteristic.value', v));
      }
    }

    // Map UI iccid filter to TMF characteristic query (ICCID stored in resourceCharacteristic)
    if (params.has('iccid')) {
      const vals = params.getAll('iccid');
      params.delete('iccid');
      if (vals.length) {
        params.append('resourceCharacteristic.name', 'ICCID');
        vals.forEach(v => params.append('resourceCharacteristic.value', v));
      }
    }

    // Map generic custom characteristic filters (array of {name,value}) to repeated params
    if (searchCriteria && Array.isArray((searchCriteria as any).characteristicFilters)) {
      const list = (searchCriteria as any).characteristicFilters as Array<{ name: string; value: string }>;
      list.forEach(({ name, value }) => {
        if (!name || value === undefined || value === null) return;
        params.append('resourceCharacteristic.name', name);
        params.append('resourceCharacteristic.value', String(value));
      });
    }

    // Allocation filters via relatedParty
    const mapAlloc = (
      key: 'allocationDistributor' | 'allocationRepresentative' | 'allocationCustomer',
      role: string
    ) => {
      if (params.has(key)) {
        const vals = params.getAll(key);
        params.delete(key);
        params.append('relatedParty.role', role);
        // send names; if ids are supplied they will be treated as names by backend unless it supports id field
        vals.forEach((v) => params.append('relatedParty.name', v));
      }
    };
    mapAlloc('allocationDistributor', 'Distributor');
    mapAlloc('allocationRepresentative', 'Representative');
    mapAlloc('allocationCustomer', 'Customer');

    return this.handleResponse(
      this.api.get<PaginatedResponse<SimResource>>('/resource', { params })
    );
  }

  async getSimResourceById(id: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.get<SimResource>(`/resource/${id}`)
    );
  }

  async createSimResource(request: CreateSimResourceRequest): Promise<ApiResponse<SimResource>> {
    // Build a payload that strictly adheres to the Swagger schema (ResourceCreate oneOf types)

    const chars: any[] = [];
    // Include any incoming characteristics as-is (if provided)
    if ((request as any).resourceCharacteristic && Array.isArray((request as any).resourceCharacteristic)) {
      (request as any).resourceCharacteristic.forEach((c: any) => {
        if (c && c.name && (c.value !== undefined && c.value !== null)) {
          chars.push({ name: c.name, value: c.value, valueType: c.valueType || 'string' });
        }
      });
    }

    // Characteristic-only model
    const simTypeChar = chars.find((c: any) => String(c.name).toLowerCase() === 'simtype')?.value;
    const iccidChar = chars.find((c: any) => String(c.name).toLowerCase() === 'iccid')?.value;

    const payload: any = {
      '@type': (request as any)['@type'] || (String(simTypeChar || '').toLowerCase().includes('esim') ? 'LogicalResource' : 'PhysicalResource'),
      name: (request as any).name || iccidChar,
      description: (request as any).description,
    };
    if (chars.length) payload.resourceCharacteristic = chars;

    return this.handleResponse(
      this.api.post<SimResource>('/resource', payload)
    );
  }

  async updateSimResource(id: string, request: UpdateSimResourceRequest): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, request, {
        headers: {
          'Content-Type': 'application/merge-patch+json;charset=utf-8',
        },
      })
    );
  }

  async deleteSimResource(id: string): Promise<ApiResponse<void>> {
    return this.handleResponse(
      this.api.delete<void>(`/resource/${id}`)
    );
  }

  async batchImportSims(request: BatchSimImportRequest): Promise<ApiResponse<BatchSimImportResponse>> {
    const failures: { iccid: string; error: string }[] = [];
    let successCount = 0;
    const totalCount = request.sims.length;

    for (const sim of request.sims) {
      try {
        const res = await this.createSimResource(sim);
        if (res.success) successCount += 1;
        else failures.push({ iccid: (sim as any).iccid, error: res.error?.message || 'Unknown error' });
      } catch (e: any) {
        failures.push({ iccid: (sim as any).iccid, error: e?.message || 'Unknown error' });
      }
    }

    const response: BatchSimImportResponse = {
      batchId: request.batchId,
      totalCount,
      successCount,
      failureCount: totalCount - successCount,
      failures,
    };

    return {
      data: response,
      success: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Optional: Swagger bulk endpoints support (not used by default CSV import)
  async bulkResourceCreateJob(payload: BulkResourceCreateRequest): Promise<ApiResponse<any>> {
    return this.handleResponse(
      this.api.post<any>('/bulkResourceCreate', payload)
    );
  }

  async bulkResourceStatusUpdate(payload: any): Promise<ApiResponse<any>> {
    return this.handleResponse(
      this.api.post<any>('/bulkResourceStatusUpdate', payload)
    );
  }

  // SIM Order APIs
  async getSimOrders(params?: { 
    status?: string[];
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<ApiResponse<PaginatedResponse<SimOrder>>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }

    // Default sorting to -orderDate (descending) if not explicitly provided
    if (!searchParams.has('sort')) {
      searchParams.set('sort', '-orderDate');
    }

    return this.handleResponse(
      this.orderApi.get<PaginatedResponse<SimOrder>>('/resourceOrder', { params: searchParams })
    );
  }

  async getSimOrderById(id: string): Promise<ApiResponse<SimOrder>> {
    return this.handleResponse(
      this.orderApi.get<SimOrder>(`/resourceOrder/${id}`)
    );
  }

  async createSimOrder(request: CreateSimOrderRequest): Promise<ApiResponse<SimOrder>> {
    return this.handleResponse(
      this.orderApi.post<SimOrder>('/resourceOrder', request)
    );
  }

  async cancelSimOrder(id: string): Promise<ApiResponse<SimOrder>> {
    return this.handleResponse(
      this.orderApi.patch<SimOrder>(`/resourceOrder/${id}`, { status: 'Cancelled', state: 'Cancelled' })
    );
  }

  // Helper: upsert a single characteristic by name while preserving other characteristics
  private async upsertResourceCharacteristic(
    id: string,
    name: string,
    value: any,
    extraPatch?: Record<string, any>
  ): Promise<ApiResponse<SimResource>> {
    let existing: SimResource | undefined;
    try {
      const read = await this.api.get<SimResource>(`/resource/${id}`);
      existing = read.data;
    } catch (e) {
      // If GET fails, continue with only the upserted characteristic (best-effort)
      existing = undefined;
    }

    const current = Array.isArray(existing?.resourceCharacteristic)
      ? [...(existing!.resourceCharacteristic as any[])]
      : [];

    const idx = current.findIndex(
      (c: any) => String(c?.name || '').toLowerCase() === String(name).toLowerCase()
    );
    if (idx >= 0) {
      current[idx] = {
        ...current[idx],
        name,
        value,
        valueType: (current[idx] as any)?.valueType || 'string',
      };
    } else {
      current.push({ name, value, valueType: 'string' });
    }

    const body: any = { resourceCharacteristic: current, ...(extraPatch || {}) };
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, body, {
        headers: { 'Content-Type': 'application/merge-patch+json;charset=utf-8' },
      })
    );
  }

  // Lifecycle Management APIs
  async activateSimResource(id: string): Promise<ApiResponse<SimResource>> {
    // Set characteristic RESOURCE_STATE to 'active'
    return this.upsertResourceCharacteristic(id, 'RESOURCE_STATE', 'active');
  }

  async suspendSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    // Set characteristic RESOURCE_STATE to 'suspended'
    return this.upsertResourceCharacteristic(id, 'RESOURCE_STATE', 'suspended',
      reason ? { statusReason: reason } : undefined
    );
  }

  async terminateSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    // Set characteristic RESOURCE_STATE to 'terminated'
    return this.upsertResourceCharacteristic(id, 'RESOURCE_STATE', 'terminated',
      reason ? { statusReason: reason } : undefined
    );
  }

  async releaseSimResource(id: string): Promise<ApiResponse<SimResource>> {
    // Set characteristic RESOURCE_STATE to 'available'
    return this.upsertResourceCharacteristic(id, 'RESOURCE_STATE', 'available');
  }

  async retireSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    // Set characteristic RESOURCE_STATE to 'retired'
    return this.upsertResourceCharacteristic(id, 'RESOURCE_STATE', 'retired',
      reason ? { statusReason: reason } : undefined
    );
  }

  // Statistics and Reports
  async getSimStatistics(): Promise<ApiResponse<{
    total: number;
    available: number;
    reserved: number;
    inUse: number;
    disposed: number;
    allocated: number;
    active: number;
    suspended: number;
    terminated: number;
    retired: number;
    byType: Record<string, number>;
    byBatch: Record<string, number>;
    byState: Record<string, number>;
  }>> {
    // The backend may not expose /resource/statistics. Compute on the client by paging /resource.
    try {
      const aggregated = await this.computeSimStatistics();
      return aggregated;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'STATISTICS_COMPUTE_FAILED',
          message: error?.response?.data?.message || error?.message || 'Failed to compute statistics',
          timestamp: new Date().toISOString(),
          path: '/resource',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async computeSimStatistics(): Promise<ApiResponse<{
    total: number;
    available: number;
    reserved: number;
    inUse: number;
    disposed: number;
    allocated: number;
    active: number;
    suspended: number;
    terminated: number;
    retired: number;
    byType: Record<string, number>;
    byBatch: Record<string, number>;
    byState: Record<string, number>;
  }>> {
    const limit = 200;
    let offset = 0;
    let hasNext = true;
    let iterations = 0;
    const maxIterations = 50; // safety cap (10k items)

    const items: any[] = [];
    let reportedTotal: number | undefined = undefined;

    while (hasNext && iterations < maxIterations) {
      const resp = await this.api.get<any>('/resource', { params: { limit, offset, sort: '-createdDate' } });
      const data = resp.data;
      let page: any[] = [];

      if (Array.isArray(data)) {
        page = data;
        // If the API returns a raw array, we cannot rely on pagination; collect one page and stop.
        hasNext = false;
        reportedTotal = page.length;
      } else {
        page = data?.data || [];
        reportedTotal = typeof data?.totalCount === 'number' ? data.totalCount : reportedTotal;
        hasNext = !!data?.hasNext && page.length > 0;
      }

      items.push(...page);
      if (!hasNext || page.length < limit) {
        break;
      }
      offset += limit;
      iterations += 1;
    }

    const counts = {
      total: reportedTotal ?? items.length,
      available: 0,
      reserved: 0,
      inUse: 0,
      disposed: 0,
      allocated: 0,
      active: 0,
      suspended: 0,
      terminated: 0,
      retired: 0,
    };
    const byType: Record<string, number> = {};
    const byBatch: Record<string, number> = {};
    const byState: Record<string, number> = {};

    const getChar = (sim: any, key: string) =>
      sim?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

    for (const sim of items) {
      const status: string | undefined = sim?.resourceStatus || sim?.status;
      switch ((status || '').toLowerCase()) {
        case 'available': counts.available++; break;
        case 'reserved': counts.reserved++; break;
        case 'inuse': counts.inUse++; break;
        case 'disposed': counts.disposed++; break;
        case 'allocated': counts.allocated++; break;
        case 'active': counts.active++; break;
        case 'suspended': counts.suspended++; break;
        case 'terminated': counts.terminated++; break;
        case 'retired': counts.retired++; break;
      }

      const typeStr = String(getChar(sim, 'SIMType') || sim?.['@type'] || sim?.resourceSpecification?.name || '').toLowerCase();
      const normalizedType = typeStr.includes('esim') ? 'eSIM' : (typeStr ? 'Physical' : 'Unknown');
      byType[normalizedType] = (byType[normalizedType] || 0) + 1;

      const batch = sim?.batchId ?? getChar(sim, 'BatchId') ?? 'No Batch';
      byBatch[String(batch)] = (byBatch[String(batch)] || 0) + 1;

      const state = String(getChar(sim, 'RESOURCE_STATE') || '').trim();
      if (state) byState[state] = (byState[state] || 0) + 1;
    }

    return {
      success: true,
      data: {
        total: counts.total,
        available: counts.available,
        reserved: counts.reserved,
        inUse: counts.inUse,
        disposed: counts.disposed,
        allocated: counts.allocated,
        active: counts.active,
        suspended: counts.suspended,
        terminated: counts.terminated,
        retired: counts.retired,
        byType,
        byBatch,
        byState,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.handleResponse(
      this.api.get('/health')
    );
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
