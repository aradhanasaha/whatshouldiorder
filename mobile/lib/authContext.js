import { createContext, useContext } from 'react';

// Provides signOut() to screens (e.g. on a 401 or a Log out button).
export const AuthContext = createContext({ signOut: () => {} });
export const useAuth = () => useContext(AuthContext);
