import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import studentService from '../services/studentService';
import analyticsService from '../services/analyticsService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [counselor, setCounselor] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authService.getCurrentUser();
      if (data?.user) {
        setUser(data.user);
        if (data.student) {
          setStudent(data.student);
          setCounselor(data.counselor || null);
        } else if (data.user.studentId) {
          const studentData = await studentService.getStudent(data.user.studentId);
          setStudent(studentData?.student || null);
          setCounselor(studentData?.counselor || null);
        }
      } else {
        setUser(null);
        setStudent(null);
        setCounselor(null);
      }
    } catch {
      setUser(null);
      setStudent(null);
      setCounselor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setStudent(data.student || null);
    setCounselor(data.counselor || null);
    analyticsService.track('LOGIN_COMPLETED', { userId: data.user.userId, email: data.user.email });
    return data;
  };

  const signup = async (formData) => {
    const data = await authService.signup(formData);
    setUser(data.user);
    setStudent(data.student || null);
    setCounselor(data.counselor || null);
    analyticsService.track('SIGNUP_COMPLETED', { userId: data.user.userId, email: data.user.email });
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setStudent(null);
    setCounselor(null);
  };

  const refreshStudentProfile = async () => {
    if (student?.studentId) {
      try {
        const data = await studentService.getStudent(student.studentId);
        setStudent(data.student || null);
        setCounselor(data.counselor || null);
      } catch (err) {
        console.error('Failed to refresh student profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        counselor,
        isAuthenticated: Boolean(user),
        loading,
        login,
        signup,
        logout,
        refreshStudentProfile,
        setStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
