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
  SimType,
  BulkResourceCreateRequest,
} from '../types/sim.types';

class ApiService {
  private api: AxiosInstance;
  private orderApi: AxiosInstance;
  private keycloakToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://dri-api.dnext-pia.com/api/resourceInventoryManagement/v4',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.orderApi = axios.create({
      baseURL: 'https://dro-api.dnext-pia.com/api/resourceOrderingManagement/v4',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors(this.api);
    this.setupInterceptors(this.orderApi);
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

  // SIM Resource APIs
  async getSimResources(searchCriteria?: SimResourceSearchCriteria): Promise<ApiResponse<PaginatedResponse<SimResource>>> {
    const params = new URLSearchParams();
    
    if (searchCriteria) {
      Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    // Default sorting to createdDate if not explicitly provided
    if (!params.has('sort')) {
      params.set('sort', 'createdDate');
    }

    // Compatibility: some backends expect resourceStatus instead of status
    if (params.has('status')) {
      const vals = params.getAll('status');
      vals.forEach(v => params.append('resourceStatus', v));
    }

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
    const ensureChar = (arr: any[], name: string, value?: any) => {
      if (value === undefined || value === null || value === '') return;
      if (!arr.some((c: any) => String(c.name).toLowerCase() === name.toLowerCase())) {
        arr.push({ name, value, valueType: 'string' });
      }
    };

    const chars: any[] = [];
    // Include any incoming characteristics as-is (if provided)
    if ((request as any).resourceCharacteristic && Array.isArray((request as any).resourceCharacteristic)) {
      (request as any).resourceCharacteristic.forEach((c: any) => {
        if (c && c.name && (c.value !== undefined && c.value !== null)) {
          chars.push({ name: c.name, value: c.value, valueType: c.valueType || 'string' });
        }
      });
    }

    // Map domain-specific fields into characteristics to avoid non-schema top-level props
    ensureChar(chars, 'ICCID', (request as any).iccid);
    ensureChar(chars, 'SIMType', (request as any).type);
    ensureChar(chars, 'ProfileType', (request as any).profileType);
    ensureChar(chars, 'BatchId', (request as any).batchId);

    const payload: any = {
      '@type': (request as any)['@type'] || ((request as any).type === SimType.ESIM ? 'LogicalResource' : 'PhysicalResource'),
      name: (request as any).name || (request as any).iccid,
      description: (request as any).description,
    };
    if (chars.length) payload.resourceCharacteristic = chars;

    return this.handleResponse(
      this.api.post<SimResource>('/resource', payload)
    );
  }

  async updateSimResource(id: string, request: UpdateSimResourceRequest): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.patch<SimResource>(`/resource/${id}`, request)
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

  // Lifecycle Management APIs
  async activateSimResource(id: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.post<SimResource>(`/resource/${id}/activate`, {})
    );
  }

  async suspendSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.post<SimResource>(`/resource/${id}/suspend`, { reason })
    );
  }

  async terminateSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.post<SimResource>(`/resource/${id}/terminate`, { reason })
    );
  }

  async releaseSimResource(id: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.post<SimResource>(`/resource/${id}/release`, {})
    );
  }

  async retireSimResource(id: string, reason?: string): Promise<ApiResponse<SimResource>> {
    return this.handleResponse(
      this.api.post<SimResource>(`/resource/${id}/retire`, { reason })
    );
  }

  // Statistics and Reports
  async getSimStatistics(): Promise<ApiResponse<{
    total: number;
    available: number;
    allocated: number;
    active: number;
    suspended: number;
    terminated: number;
    retired: number;
    byType: Record<string, number>;
    byBatch: Record<string, number>;
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
    allocated: number;
    active: number;
    suspended: number;
    terminated: number;
    retired: number;
    byType: Record<string, number>;
    byBatch: Record<string, number>;
  }>> {
    const limit = 200;
    let offset = 0;
    let hasNext = true;
    let iterations = 0;
    const maxIterations = 50; // safety cap (10k items)

    const items: any[] = [];
    let reportedTotal: number | undefined = undefined;

    while (hasNext && iterations < maxIterations) {
      const resp = await this.api.get<any>('/resource', { params: { limit, offset, sort: 'createdDate' } });
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
      allocated: 0,
      active: 0,
      suspended: 0,
      terminated: 0,
      retired: 0,
    };
    const byType: Record<string, number> = {};
    const byBatch: Record<string, number> = {};

    const getChar = (sim: any, key: string) =>
      sim?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

    for (const sim of items) {
      const status: string | undefined = sim?.status || sim?.resourceStatus;
      switch ((status || '').toLowerCase()) {
        case 'available': counts.available++; break;
        case 'allocated': counts.allocated++; break;
        case 'active': counts.active++; break;
        case 'suspended': counts.suspended++; break;
        case 'terminated': counts.terminated++; break;
        case 'retired': counts.retired++; break;
      }

      const typeStr = String(sim?.type || sim?.['@type'] || sim?.resourceSpecification?.name || '').toLowerCase();
      const normalizedType = typeStr.includes('esim') ? 'eSIM' : (typeStr ? 'Physical' : 'Unknown');
      byType[normalizedType] = (byType[normalizedType] || 0) + 1;

      const batch = sim?.batchId ?? getChar(sim, 'BatchId') ?? 'No Batch';
      byBatch[String(batch)] = (byBatch[String(batch)] || 0) + 1;
    }

    return {
      success: true,
      data: {
        total: counts.total,
        available: counts.available,
        allocated: counts.allocated,
        active: counts.active,
        suspended: counts.suspended,
        terminated: counts.terminated,
        retired: counts.retired,
        byType,
        byBatch,
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
