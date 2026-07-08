import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CognitoUserPool, 
  CognitoUser, 
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import { fetchApi } from './api';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID
};
// Only instantiate Cognito if configured
const userPool = poolData.UserPoolId ? new CognitoUserPool(poolData) : null;
const isLocalAuth = !poolData.UserPoolId;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLocalAuth: boolean;
  login: (email: string, password: string) => Promise<UserProfile | any>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  confirmSignup: (email: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    if (isLocalAuth) {
      if (localStorage.getItem('id_token')) {
        fetchUserProfile();
      } else {
        setLoading(false);
      }
      return;
    }

    const cognitoUser = userPool!.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession(async (err: any, session: any) => {
        if (err || !session.isValid()) {
          logout();
          setLoading(false);
          return;
        }
        localStorage.setItem('id_token', session.getIdToken().getJwtToken());
        await fetchUserProfile();
      });
    } else {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const profile = await fetchApi('/users/me');
      setUser(profile);
      return profile;
    } catch (e) {
      console.error('Failed to fetch profile', e);
      logout();
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const login = (email: string, password: string): Promise<any> => {
    if (isLocalAuth) {
      return fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }).then(async (res) => {
        localStorage.setItem('id_token', res.token);
        return await fetchUserProfile();
      });
    }

    return new Promise((resolve, reject) => {
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (result) => {
          localStorage.setItem('id_token', result.getIdToken().getJwtToken());
          const profile = await fetchUserProfile();
          resolve(profile);
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  };

  const signup = (email: string, password: string, name: string): Promise<void> => {
    if (isLocalAuth) {
      return fetchApi('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      }).then(() => {});
    }

    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name })
      ];
      userPool!.signUp(email, password, attributeList, [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  const confirmSignup = (email: string, code: string): Promise<void> => {
    if (isLocalAuth) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool! });
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };

  const logout = () => {
    if (!isLocalAuth) {
      const cognitoUser = userPool!.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    }
    localStorage.removeItem('id_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLocalAuth, login, signup, confirmSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
