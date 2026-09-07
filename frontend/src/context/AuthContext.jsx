import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('raise_token');
    if (token) {
      authService.me()
        .then(res => {
          setUser(res.data.user);
          setProfile(res.data.profile);
        })
        .catch(() => {
          localStorage.removeItem('raise_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const { access_token, user: u, profile: p } = res.data;
    localStorage.setItem('raise_token', access_token);
    setUser(u);
    setProfile(p);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('raise_token');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
