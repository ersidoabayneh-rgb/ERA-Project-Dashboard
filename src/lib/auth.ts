export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

let currentUser: User | null = null;
const authListeners: Array<(user: User | null) => void> = [];

export const auth = {
  get currentUser() {
    return currentUser;
  }
};

export function initAuth(
  _onAuthSuccess?: (user: User, token: string) => void,
  _onAuthFailure?: () => void
): () => void {
  // Application authentication managed locally / via application users
  return () => {};
}

export async function signOutUser(): Promise<void> {
  currentUser = null;
  authListeners.forEach(listener => listener(currentUser));
}

export async function getAccessToken(): Promise<string | null> {
  return null;
}

