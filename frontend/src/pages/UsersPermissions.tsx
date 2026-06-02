import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge } from '../components/uds/UdsComponents';
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
  const { users, roles, isLoading, createUser, updateUserRole, deleteUser, createRole, deleteRole, togglePermission } = useUsersAndRoles();

  // 新增用户表单
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');

  // 新增角色表单
  const [newRoleName, setNewRoleName] = useState('');

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：账号管理与新增 */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <UdsCard title={t('operatorManagement')}>
            <div className="overflow-x-auto w-full mb-6">
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
                                {r.name}
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

            {/* 创建新账号 */}
            <form onSubmit={handleCreateUser} className="border-t border-solid border-white/10 pt-6 flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                {t('createNewAccount')}
              </span>
              <div className="grid grid-cols-2 gap-4">
                <UdsInput
                  placeholder={t('usernamePlaceholder')}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
                <UdsInput
                  type="password"
                  placeholder={t('passwordPlaceholder2')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-4 items-end">
                <UdsSelect
                  options={roles.map(r => ({ value: r.id, label: r.name }))}
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value)}
                />
                <UdsButton type="submit" variant="secondary" className="whitespace-nowrap shrink-0">
                  <Plus size={12} className="mr-1" /> {t('createButton')}
                </UdsButton>
              </div>
            </form>
          </UdsCard>
        </div>

        {/* 右侧：权限矩阵配置 */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <UdsCard title={t('rolePermissionMatrix')}>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-6">
              {t('rolePermissionMatrixDesc')}
            </p>

            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                      {t('roleNameColumn')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionUsers')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionWarehouse')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionProducts')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionGoods')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionFinance')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionSales')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionPurchase')}
                    </th>
                    <th className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('permissionAssembly')}
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

            {/* 新增角色 */}
            <form onSubmit={handleCreateRole} className="border-t border-solid border-white/10 pt-6 flex gap-4 items-end">
              <div className="flex-1">
                <UdsInput
                  label={t('newRoleCodeName')}
                  placeholder={t('roleNamePlaceholder')}
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>
              <UdsButton type="submit" variant="secondary">
                <Plus size={12} className="mr-1" /> {t('createRoleButton')}
              </UdsButton>
            </form>
          </UdsCard>
        </div>
      </div>
    </div>
  );
};
