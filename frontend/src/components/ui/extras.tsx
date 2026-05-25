import { Image as IKImage } from '@imagekit/react';
import { ChevronRight, Image as ImageIcon, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { uploadImageToImageKit } from '../../lib/imagekit';

// ─── Tooltip ─────────────────────────────────────────────────

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
            positions[side]
          )}
        >
          {content}
          <div
            className={cn(
              'absolute h-2 w-2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
              side === 'top' && 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2',
              side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
              side === 'left' && 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2',
              side === 'right' && 'right-full top-1/2 -translate-y-1/2 translate-x-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}

// ─── Popover ─────────────────────────────────────────────────

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
}

export function Popover({ trigger, children, align = 'start' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const alignClass = { start: 'left-0', end: 'right-0', center: 'left-1/2 -translate-x-1/2' }[
    align
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 min-w-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden',
            alignClass
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Drawer ──────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-80',
}: DrawerProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm dark:bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-700',
          width,
          side === 'right' ? 'ml-auto' : 'mr-auto'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Checkbox ────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({ checked, onChange, label, disabled, id }: CheckboxProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-center gap-2.5 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors',
            checked
              ? 'bg-primary-700 border-primary-700'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-primary-400'
          )}
          style={{ width: 18, height: 18 }}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      {label && (
        <span className="text-sm text-slate-700 dark:text-slate-300 select-none">{label}</span>
      )}
    </label>
  );
}

// ─── Radio ───────────────────────────────────────────────────

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  direction?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  options,
  value,
  onChange,
  name,
  direction = 'vertical',
}: RadioGroupProps) {
  return (
    <div
      className={cn('flex gap-3', direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col')}
    >
      {options.map((opt) => (
        <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                value === opt.value
                  ? 'border-primary-700'
                  : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
              )}
            >
              {value === opt.value && <div className="w-2 h-2 rounded-full bg-primary-700" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</p>
            {opt.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ─── Breadcrumbs ─────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          {item.href && index < items.length - 1 ? (
            <a
              href={item.href}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {item.label}
            </a>
          ) : (
            <span
              className={cn(
                index === items.length - 1
                  ? 'text-slate-900 dark:text-slate-100 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── CurrencyInput ────────────────────────────────────────────

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  currency?: 'USD' | 'ZiG';
  onCurrencyChange?: (currency: 'USD' | 'ZiG') => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  currency = 'USD',
  onCurrencyChange,
  label,
  error,
  placeholder = '0.00',
  disabled,
  required,
}: CurrencyInputProps) {
  const id = label?.toLowerCase().replace(/\s+/g, '-') || 'currency-input';
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex">
        {onCurrencyChange ? (
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as 'USD' | 'ZiG')}
            disabled={disabled}
            className="rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="USD">$</option>
            <option value="ZiG">ZiG</option>
          </select>
        ) : (
          <span className="flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {currency === 'USD' ? '$' : 'ZiG'}
          </span>
        )}
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'flex-1 rounded-r-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error && 'border-red-400',
            disabled && 'bg-slate-50 dark:bg-slate-800 cursor-not-allowed'
          )}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── DatePicker ───────────────────────────────────────────────

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  error,
  min,
  max,
  required,
  disabled,
}: DatePickerProps) {
  const id = label?.toLowerCase().replace(/\s+/g, '-') || 'date-picker';
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          error && 'border-red-400',
          disabled && 'bg-slate-50 cursor-not-allowed dark:bg-slate-800'
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── FileUpload (drag-and-drop wrapper for IKUpload) ──────────

interface FileUploadProps {
  onSuccess: (result: { fileId: string; filePath: string; url: string }) => void;
  onError?: (error: Error) => void;
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  preview?: string;
  disabled?: boolean;
}

export function FileUpload({
  onSuccess,
  onError,
  folder,
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 10,
  label,
  hint,
  preview,
  disabled,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError?.(new Error(`File exceeds ${maxSizeMB}MB limit`));
        return;
      }

      try {
        setUploading(true);
        const uploaded = await uploadImageToImageKit(file, {
          fileName: file.name,
          folder,
          useUniqueFileName: true,
        });
        onSuccess(uploaded);
      } catch (err: unknown) {
        onError?.(err instanceof Error ? err : new Error('Upload failed'));
      } finally {
        setUploading(false);
      }
    },
    [folder, maxSizeMB, onError, onSuccess]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        void handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  return (
    <div className="space-y-1">
      {label && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          dragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
          disabled && 'opacity-50 cursor-not-allowed',
          uploading && 'pointer-events-none'
        )}
      >
        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <img src={preview} alt="Preview" className="h-24 object-contain rounded-lg" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Click to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {uploading ? 'Uploading…' : 'Drop file here or click to browse'}
              </p>
              {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Max {maxSizeMB}MB</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileUpload(file);
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ─── IKImageWrapper ───────────────────────────────────────────

interface IKImageWrapperProps {
  filePath: string;
  alt: string;
  transformation?: Array<Record<string, string | number>>;
  className?: string;
  fallback?: React.ReactNode;
  width?: number;
  height?: number;
}

export function IKImageWrapper({
  filePath,
  alt,
  transformation,
  className,
  fallback,
  width,
  height,
}: IKImageWrapperProps) {
  const [error, setError] = useState(false);

  if (!filePath || error) {
    return (
      <div
        className={cn('flex items-center justify-center bg-slate-100 dark:bg-slate-800', className)}
        style={width && height ? { width, height } : undefined}
      >
        {fallback || <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />}
      </div>
    );
  }

  return (
    <IKImage
      src={filePath}
      transformation={transformation}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

// ─── Table ────────────────────────────────────────────────────

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface TableProps<T extends { _id?: string }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedIds?: string[];
  onSelectChange?: (ids: string[]) => void;
  keyExtractor?: (row: T, index: number) => string;
}

export function Table<T extends { _id?: string }>({
  data,
  columns,
  loading,
  emptyState,
  onRowClick,
  selectedIds,
  onSelectChange,
  keyExtractor,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  const allSelected =
    selectedIds && data.length > 0 && data.every((r) => selectedIds.includes(r._id ?? ''));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60">
            {onSelectChange && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={(e) => {
                    if (e.target.checked) onSelectChange(data.map((r) => r._id ?? ''));
                    else onSelectChange([]);
                  }}
                  className="rounded border-slate-300 text-primary-700"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left',
                  col.sortable &&
                    'cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200',
                  col.width && col.width
                )}
                onClick={() => col.sortable && handleSort(String(col.key))}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === String(col.key) && (
                    <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {onSelectChange && <td className="px-4 py-3" />}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="h-4 rounded bg-slate-200 animate-pulse dark:bg-slate-700" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            sortedData.map((row, rowIndex) => {
              const id = keyExtractor ? keyExtractor(row, rowIndex) : (row._id ?? String(rowIndex));
              const isSelected = selectedIds?.includes(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  )}
                >
                  {onSelectChange && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={(e) => {
                          if (e.target.checked) onSelectChange([...(selectedIds ?? []), id]);
                          else onSelectChange((selectedIds ?? []).filter((s) => s !== id));
                        }}
                        className="rounded border-slate-300 text-primary-700"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3 text-sm text-slate-700 dark:text-slate-200',
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : ''
                      )}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      {!loading && data.length === 0 && emptyState && <div className="py-8">{emptyState}</div>}
    </div>
  );
}
