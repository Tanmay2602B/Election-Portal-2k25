import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextInstance';

export function useAuth() {
  return useContext(AuthContext);
}