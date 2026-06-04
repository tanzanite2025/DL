import { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { usersApi, rolesApi } from '../services/api';

export function useUsersAndRoles() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        usersApi.list(),
        rolesApi.list(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- User operations ---
  const createUser = async (data: { username: string; password: string; roleId: string }) => {
    const result = await usersApi.create(data);
    await fetchData();
    return result;
  };

  const updateUserRole = async (userId: string, roleId: string) => {
    const result = await usersApi.update(userId, { roleId });
    await fetchData();
    return result;
  };

  const deleteUser = async (userId: string) => {
    const result = await usersApi.delete(userId);
    await fetchData();
    return result;
  };

  // --- Role operations ---
  const createRole = async (name: string) => {
    const result = await rolesApi.create(name);
    await fetchData();
    return result;
  };

  const updateRolePermissions = async (roleId: string, data: Record<string, any>) => {
    const result = await rolesApi.update(roleId, data);
    await fetchData();
    return result;
  };

  const deleteRole = async (roleId: string) => {
    const result = await rolesApi.delete(roleId);
    await fetchData();
    return result;
  };

  // --- Permission toggle (optimistic update) ---
  const togglePermission = async (roleId: string, permissionKey: keyof Omit<Role, 'id' | 'name' | 'protected'>) => {
    const roleToUpdate = roles.find(r => r.id === roleId);
    if (!roleToUpdate) return;

    const updatedPermissions = {
      canAccessUsers: roleToUpdate.canAccessUsers,
      canAccessWarehouse: roleToUpdate.canAccessWarehouse,
      canAccessProducts: roleToUpdate.canAccessProducts,
      canAccessGoods: roleToUpdate.canAccessGoods,
      canAccessFinance: roleToUpdate.canAccessFinance,
      canAccessSales: roleToUpdate.canAccessSales,
      canAccessAfterSales: (roleToUpdate as any).canAccessAfterSales ?? false,
      canAccessPurchase: roleToUpdate.canAccessPurchase,
      canAccessAssembly: roleToUpdate.canAccessAssembly,
      canViewCost: roleToUpdate.canViewCost ?? false,
      canViewSalesPrice: roleToUpdate.canViewSalesPrice ?? false,
      [permissionKey]: !roleToUpdate[permissionKey],
    };

    // Optimistic update
    setRoles(prev => prev.map(r => (r.id === roleId ? { ...r, ...updatedPermissions } : r)));

    try {
      await rolesApi.update(roleId, updatedPermissions);
    } catch {
      // Rollback on failure
      setRoles(prev => prev.map(r => (r.id === roleId ? roleToUpdate : r)));
      throw new Error('保存权限配置失败');
    }
  };

  return {
    users, roles, isLoading, fetchData,
    createUser, updateUserRole, deleteUser,
    createRole, updateRolePermissions, deleteRole, togglePermission,
  };
}
