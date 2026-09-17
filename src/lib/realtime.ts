import { normalizeProject } from './apiSync';

type RealtimeEventType =
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'USERS_UPDATED'
  | 'APPROVALS_UPDATED'
  | 'CONFIG_UPDATED'
  | 'PRESENCE_UPDATE'
  | 'PING'
  | 'CONNECTED';

export interface RealtimeMessage {
  type: RealtimeEventType | string;
  payload?: any;
  data?: any;
  timestamp?: string;
}

export type RealtimeListener = (message: RealtimeMessage) => void;

export interface RealtimeSyncStatus {
  status: 'connected' | 'reconnecting' | 'offline';
  mode: 'websocket' | 'sse' | 'polling';
  activeDevices: number;
  lastSyncTime: string;
  databaseVersion: number;
  serverHost: string;
  serverProvider: string;
}

class RealtimeClientManager {
  private socket: WebSocket | null = null;
  private sseSource: EventSource | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private statusListeners: Set<(status: RealtimeSyncStatus) => void> = new Set();
  private isConnecting = false;
  private reconnectInterval = 2000;
  private maxReconnectInterval = 25000;
  private connectedUsersCount = 1;
  private activeMode: 'websocket' | 'sse' | 'polling' = 'polling';
  private connectionStatus: 'connected' | 'reconnecting' | 'offline' = 'reconnecting';
  private lastSyncTime: string = new Date().toISOString();
  private lastKnownVersion = 0;
  private serverHost = 'eradashboard.com.et';
  private serverProvider = 'Ethio Telecom (eradashboard.com.et)';
  private pollingTimer: any = null;
  private watchdogTimer: any = null;
  private lastMessageReceivedAt = Date.now();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init(): void {
    // 1. Establish primary WebSocket connection
    this.connectWebSocket();

    // 2. Establish fallback SSE stream in parallel
    this.connectSSE();

    // 3. Start high-reliability synchronization polling daemon (detects out-of-sync events across networks)
    this.startSyncPollingDaemon();

    // 4. Start client-side WebSocket watchdog (detects silent half-open TCP connections or proxy drops)
    this.startWatchdog();

    // 5. Handle tab visibility and network online transitions
    window.addEventListener('online', () => {
      this.connectionStatus = 'reconnecting';
      this.notifyStatusChanged();
      this.reconnectAll();
      this.forceSyncNow();
    });

    window.addEventListener('offline', () => {
      this.connectionStatus = 'offline';
      this.notifyStatusChanged();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Tab brought to foreground - instantly verify synchronization
        this.forceSyncNow();
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          this.connectWebSocket();
        }
      }
    });

    window.addEventListener('focus', () => {
      this.forceSyncNow();
    });
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(() => {
      const silenceDuration = Date.now() - this.lastMessageReceivedAt;
      // If no message or ping received for 35 seconds, connection is considered dead/stale
      if (silenceDuration > 35000) {
        console.warn('⚠️ [Real-time WS] Watchdog detected connection silence. Force-reconnecting WebSocket...');
        if (this.socket) {
          try { this.socket.close(); } catch (e) {}
          this.socket = null;
        }
        this.connectWebSocket();
      }
    }, 10000);
  }

  public connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.activeMode = 'websocket';
        this.connectionStatus = 'connected';
        this.lastMessageReceivedAt = Date.now();
        this.reconnectInterval = 2000; // Reset backoff on success
        console.log('⚡ [Real-time WS] Connected securely to Central Synchronization Server');
        
        this.send('JOIN', { clientTime: new Date().toISOString() });
        this.notifyStatusChanged();
      };

      this.socket.onmessage = (event) => {
        this.lastMessageReceivedAt = Date.now();
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (err) {
          console.warn('[Real-time WS] Malformed message received:', err);
        }
      };

      this.socket.onclose = () => {
        if (this.activeMode === 'websocket') {
          this.connectionStatus = 'reconnecting';
          this.notifyStatusChanged();
        }
        const jitter = Math.random() * 1000;
        const delay = Math.min(this.maxReconnectInterval, this.reconnectInterval + jitter);
        this.reconnectInterval = Math.min(this.maxReconnectInterval, this.reconnectInterval * 1.5);
        setTimeout(() => this.connectWebSocket(), delay);
      };

      this.socket.onerror = () => {
        if (this.activeMode === 'websocket') {
          this.activeMode = this.sseSource && this.sseSource.readyState === EventSource.OPEN ? 'sse' : 'polling';
          this.notifyStatusChanged();
        }
      };
    } catch (err) {
      const delay = Math.min(this.maxReconnectInterval, this.reconnectInterval * 1.5);
      setTimeout(() => this.connectWebSocket(), delay);
    }
  }

  public connectSSE(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.sseSource && this.sseSource.readyState !== EventSource.CLOSED) return;

    try {
      this.sseSource = new EventSource('/api/events');

      this.sseSource.onopen = () => {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          this.activeMode = 'sse';
          this.connectionStatus = 'connected';
          this.notifyStatusChanged();
        }
        console.log('⚡ [Real-time SSE] Server-Sent Events stream active');
      };

      this.sseSource.onmessage = (event) => {
        this.lastMessageReceivedAt = Date.now();
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (err) {}
      };

      this.sseSource.onerror = () => {
        if (this.activeMode === 'sse') {
          this.connectionStatus = 'reconnecting';
          this.notifyStatusChanged();
        }
      };
    } catch (e) {
      console.warn('[Real-time SSE] SSE init error:', e);
    }
  }

  private reconnectAll(): void {
    try {
      if (this.socket) {
        this.socket.close();
      }
    } catch (e) {}
    try {
      if (this.sseSource) {
        this.sseSource.close();
      }
    } catch (e) {}
    this.connectWebSocket();
    this.connectSSE();
  }

  private startSyncPollingDaemon(): void {
    // Poll every 6 seconds to ensure data integrity across multi-device networks even during sleep/wake
    this.pollingTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/status');
        if (res.ok) {
          const info = await res.json();
          if (info && info.stats) {
            this.connectedUsersCount = info.realtimeClients || this.connectedUsersCount;
            const newVersion = info.stats.version || 0;
            
            if (info.serverHost) this.serverHost = info.serverHost;
            if (info.serverProvider) this.serverProvider = info.serverProvider;

            // If server database version has changed, pull latest changes
            if (this.lastKnownVersion > 0 && newVersion > this.lastKnownVersion) {
              console.log(`⚡ [Real-time Sync Daemon] Detected new database version (${newVersion} vs ${this.lastKnownVersion}). Triggering sync.`);
              this.forceSyncNow();
            }
            this.lastKnownVersion = newVersion;
            this.lastSyncTime = new Date().toISOString();

            if (this.connectionStatus !== 'connected') {
              this.connectionStatus = 'connected';
            }
            this.notifyStatusChanged();
          }
        }
      } catch (e) {
        if (navigator.onLine === false) {
          this.connectionStatus = 'offline';
          this.notifyStatusChanged();
        }
      }
    }, 6000);
  }

  public async forceSyncNow(): Promise<void> {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.projects)) {
          const deletedSet = new Set<string>(data.deletedIds || []);
          const normalizedProjs = data.projects
            .filter((p: any) => p && p.id && !deletedSet.has(p.id))
            .map((p: any) => normalizeProject(p));

          localStorage.setItem('era_proj_v28', JSON.stringify(normalizedProjs));
          window.dispatchEvent(new CustomEvent('realtime_project_updated', { detail: normalizedProjs }));
          window.dispatchEvent(new CustomEvent('local_project_mutated'));
        }
      }

      // Also sync users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData && Array.isArray(uData.users) && uData.users.length > 0) {
          localStorage.setItem('era_users_v28', JSON.stringify(uData.users));
          window.dispatchEvent(new CustomEvent('realtime_users_updated', { detail: uData.users }));
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this.notifyStatusChanged();
    } catch (e) {
      console.warn('Manual sync error:', e);
    }
  }

  private handleIncomingMessage(msg: RealtimeMessage): void {
    if (!msg || !msg.type) return;
    const typeStr = (msg.type || '').toUpperCase();
    const rawData = msg.payload !== undefined ? msg.payload : msg.data;

    if (typeStr === 'PING') {
      this.send('PONG', { time: new Date().toISOString() });
      return;
    }

    if (typeStr === 'PRESENCE_UPDATE' || typeStr === 'CONNECTED') {
      const count = rawData?.activeUsers || (typeof rawData === 'number' ? rawData : null);
      if (typeof count === 'number') {
        this.connectedUsersCount = count;
        this.notifyStatusChanged();
      }
      return;
    }

    // Handle incoming real-time data synchronization
    if (typeStr === 'PROJECT_UPDATED' || typeStr === 'PROJECT_UPDATE') {
      try {
        if (rawData && rawData.id) {
          const normalized = normalizeProject(rawData);
          const existingStr = localStorage.getItem('era_proj_v28') || '[]';
          let projects: any[] = JSON.parse(existingStr);
          if (!Array.isArray(projects)) projects = [];

          const idx = projects.findIndex((p: any) => p.id === normalized.id);
          if (idx >= 0) {
            projects[idx] = normalized;
          } else {
            projects.push(normalized);
          }
          localStorage.setItem('era_proj_v28', JSON.stringify(projects));

          this.lastSyncTime = new Date().toISOString();
          this.notifyStatusChanged();

          // Dispatch window event for React components reactivity
          window.dispatchEvent(new CustomEvent('realtime_project_updated', { detail: normalized }));
          window.dispatchEvent(new CustomEvent('local_project_mutated'));
        }
      } catch (err) {}
    } else if (typeStr === 'PROJECT_DELETED' || typeStr === 'PROJECT_DELETE') {
      try {
        const id = rawData?.id || (typeof rawData === 'string' ? rawData : null);
        const projectName = rawData?.projectName;
        if (id) {
          const deletedStr = localStorage.getItem('era_deleted_project_ids') || '[]';
          const deletedIds: string[] = JSON.parse(deletedStr);
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
          }

          const projStr = localStorage.getItem('era_proj_v28');
          if (projStr) {
            const projs: any[] = JSON.parse(projStr);
            if (Array.isArray(projs)) {
              const filtered = projs.filter((p: any) => p.id !== id);
              localStorage.setItem('era_proj_v28', JSON.stringify(filtered));
            }
          }

          this.lastSyncTime = new Date().toISOString();
          this.notifyStatusChanged();

          window.dispatchEvent(new CustomEvent('project_globally_deleted', { detail: { id, projectName } }));
          window.dispatchEvent(new CustomEvent('local_project_mutated'));
        }
      } catch (err) {}
    } else if (typeStr === 'USERS_UPDATED' || typeStr === 'USERS_UPDATE') {
      try {
        if (Array.isArray(rawData)) {
          const usersStr = localStorage.getItem('era_users_v28') || '[]';
          let currentUsers: any[] = JSON.parse(usersStr);
          if (!Array.isArray(currentUsers)) currentUsers = [];

          rawData.forEach((u: any) => {
            if (!u || !u.username) return;
            const idx = currentUsers.findIndex((x: any) => x.username.toLowerCase() === u.username.toLowerCase());
            if (idx >= 0) currentUsers[idx] = u;
            else currentUsers.push(u);
          });

          localStorage.setItem('era_users_v28', JSON.stringify(currentUsers));
          window.dispatchEvent(new CustomEvent('realtime_users_updated', { detail: currentUsers }));
        } else if (rawData && typeof rawData === 'object' && rawData.deletedUsername) {
          const usersStr = localStorage.getItem('era_users_v28') || '[]';
          let currentUsers: any[] = JSON.parse(usersStr);
          if (Array.isArray(currentUsers)) {
            currentUsers = currentUsers.filter((u: any) => u.username.toLowerCase() !== rawData.deletedUsername.toLowerCase());
            localStorage.setItem('era_users_v28', JSON.stringify(currentUsers));
            window.dispatchEvent(new CustomEvent('realtime_users_updated', { detail: currentUsers }));
          }
        }
        this.lastSyncTime = new Date().toISOString();
        this.notifyStatusChanged();
      } catch (err) {}
    } else if (typeStr === 'APPROVALS_UPDATED' || typeStr === 'APPROVALS_UPDATE') {
      try {
        if (Array.isArray(rawData)) {
          localStorage.setItem('era_appr_v28', JSON.stringify(rawData));
          window.dispatchEvent(new CustomEvent('realtime_approvals_updated', { detail: rawData }));
          this.lastSyncTime = new Date().toISOString();
          this.notifyStatusChanged();
        }
      } catch (err) {}
    } else if (typeStr === 'CONFIG_UPDATED' || typeStr === 'CONFIG_UPDATE') {
      try {
        if (rawData) {
          if (rawData.taxonomy) {
            const { pmos, directorates } = rawData.taxonomy;
            if (pmos) localStorage.setItem('era_pmo_taxonomy', JSON.stringify(pmos));
            if (directorates) localStorage.setItem('era_directorates_taxonomy', JSON.stringify(directorates));
          }
          if (rawData.pmos) localStorage.setItem('era_pmo_taxonomy', JSON.stringify(rawData.pmos));
          if (rawData.directorates) localStorage.setItem('era_directorates_taxonomy', JSON.stringify(rawData.directorates));
          if (rawData.contractorWeights) localStorage.setItem('era_contractor_scoring_weights', JSON.stringify(rawData.contractorWeights));
          if (rawData.consultantWeights) localStorage.setItem('era_consultant_scoring_weights', JSON.stringify(rawData.consultantWeights));

          window.dispatchEvent(new CustomEvent('realtime_config_updated', { detail: rawData }));
          this.lastSyncTime = new Date().toISOString();
          this.notifyStatusChanged();
        }
      } catch (err) {}
    }

    // Notify registered listeners
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (e) {}
    });
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStatus(listener: (status: RealtimeSyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatusChanged(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => {
      try { fn(status); } catch (e) {}
    });
    window.dispatchEvent(new CustomEvent('realtime_status_changed', { detail: status }));
  }

  public send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  public getStatus(): RealtimeSyncStatus {
    const isSocketOpen = this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    const isSSEOpen = this.sseSource !== null && this.sseSource.readyState === EventSource.OPEN;

    let status: 'connected' | 'reconnecting' | 'offline' = 'connected';
    if (!navigator.onLine) {
      status = 'offline';
    } else if (!isSocketOpen && !isSSEOpen) {
      status = 'reconnecting';
    }

    let mode: 'websocket' | 'sse' | 'polling' = 'polling';
    if (isSocketOpen) mode = 'websocket';
    else if (isSSEOpen) mode = 'sse';

    return {
      status,
      mode,
      activeDevices: Math.max(1, this.connectedUsersCount),
      lastSyncTime: this.lastSyncTime,
      databaseVersion: this.lastKnownVersion,
      serverHost: this.serverHost,
      serverProvider: this.serverProvider
    };
  }

  public getConnectedUsersCount(): number {
    return Math.max(1, this.connectedUsersCount);
  }

  public isConnected(): boolean {
    return this.getStatus().status === 'connected';
  }
}

export const realtimeManager = new RealtimeClientManager();
