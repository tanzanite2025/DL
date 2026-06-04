import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useI18n } from '../i18n/I18nContext';
import { User as UserIcon, Plus, Trash2, ChevronDown } from 'lucide-react';
import { Role, ShowToast } from '../types';
import { useUsersAndRoles } from '../hooks/useUsersAndRoles';

interface UsersPermissionsProps {
  token: string;
  currentUserId: string;
  showToast: ShowToast;
  onRefreshPermissions: () => void;
}

export const UsersPermissions: React.FC<UsersPermissionsProps> = ({
  token: _token,
  currentUserId,
  showToast,
  onRefreshPermissions
}) => {
  const { t } = useI18n();
  const { users, roles, isLoading, createUser, updateUserRole, deleteUser, createRole, deleteRole, togglePermission, updateRolePermissions } = useUsersAndRoles();
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // 新增用户表单
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');

  // 新增角色表单
  const [newRoleName, setNewRoleName] = useState('');

  // 批量权限操作目标用户
  const [bulkTargetUserId, setBulkTargetUserId] = useState<string>('');

  // 角色加载后设置默认选中
  React.useEffect(() => {
    if (roles.length > 0 && !newUserRoleId) {
      setNewUserRoleId(roles[0].id);
    }
  }, [roles]);

  // 删除角色
  const handleDeleteRole = async (roleId: string, isProtected: boolean) => {
    if (isProtected) {
      showToast(t('errCannotDeleteProtectedRole'), 'error');
      return;
    }
    if (!window.confirm(t('deleteRoleConfirm'))) {
      return;
    }
    try {
      await deleteRole(roleId);
      showToast(t('roleDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || '删除角色出错', 'error');
    }
  };

  // 新增账号
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newUserRoleId) {
      showToast(t('errUserFormEmpty'), 'error');
      return;
    }

    try {
      await createUser({ username: newUsername, password: newPassword, roleId: newUserRoleId });
      showToast(t('userCreatedSuccess'), 'success');
      setNewUsername('');
      setNewPassword('');
    } catch (error: any) {
      showToast(error.message || '创建账号出错', 'error');
    }
  };

  // 修改用户角色
  const handleUpdateUserRole = async (userId: string, roleId: string) => {
    try {
      await updateUserRole(userId, roleId);
      showToast(t('userRoleUpdatedSuccess'), 'success');
      if (userId === currentUserId) {
        onRefreshPermissions();
      }
    } catch (error: any) {
      showToast(error.message || '更新用户角色失败', 'error');
    }
  };

  // 删除账号
  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      showToast(t('errCannotDeleteSelf'), 'error');
      return;
    }

    if (!window.confirm(t('deleteUserConfirm'))) {
      return;
    }

    try {
      await deleteUser(userId);
      showToast(t('userDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || '注销失败', 'error');
    }
  };

  // 新增角色
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      await createRole(newRoleName);
      showToast(t('roleCreatedSuccess'), 'success');
      setNewRoleName('');
    } catch (error: any) {
      showToast(error.message || '创建角色出错', 'error');
    }
  };

  // 切换矩阵权限勾选（采用乐观更新）
  const handleTogglePermission = async (roleId: string, permissionKey: keyof Omit<Role, 'id' | 'name' | 'protected'>) => {
    try {
      await togglePermission(roleId, permissionKey);
      const currentUser = users.find(u => u.id === currentUserId);
      if (currentUser && currentUser.roleId === roleId) {
        onRefreshPermissions();
      }
    } catch (error: any) {
      showToast(error.message || '保存权限配置失败', 'error');
    }
  };

  // 批量全选/清空权限（基于选中的操作员 -> 其角色）
  const handleBulkSetPermissions = async (mode: 'all' | 'none') => {
    if (!bulkTargetUserId) {
      showToast('请先选择一个操作员', 'error');
      return;
    }

    const user = users.find((u) => u.id === bulkTargetUserId);
    if (!user) {
      showToast('未找到该操作员', 'error');
      return;
    }

    const role = roles.find((r) => r.id === user.roleId);
    if (!role) {
      showToast('未找到该角色', 'error');
      return;
    }

    const value = mode === 'all';
    // 批量操作：对该角色的所有模块访问与金额可见权限一并全选/清空
    // 系统管理员角色在后端有硬保护，这里可以放心统一处理
    const payload = {
      canAccessUsers: value,
      canAccessWarehouse: value,
      canAccessProducts: value,
      canAccessGoods: value,
      canAccessFinance: value,
      canAccessSales: value,
      canAccessAfterSales: value,
      canAccessPurchase: value,
      canAccessAssembly: value,
      canViewCost: value,
      canViewSalesPrice: value,
    };

    try {
      await updateRolePermissions(role.id, payload);
      // 如果当前登录用户使用的就是这个角色，刷新权限
      if (user.id === currentUserId) {
        onRefreshPermissions();
      }
      showToast('角色权限已更新', 'success');
    } catch (error: any) {
      showToast(error.message || '保存权限配置失败', 'error');
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">
          {t('loading')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* 页眉 - 已隐藏（保留代码便于定位） */}
      <UdsHeader
        className="hidden"
        title={t('authMatrix')}
        description={t('authMatrixDesc')}
      />

      <div className="grid grid-cols-1 gap-8 items-start">
        {/* 账号管理与新增 */}
        <div className="flex flex-col gap-8">
          <UdsCard title={t('operatorManagement')}>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
              {/* 左侧：账号列表，占据更多宽度 */}
              <div className="xl:col-span-2">
                <div className="overflow-x-auto w-full mb-2 xl:mb-0">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-solid border-white/10">
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                          {t('operatorColumn')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                          {t('roleConfigColumn')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                          {t('actionsColumn')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-solid border-white/5 hover:bg-white/2 transition-all"
                        >
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-2">
                              <UserIcon size={14} className="text-neutral-400" />
                              <span className="text-sm font-semibold text-neutral-200">{user.username}</span>
                              {user.id === currentUserId && (
                                <UdsBadge status="healthy">{t('you')}</UdsBadge>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="relative">
                              <select
                                className="h-9 w-full pl-3 pr-8 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer appearance-none"
                                value={user.roleId}
                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id} className="bg-[#121214] text-white">
                                    {`【角色】${r.name}`}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                            </div>
                          </td>
                          <td className="py-3 text-right pr-2">
                            <UdsButton
                              variant="ghost"
                              className="h-8 w-8 !p-0 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-none"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === currentUserId}
                            >
                              <Trash2 size={12} />
                            </UdsButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 中间：创建新账号表单 */}
              <div className="border-t xl:border-t-0 xl:border-l border-solid border-white/10 pt-4 xl:pt-0 xl:pl-4">
                <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {t('createNewAccount')}
                    </span>
                    <UdsButton
                      type="submit"
                      variant="secondary"
                      className="whitespace-nowrap shrink-0 text-[10px]"
                    >
                      <Plus size={12} className="mr-1" /> {t('createButton')}
                    </UdsButton>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3 items-end">
                    <div>
                      <UdsInput
                        placeholder={t('usernamePlaceholder')}
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <UdsInput
                        type="password"
                        placeholder={t('passwordPlaceholder2')}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <UdsSelect
                        options={roles.map(r => ({ value: r.id, label: `【角色】${r.name}` }))}
                        value={newUserRoleId}
                        onChange={(e) => setNewUserRoleId(e.target.value)}
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="border-t xl:border-t-0 xl:border-l border-solid border-white/10 pt-4 xl:pt-0 xl:pl-4">
                <form onSubmit={handleCreateRole} className="flex flex-col gap-3">
                  <UdsInput
                    label={t('newRoleCodeName')}
                    placeholder={t('roleNamePlaceholder')}
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    required
                  />
                  <div className="flex md:justify-end">
                    <UdsButton type="submit" variant="secondary" className="w-full md:w-auto whitespace-nowrap shrink-0">
                      <Plus size={12} className="mr-1" /> {t('createRoleButton')}
                    </UdsButton>
                  </div>
                </form>
              </div>
            </div>
          </UdsCard>
        </div>

        {/* 角色页面权限矩阵 */}
        <div className="flex flex-col gap-8">
          <UdsCard title={t('rolePermissionMatrix')}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                {t('rolePermissionMatrixDesc')}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-neutral-500 whitespace-nowrap">
                    {t('bulkPermissionUserLabel')}
                  </span>
                  <select
                    className="h-8 px-3 rounded-2xl border-none bg-[#1c1c1e]/70 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 cursor-pointer"
                    value={bulkTargetUserId}
                    onChange={(e) => setBulkTargetUserId(e.target.value)}
                  >
                    <option value="">--</option>
                    {users.map((u) => {
                      const role = roles.find((r) => r.id === u.roleId);
                      const label = role ? role.name : u.username;
                      return (
                        <option key={u.id} value={u.id} className="bg-[#121214] text-white">
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <UdsButton
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest"
                    onClick={() => handleBulkSetPermissions('all')}
                    disabled={!bulkTargetUserId}
                  >
                    {t('bulkSelectAllPermissions')}
                  </UdsButton>
                  <UdsButton
                    type="button"
                    variant="ghost"
                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest"
                    onClick={() => handleBulkSetPermissions('none')}
                    disabled={!bulkTargetUserId}
                  >
                    {t('bulkClearAllPermissions')}
                  </UdsButton>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-wider text-neutral-500 pb-3 pl-2 whitespace-pre-line leading-tight">
                      {t('roleNameColumn')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionUsers')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionWarehouse')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionProducts')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionGoods')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionFinance')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionSales')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      售后管理
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionPurchase')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionAssembly')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-wider text-neutral-500 pb-3 text-center whitespace-pre-line leading-tight px-1">
                      {t('permissionViewCost')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                      {t('actionsColumn')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr
                      key={role.id}
                      className="border-b border-solid border-white/5 hover:bg-white/2 transition-all"
                    >
                      <td className="py-4 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black italic uppercase text-neutral-200">{role.name}</span>
                          {role.protected && (
                            <UdsBadge status="healthy">{t('systemBuiltIn')}</UdsBadge>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessUsers}
                          onChange={() => handleTogglePermission(role.id, 'canAccessUsers')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>

                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessWarehouse}
                          onChange={() => handleTogglePermission(role.id, 'canAccessWarehouse')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>

                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessProducts}
                          onChange={() => handleTogglePermission(role.id, 'canAccessProducts')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>

                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessGoods}
                          onChange={() => handleTogglePermission(role.id, 'canAccessGoods')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>

                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessFinance}
                          onChange={() => handleTogglePermission(role.id, 'canAccessFinance')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessSales}
                          onChange={() => handleTogglePermission(role.id, 'canAccessSales')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={(role as any).canAccessAfterSales ?? false}
                          onChange={() => handleTogglePermission(role.id, 'canAccessAfterSales' as any)}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessPurchase}
                          onChange={() => handleTogglePermission(role.id, 'canAccessPurchase')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={role.canAccessAssembly}
                          onChange={() => handleTogglePermission(role.id, 'canAccessAssembly')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input
                          type="checkbox"
                          checked={!!role.canViewCost}
                          onChange={() => handleTogglePermission(role.id, 'canViewCost')}
                          className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                        />
                      </td>
                      <td className="py-4 text-right pr-2">
                        <UdsButton
                          variant="ghost"
                          className="h-8 w-8 !p-0 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-none"
                          onClick={() => handleDeleteRole(role.id, role.protected)}
                          disabled={role.protected}
                        >
                          <Trash2 size={12} />
                        </UdsButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </UdsCard>
        </div>
      </div>
      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="users"
        title={'用户/角色审计'}
      />
    </div>
  );
};
