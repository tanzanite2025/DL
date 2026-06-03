import React from 'react';
import { ChevronDown } from 'lucide-react';

// ==========================================
// 1. 按钮组件 (UdsButton)
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'critical';
  children: React.ReactNode;
}

export const UdsButton: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";
  
  let variantStyle = "";
  if (variant === 'primary') {
    // 主操作：rounded-full (大胶囊) + h-11 + font-black + text-[10px] + uppercase + tracking-widest
    variantStyle = "rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest bg-white text-black hover:bg-neutral-200";
  } else if (variant === 'secondary') {
    // 辅助按钮
    variantStyle = "rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest bg-[#1c1c1e] text-white border border-[#2c2c2e] hover:bg-neutral-800";
  } else if (variant === 'ghost') {
    // 辅助/幽灵按钮：text-[10px] + font-black + uppercase
    variantStyle = "rounded-full h-9 px-4 font-black text-[10px] uppercase tracking-widest bg-transparent text-neutral-400 border border-dashed border-neutral-800 hover:text-white hover:border-neutral-600";
  } else if (variant === 'critical') {
    variantStyle = "rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20";
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ==========================================
// 2. 数据卡片 (UdsCard)
// ==========================================
interface CardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'normal' | 'dashed';
}

export const UdsCard: React.FC<CardProps> = ({ title, action, children, className = '', variant = 'dashed' }) => {
  // 数据卡片：rounded-[24px]。列表或详情容器使用 border-dashed 增强工业感。
  const borderStyle = variant === 'dashed' ? 'border border-transparent' : 'border border-[#1c1c1e]';
  return (
    <div className={`relative overflow-hidden rounded-[24px] ${borderStyle} bg-[#121214] p-6 ${className}`}>
      {/* 细节点缀：在 Card 顶部使用 bg-gradient-to-br from-primary/5 via-transparent 增加深度感 */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-transparent pointer-events-none" />
      
      {(title || action) && (
        <div className="relative z-10 flex items-center justify-between mb-4 border-b border-solid border-white/5 pb-3">
          {title && (
            // 二级标题 (Card Title): text-[15px] + font-black + tracking-tighter + italic + uppercase
            <h2 className="text-[15px] font-black tracking-tighter italic uppercase text-neutral-200">
              {title}
            </h2>
          )}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ==========================================
// 3. 标签组件 (UdsBadge)
// ==========================================
interface BadgeProps {
  status?: 'healthy' | 'alert' | 'critical' | 'default';
  children: React.ReactNode;
  className?: string;
}

export const UdsBadge: React.FC<BadgeProps> = ({ status = 'default', children, className = '' }) => {
  // Badge: 胶囊型 (rounded-full)，高度 h-4 或 h-5，字体 text-[8px] font-mono。
  let statusStyle = "bg-[#1c1c1e] text-neutral-400";
  if (status === 'healthy') {
    // HEALTHY: Emerald-500/10 背景 + 600 文字
    statusStyle = "bg-emerald-500/10 text-emerald-600 font-semibold";
  } else if (status === 'alert') {
    // ALERT: Amber-500/10 背景 + 600 文字
    statusStyle = "bg-amber-500/10 text-amber-600 font-semibold";
  } else if (status === 'critical') {
    // CRITICAL: Rose-500/10 背景 + 600 文字 (加 animate-pulse)
    statusStyle = "bg-rose-500/10 text-rose-600 font-semibold animate-pulse-fast";
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-full h-5 px-2.5 text-[8px] font-mono uppercase tracking-widest ${statusStyle} ${className}`}>
      {children}
    </span>
  );
};

// ==========================================
// 4. 模块级页眉 (UdsHeader)
// ==========================================
interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const UdsHeader: React.FC<HeaderProps> = ({ title, description, actions, className = '' }) => {
  // 模块级页眉：rounded-[32px] 物理大圆角，必须配合 border-dashed (虚线边框) 和 bg-muted/5
  return (
    <div className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:px-8 md:py-6 rounded-[32px] bg-[#1c1c1e]/20 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-transparent pointer-events-none rounded-[32px]" />
      <div className="relative z-10 flex flex-col gap-1.5">
        {/* 一级标题 (Module Title): text-[16px] + font-black + tracking-tighter + italic + uppercase */}
        <h1 className="text-[16px] font-black tracking-tighter italic uppercase text-white">
          {title}
        </h1>
        {description && (
          // 辅助描述: text-[9px] + font-black + uppercase + tracking-widest + opacity-60
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 opacity-60">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="relative z-10 flex items-center gap-2">{actions}</div>}
    </div>
  );
};

// ==========================================
// 5. 表单输入框 (UdsInput)
// ==========================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const UdsInput: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  // 表单控件：Input/Select 统一 h-12 + rounded-2xl + border-none + bg-muted/50
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        // 标签与表头 (Labels/Table Headers): text-[10px] + font-black + uppercase + tracking-widest
        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </label>
      )}
      <input
        className={`h-12 w-full px-4 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider pl-1">
          {error}
        </span>
      )}
    </div>
  );
};

// ==========================================
// 6. 表单下拉框 (UdsSelect)
// ==========================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const UdsSelect: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`h-12 w-full pl-4 pr-10 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer appearance-none ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#121214] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
      </div>
      {error && (
        <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider pl-1">
          {error}
        </span>
      )}
    </div>
  );
};

// ==========================================
// 7. 物理进度条 (UdsProgressBar)
// ==========================================
export const UdsProgressBar: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
  // 进度条：h-1 极细设计，背景 bg-muted/30
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1 bg-[#1c1c1e]/30 rounded-full overflow-hidden">
      <div 
        className="h-full bg-white transition-all duration-300 ease-out" 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
