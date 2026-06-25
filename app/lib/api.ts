import type {
  CreateTenantRequest,
  CreateTenantResponse,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  User,
  TenantInfo,
  APIError,
  ChatMessageFromAPI,
} from "./types";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;

  return res.json();
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ── Auth Endpoints ──

export async function createTenant(
  data: CreateTenantRequest
): Promise<CreateTenantResponse> {
  return request<CreateTenantResponse>("/api/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(
  data: RegisterRequest
): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function refreshToken(): Promise<RefreshResponse> {
  return request<RefreshResponse>("/api/refresh", {
    method: "POST",
  });
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/api/logout", {
    method: "POST",
  });
}

export async function getMe(token: string): Promise<User> {
  return request<User>("/api/me", {
    headers: authHeader(token),
  });
}

export async function getTenantInfo(
  tenantId: string,
  token: string
): Promise<TenantInfo> {
  return request<TenantInfo>(`/api/tenants/${tenantId}`, {
    headers: authHeader(token),
  });
}

export async function getChannelHistory(
  tenantId: string,
  channelType: "DM" | "GROUP",
  channelId: string,
  token: string,
  limit: number = 50
): Promise<ChatMessageFromAPI[]> {
  return request<ChatMessageFromAPI[]>(
    `/api/history/${tenantId}/${channelType === "DM" ? "Dm" : "Group"}/${encodeURIComponent(channelId)}?limit=${limit}`,
    {
      headers: authHeader(token),
    }
  );
}

/**
 * Discover all groups that exist for a tenant by fetching group history
 * for a well-known channel ("general") and also checking for other groups
 * by listing messages. Since the backend has no dedicated groups endpoint,
 * we rely on the "general" group always existing plus real-time discovery.
 */
export async function getGroupsList(
  tenantId: string,
  token: string
): Promise<string[]> {
  try {
    // Try fetching history for "general" - if it works, at least "general" exists
    // We also try a broader approach: fetch all Group-type history
    const history = await request<ChatMessageFromAPI[]>(
      `/api/history/${tenantId}/Group/general?limit=1`,
      { headers: authHeader(token) }
    ).catch(() => [] as ChatMessageFromAPI[]);

    const groups = new Set<string>(["general"]);

    // Extract any group IDs from the messages
    for (const msg of history) {
      if (msg.channel_id) {
        groups.add(msg.channel_id);
      }
    }

    return Array.from(groups);
  } catch {
    return ["general"];
  }
}

/**
 * Map HTTP error codes to user-friendly messages.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return error.message || "Invalid input. Please check your fields.";
      case 401:
        return "Invalid credentials. Please try again.";
      case 404:
        return "Workspace not found. Check the workspace ID.";
      case 409:
        return error.message || "Already exists.";
      case 429:
        return "This workspace has reached its 10-user limit.";
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}
