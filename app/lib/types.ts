// ── Auth API Types ──

export interface CreateTenantRequest {
  tenant_id: string;
  name: string;
  user_id: string;
  password: string;
  display_name?: string;
}

export interface CreateTenantResponse {
  message: string;
  tenant: Tenant;
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  tenant_id: string;
  user_id: string;
  password: string;
  display_name?: string;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginRequest {
  tenant_id: string;
  user_id: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Tenant {
  tenant_id: string;
  name: string;
  max_users: number;
}

export interface TenantInfo {
  tenant_id: string;
  name: string;
  created_at: string;
  user_count: number;
  max_users: number;
  users: User[];
}

export interface User {
  tenant_id: string;
  user_id: string;
  display_name: string;
  role?: "admin" | "member";
  created_at?: string;
}

// ── WebSocket Message Types ──

export type WSChannelType = "DM" | "GROUP";

export interface WSOutgoingDM {
  channel_type: "DM";
  user_id: string;
  content: string;
}

export interface WSOutgoingGroup {
  channel_type: "GROUP";
  user_id: string;
  content: string;
}

export interface WSGroupAction {
  msg_type: "JOIN" | "LEAVE" | "CREATE" | "DELETE";
  tenant_id: string;
  group_id: string;
  user_id: string;
}

export interface WSIncomingMessage {
  type: "chat" | "group_join" | "group_leave" | "group_message";
  message_id: string;
  tenant_id: string;
  channel_type: WSChannelType;
  channel_id: string;
  sender_id: string;
  timestamp: number;
  conversation_id: string;
  payload: {
    text: string;
    meta: Record<string, unknown>;
  };
}

// ── App State Types ──

export interface ChatMessage {
  id: string;
  channelType: WSChannelType;
  channelId: string;
  senderId: string;
  text: string;
  timestamp: number;
  conversationId: string;
  type: string;
}

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface APIError {
  message: string;
  status: number;
}
