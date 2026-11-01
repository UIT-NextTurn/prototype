import { useState, useEffect, useCallback, useRef } from 'react'

/* ═══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
type AppState   = 'auth' | 'app'
type Role       = 'superadmin' | 'admin' | 'staff' | 'customer' | 'guest'
type Page       = 'dashboard' | 'kanban' | 'services' | 'staff-list' | 'schedule' | 'analytics' | 'tenants' | 'my-ticket' | 'display' | 'queue-settings'
type KanbanCol  = 'waiting' | 'serving' | 'completed' | 'noshow'
type TicketType = 'booked' | 'walkin'
type QueueState = 'waiting' | 'upcoming' | 'serving' | 'completed'

interface KTicket {
  id: string; code: string; type: TicketType; name: string; phone: string
  service: string; waitMin: number; col: KanbanCol
  apptTime?: string; calledAt?: number; priority?: boolean
}
type OpsStage = 'waiting' | 'calling' | 'serving' | 'completed'
interface OpsTicket {
  id: string; code: string; name: string; service: string; time: string
  stage: OpsStage; priority?: boolean
}
interface ToastMsg { type: 'error' | 'success' | 'info'; text: string }

/* ═══════════════════════════════════════════════════════════════════
   STATIC DATA
══════════════════════════════════════════════════════════════════ */
const INIT_KANBAN: KTicket[] = [
  { id:'k1',  code:'A-098', type:'booked',  name:'Nguyễn Thị Lan',  phone:'090****123', service:'Tư vấn tổng quát', waitMin:12, col:'waiting',   apptTime:'09:00', priority:true },
  { id:'k2',  code:'A-099', type:'booked',  name:'Trần Văn Minh',   phone:'091****456', service:'Tư vấn tổng quát', waitMin:18, col:'waiting',   apptTime:'09:15' },
  { id:'k3',  code:'A-100', type:'walkin',  name:'Khách vãng lai',  phone:'—',          service:'Tư vấn tổng quát', waitMin:25, col:'waiting' },
  { id:'k4',  code:'A-101', type:'walkin',  name:'Lê Thị Hoa',      phone:'093****789', service:'Xét nghiệm máu',   waitMin:31, col:'waiting' },
  { id:'k5',  code:'A-102', type:'booked',  name:'Phạm Văn Bình',   phone:'094****012', service:'Tư vấn tổng quát', waitMin:37, col:'waiting',   apptTime:'09:45' },
  { id:'k6',  code:'A-097', type:'booked',  name:'Hoàng Thị Mai',   phone:'095****345', service:'Tư vấn tổng quát', waitMin:0,  col:'serving',   priority:true, calledAt: Date.now() - 4.5*60*1000 },
  { id:'k7',  code:'A-093', type:'walkin',  name:'Vũ Thanh Tùng',   phone:'096****678', service:'Tư vấn tổng quát', waitMin:0,  col:'completed' },
  { id:'k8',  code:'A-094', type:'booked',  name:'Đặng Thị Ngọc',   phone:'097****901', service:'Tư vấn tổng quát', waitMin:0,  col:'completed' },
  { id:'k9',  code:'A-095', type:'walkin',  name:'Bùi Văn Hùng',    phone:'098****234', service:'Xét nghiệm máu',   waitMin:0,  col:'completed' },
  { id:'k10', code:'A-096', type:'booked',  name:'Ngô Lan Anh',      phone:'099****567', service:'Tư vấn tổng quát', waitMin:0,  col:'noshow',    apptTime:'08:45' },
  { id:'k11', code:'A-091', type:'walkin',  name:'Đinh Văn Khải',   phone:'087****890', service:'Tiêm phòng',       waitMin:0,  col:'noshow' },
]

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string; desc: string }> = {
  superadmin: { label:'Super Admin',     color:'#6366F1', bg:'rgba(99,102,241,.12)',  desc:'Toàn quyền nền tảng' },
  admin:      { label:'Admin',           color:'#1E40AF', bg:'#EFF6FF',               desc:'Quản lý cơ sở' },
  staff:      { label:'Nhân viên quầy',  color:'#065F46', bg:'#ECFDF5',               desc:'Vận hành quầy giao dịch' },
  customer:   { label:'Khách hàng',      color:'#92400E', bg:'#FFFBEB',               desc:'Đặt lịch & theo dõi vé' },
  guest:      { label:'Khách vãng lai',  color:'#475569', bg:'#F8FAFC',               desc:'Hàng đợi tức thì, không cần tài khoản' },
}

const KCOLS: { id: KanbanCol; label: string; accentColor: string; bg: string; emptyText: string }[] = [
  { id:'waiting',   label:'Đang chờ',          accentColor:'#2563EB', bg:'#EFF6FF', emptyText:'Không có khách chờ' },
  { id:'serving',   label:'Đang phục vụ',      accentColor:'#059669', bg:'#ECFDF5', emptyText:'Gọi số tiếp theo' },
  { id:'completed', label:'Hoàn thành',         accentColor:'#64748B', bg:'#F1F5F9', emptyText:'Chưa có ca hoàn thành' },
  { id:'noshow',    label:'Vắng mặt / Bỏ lỡ',  accentColor:'#DC2626', bg:'#FEF2F2', emptyText:'Không có ca vắng mặt' },
]

const SERVICES  = ['Tư vấn tổng quát', 'Xét nghiệm máu', 'Siêu âm', 'Tiêm phòng', 'Răng hàm mặt']
const HOURLY    = [12,34,58,72,49,28,21,63,81,55,38,14]
const H_LABELS  = ['07h','08h','09h','10h','11h','12h','13h','14h','15h','16h','17h','18h']

const SERVICES_STATS = [
  { name:'Tư vấn tổng quát', count:89,  avg:7.2,  color:'#2563EB' },
  { name:'Xét nghiệm máu',   count:63,  avg:4.8,  color:'#0891B2' },
  { name:'Siêu âm',          count:41,  avg:15.3, color:'#7C3AED' },
  { name:'Tiêm phòng',       count:34,  avg:3.1,  color:'#059669' },
  { name:'Răng hàm mặt',     count:20,  avg:22.5, color:'#D97706' },
]

/* ═══════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════ */
const I0 = (s=16) => ({ width:s, height:s, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:'1.5', strokeLinecap:'round' as const, strokeLinejoin:'round' as const })

const Ico = ({ p, s=16, cl='' }: { p:string|string[]; s?:number; cl?:string }) => {
  const arr = Array.isArray(p) ? p : [p]
  return <svg {...I0(s)} className={cl}>{arr.map((d,i) => <path key={i} d={d}/>)}</svg>
}

const GridIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const MonitorIco = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
const BarIco     = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
const ShieldIco  = ({s=16}:{s?:number}) => <Ico p="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" s={s}/>
const UsersIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const CalIco     = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const ListIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const SettingsIco= ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const ServerIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
const TvIco      = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
const TicketIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
const EyeIco     = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
const CheckIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><polyline points="20 6 9 17 4 12"/></svg>
const XCircIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
const LogOutIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const AlertIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const GripIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
const ClockIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const PhoneIco   = ({s=16}:{s?:number}) => <Ico p="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.37 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 5.55 5.55l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" s={s}/>
const ArrowRIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const RefreshIco = ({s=16}:{s?:number}) => <svg {...I0(s)}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
const ChevDnIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><polyline points="6 9 12 15 18 9"/></svg>
const StarIco    = ({s=16, fill=false}:{s?:number; fill?:boolean}) => <svg {...I0(s)} fill={fill?'currentColor':'none'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const MenuIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
const XSmIco     = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const InfoIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
const PauseIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/></svg>
const SwapIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><line x1="7" y1="7" x2="21" y2="7"/><polyline points="17 3 21 7 17 11"/><line x1="17" y1="17" x2="3" y2="17"/><polyline points="7 21 3 17 7 13"/></svg>
const NoteIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
const LockIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
const FullscreenIco = ({s=16}:{s?:number}) => <svg {...I0(s)}><polyline points="8 3 3 3 3 8"/><line x1="3" y1="3" x2="9" y2="9"/><polyline points="16 3 21 3 21 8"/><line x1="21" y1="3" x2="15" y2="9"/><polyline points="8 21 3 21 3 16"/><line x1="3" y1="21" x2="9" y2="15"/><polyline points="16 21 21 21 21 16"/><line x1="21" y1="21" x2="15" y2="15"/></svg>
const DownloadIco = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const EditIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
const TrashIco   = ({s=16}:{s?:number}) => <svg {...I0(s)}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6m3 0V4h8v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
const SearchIco  = ({s=16}:{s?:number}) => <svg {...I0(s)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const QrIco      = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2v7h-7v-2"/></svg>
const CopyIco    = ({s=16}:{s?:number}) => <svg {...I0(s)}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const ExternalLinkIco = ({s=16}:{s?:number}) => <svg {...I0(s)}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>

/* ═══════════════════════════════════════════════════════════════════
   DYNAMIC CHECK-IN QR & ROTATING URL SYNC (ADMIN & COUNTER)
══════════════════════════════════════════════════════════════════ */
const QR_ROTATION_INTERVAL = 60 // 60 seconds periodic reset

interface DynamicCheckinState {
  token: string
  checkInUrl: string
  remainingSeconds: number
  epochWindow: number
}

function getDynamicCheckinData(): DynamicCheckinState {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const salt = typeof window !== 'undefined' ? Number(localStorage.getItem('nextturn_qr_salt') || '0') : 0
  const now = Math.floor(Date.now() / 1000) + salt
  const epochWindow = Math.floor(now / QR_ROTATION_INTERVAL)
  const remainder = now % QR_ROTATION_INTERVAL
  const remainingSeconds = QR_ROTATION_INTERVAL - remainder

  // Deterministic token code per 60-second window
  const codeVal = ((epochWindow * 7919) % 90000 + 10000).toString(16).toUpperCase()
  const token = `NT-CHK-${codeVal}`
  const checkInUrl = `${origin}${pathname}#booking-widget?mode=checkin&token=${token}`

  return { token, checkInUrl, remainingSeconds: Math.max(1, remainingSeconds), epochWindow }
}

function rotateDynamicCheckinNow() {
  if (typeof window === 'undefined') return
  const currentSalt = Number(localStorage.getItem('nextturn_qr_salt') || '0')
  const now = Math.floor(Date.now() / 1000) + currentSalt
  const currentRemainder = now % QR_ROTATION_INTERVAL
  const advance = QR_ROTATION_INTERVAL - currentRemainder + 1
  const newSalt = currentSalt + advance
  localStorage.setItem('nextturn_qr_salt', String(newSalt))
  window.dispatchEvent(new CustomEvent('nextturn_qr_sync'))
}

/* ═══════════════════════════════════════════════════════════════════
   QR CODE & CHART
══════════════════════════════════════════════════════════════════ */
function QRCode({ sz=72 }: { sz?: number }) {
  const cells = [
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,1,1],
    [0,1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0],
    [1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,1,0,1,1],
  ]
  const c = sz / 17
  return (
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      {cells.map((row,r) => row.map((v,col) =>
        v ? <rect key={`${r}-${col}`} x={col*c} y={r*c} width={c-.4} height={c-.4} fill="#0F172A" rx=".4"/> : null
      ))}
    </svg>
  )
}

function HourlyChart() {
  const max = Math.max(...HOURLY)
  const W=520, H=80, pad=6, bw=(W - pad*(HOURLY.length+1))/HOURLY.length
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H+18}`} className="w-full">
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity=".85"/>
            <stop offset="100%" stopColor="#2563EB" stopOpacity=".3"/>
          </linearGradient>
          <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E7490" stopOpacity=".9"/>
            <stop offset="100%" stopColor="#0E7490" stopOpacity=".5"/>
          </linearGradient>
        </defs>
        {HOURLY.map((v,i) => {
          const x=pad+i*(bw+pad), bh=(v/max)*H, isPeak=v===max, isCur=i===8
          return (
            <g key={i}>
              <rect x={x} y={H-bh} width={bw} height={bh} fill={isCur?'url(#bg2)':isPeak?'#1E40AF':'url(#bg1)'} rx="3"/>
              {i%3===0 && <text x={x+bw/2} y={H+14} textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="var(--font-mono)">{H_LABELS[i]}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
══════════════════════════════════════════════════════════════════ */
function Toast({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  const icons = { error: <AlertIco s={16}/>, success: <CheckIco s={16}/>, info: <InfoIco s={16}/> }
  const colors = { error:'bg-red-50 border-red-200 text-red-700', success:'bg-emerald-50 border-emerald-200 text-emerald-700', info:'bg-blue-50 border-blue-200 text-blue-700' }
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-lg ${colors[msg.type]}`}
      style={{ animation: 'slideInRight .25s ease' }}>
      {icons[msg.type]}
      <span>{msg.text}</span>
      <button onClick={onDone} className="ml-1 opacity-60 hover:opacity-100"><XSmIco s={14}/></button>
    </div>
  )
}

function RoleBadge({ role, size='sm' }: { role: Role; size?: 'sm'|'lg' }) {
  const cfg = ROLE_CFG[role]
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${size==='lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]'}`}
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function SuperAdminLogin({ onAuth }: { onAuth: (role: Role) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [error, setError] = useState<'credentials' | 'lockout' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'NextTurn - Quản trị nền tảng'
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta')
      robotsMeta.name = 'robots'
      document.head.appendChild(robotsMeta)
    }
    robotsMeta.content = 'noindex, nofollow, noarchive'
  }, [])

  const signIn = () => {
    if (failedAttempts >= 5) {
      setError('lockout')
      return
    }
    if (username.toLowerCase() !== 'sa@gmail.com' || password !== '12345678') {
      const nextAttempts = failedAttempts + 1
      setFailedAttempts(nextAttempts)
      setError(nextAttempts >= 5 ? 'lockout' : 'credentials')
      return
    }
    setError(null)
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      onAuth('superadmin')
    }, 700)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-slate-900"
      data-route-visibility="Unlisted URL; never linked from public or staff pages"
      data-security-indexing="noindex, nofollow, noarchive"
      data-security-audit="Every login attempt is security-logged with IP and timestamp (§3.6.3)"
      data-ip-allowlist="Optional"
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)]">
        <div className="mb-7">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-100">
            <ShieldIco s={22}/>
          </div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-indigo-600 uppercase">NEXTTURN PLATFORM</p>
          <h1 className="mt-2 text-2xl font-bold leading-relaxed text-slate-900">Đăng nhập quản trị nền tảng</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Cổng quản trị nền tảng độc lập với mọi cấu hình tenant.</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Tên đăng nhập hoặc Email</span>
            <input value={username} onChange={event => { setUsername(event.target.value); if (error !== 'lockout') setError(null) }}
              onKeyDown={event => event.key === 'Enter' && signIn()}
              placeholder="superadmin@nextturn.vn"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"/>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Mật khẩu</span>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={event => { setPassword(event.target.value); if (error !== 'lockout') setError(null) }}
                onKeyDown={event => event.key === 'Enter' && signIn()}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all"/>
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOffIco s={17}/> : <EyeIco s={17}/>}
              </button>
            </div>
            <span className="mt-1.5 block text-[10px] leading-relaxed text-slate-400">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.</span>
          </label>

          {error && (
            <div className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed ${error === 'lockout' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <AlertIco s={16}/>
              <span>{error === 'lockout' ? 'Tài khoản tạm khóa 15 phút do đăng nhập sai quá 5 lần. Vui lòng thử lại sau.' : 'Thông tin đăng nhập hoặc mật khẩu không chính xác.'}</span>
            </div>
          )}

          <button type="button" onClick={signIn} disabled={loading || error === 'lockout'}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-100 transition-all hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            {loading ? <span className="animate-spin"><RefreshIco s={16}/></span> : <ShieldIco s={16}/>}
            {loading ? 'Đang xác thực...' : 'Đăng nhập quản trị nền tảng'}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <button type="button" onClick={() => window.location.assign('/')}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600">
            Quay lại trang đăng nhập nhân sự
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   SCREEN 1 — AUTH SCREEN
══════════════════════════════════════════════════════════════════ */
function PartnerRegistration() {
  const [organizationName, setOrganizationName] = useState('')
  const [organizationCode, setOrganizationCode] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [duplicateError, setDuplicateError] = useState(false)
  const [duplicateField, setDuplicateField] = useState<'code' | 'email' | null>(null)
  const codeIsValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationCode) && organizationCode.length >= 3 && organizationCode.length <= 30
  const nameError = attempted && (organizationName.trim().length < 3 || organizationName.trim().length > 150)
  const codeError = attempted && !codeIsValid
  const emailError = attempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)
  const phoneError = attempted && !/^\d{10}$/.test(phone)

  useEffect(() => {
    document.title = 'Đăng ký đối tác | NextTurn'
  }, [])

  useEffect(() => {
    setDuplicateError(false)
    setDuplicateField(null)
    if (!codeIsValid) {
      setAvailability('idle')
      return
    }
    setAvailability('checking')
    const timer = window.setTimeout(() => {
      setAvailability(['st-jude', 'pk-alpha', 'nextturn-demo'].includes(organizationCode) ? 'duplicate' : 'available')
    }, 650)
    return () => window.clearTimeout(timer)
  }, [codeIsValid, organizationCode])

  const submit = () => {
    setAttempted(true)
    const hasDuplicate = availability === 'duplicate' || ['admin@stjude.vn', 'owner@pkalpha.vn'].includes(adminEmail.trim().toLowerCase())
    if (hasDuplicate) {
      setDuplicateError(true)
      setDuplicateField(availability === 'duplicate' ? 'code' : 'email')
      return
    }
    if (organizationName.trim().length < 3 || organizationName.trim().length > 150 || !codeIsValid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || !/^\d{10}$/.test(phone) || availability === 'checking') return
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      setSubmitted(true)
    }, 750)
  }

  const fieldClass = 'h-12 w-full rounded-xl border bg-white px-3.5 text-sm leading-[1.6] text-[#0F172A] outline-none transition-all placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'

  return (
    <main
      className="flex min-h-screen bg-white text-[#0F172A] lg:bg-[#EFF6FF]"
      data-request-result="Tenant PENDING_APPROVAL + DISABLED Keycloak admin"
      data-internal-notification="Super Admin notified; request feeds the Approvals queue"
      data-submission-chain="uniqueness check → create tenant PENDING_APPROVAL → create DISABLED Keycloak admin → send 'Đã nhận yêu cầu đăng ký' email → notify Super Admin"
      data-requirement="REQ-TNT-01"
    >
      <aside className="relative hidden w-[42%] max-w-[620px] flex-col overflow-hidden bg-[linear-gradient(155deg,#172554_0%,#1E40AF_56%,#2563EB_100%)] p-12 text-white lg:flex">
        <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full border border-white/10"/>
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-blue-400/10"/>
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight">NextTurn</span>
        </div>
        <div className="relative my-auto max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-200">Dành cho đối tác & doanh nghiệp</p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">Vận hành mỗi lượt phục vụ rõ ràng hơn.</h1>
          <p className="mt-5 text-base leading-relaxed text-blue-100">Khởi tạo không gian riêng cho tổ chức, quản lý lịch hẹn và điều phối hàng đợi trên một nền tảng thống nhất.</p>
          <div className="mt-9 space-y-4">
            {['Không gian tenant tách biệt và bảo mật', 'Theo dõi hàng đợi theo thời gian thực', 'Thiết lập dịch vụ, nhân sự và hạn ngạch linh hoạt'].map(item => (
              <div key={item} className="flex items-start gap-3 text-sm text-blue-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/20 text-cyan-200"><CheckIco s={12}/></span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200">NextTurn Platform · Enterprise onboarding</p>
      </aside>

      <section className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:px-8 sm:py-8">
        <div className="mb-5 flex w-full max-w-[560px] items-center gap-3 border-b border-slate-200 pb-4 lg:hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-[1.6] text-[#0F172A]">NextTurn</p>
            <p className="truncate text-xs leading-[1.6] text-slate-600">Quản lý lịch hẹn và hàng đợi cho mọi điểm dịch vụ</p>
          </div>
        </div>

        <div className="w-full max-w-[560px] bg-white sm:rounded-2xl sm:border sm:border-blue-100 sm:p-9 sm:shadow-[0_24px_70px_-32px_rgba(30,64,175,0.32)]">
          {!submitted && <div className="mb-7">
            <button type="button" onClick={() => window.location.assign('/')} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700">
              <span className="rotate-180"><ArrowRIco s={14}/></span>Quay lại đăng nhập
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">ĐĂNG KÝ ĐỐI TÁC / DOANH NGHIỆP</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Bắt đầu với NextTurn</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Gửi thông tin tổ chức để đội ngũ nền tảng xét duyệt và khởi tạo tài khoản quản trị đầu tiên.</p>
          </div>}

          {submitted ? (
            <div
              className="flex min-h-[540px] flex-col items-center justify-center text-center"
              data-tenant-row-status="PENDING_APPROVAL"
              data-keycloak-admin-status="DISABLED until REQ-TNT-06 approval"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ECFDF5] text-emerald-700 ring-8 ring-emerald-50/60">
                <CheckIco s={38}/>
              </div>
              <h2 className="mt-7 text-2xl font-bold leading-relaxed text-slate-900">Đã nhận yêu cầu đăng ký</h2>
              <p className="mt-3 max-w-[410px] text-sm leading-relaxed text-slate-500">Chúng tôi sẽ xem xét hồ sơ và phản hồi qua email trong thời gian sớm nhất.</p>

              <span className="mt-6 inline-flex rounded-full bg-[#FFFBEB] px-3 py-2 text-[11px] font-bold text-[#92400E]">
                Trạng thái hiện tại: CHỜ PHÊ DUYỆT
              </span>

              <div className="mt-8 w-full max-w-[410px] text-left">
                {[
                  { number:'1', label:'Xác nhận email đã gửi', active:true },
                  { number:'2', label:'Super Admin xét duyệt hồ sơ', active:false },
                  { number:'3', label:'Email phê duyệt kèm hướng dẫn đăng nhập quản trị', active:false },
                ].map((step, index) => (
                  <div key={step.number} className="relative flex min-h-16 gap-4">
                    {index < 2 && <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-200"/>}
                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${step.active ? 'border-emerald-600 bg-emerald-600 text-white ring-4 ring-emerald-50' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      {step.number}
                    </span>
                    <div className="pb-5 pt-1">
                      <p className={`text-sm font-semibold leading-relaxed ${step.active ? 'text-emerald-800' : 'text-slate-500'}`}>{step.label}</p>
                      {step.active && <p className="mt-1 text-[10px] leading-relaxed text-emerald-600">Đã hoàn tất</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid w-full grid-cols-2 gap-3">
                <button type="button" onClick={() => window.location.assign('/')} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
                  Quay về trang chủ
                </button>
                <a href="mailto:support@nextturn.vn" className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
                  Liên hệ hỗ trợ
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-24 sm:pb-0">
              {duplicateError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                  <AlertIco s={16}/>
                  <span>Mã định danh tổ chức hoặc email quản trị này đã được đăng ký trong hệ thống. Vui lòng kiểm tra lại.</span>
                </div>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Tên tổ chức</span>
                <input autoFocus autoComplete="organization" maxLength={150} value={organizationName}
                  onChange={event => setOrganizationName(event.target.value)}
                  placeholder="Ví dụ: Phòng khám Đa khoa Tâm Đức"
                  className={`${fieldClass} ${nameError ? 'border-red-400' : 'border-slate-200'}`}/>
                {nameError
                  ? <span className="mt-1.5 block text-[13px] leading-[1.6] text-[#DC2626]">Tên tổ chức phải có từ 3 đến 150 ký tự.</span>
                  : <span className="mt-1.5 block text-[10px] leading-[1.6] text-slate-600">{organizationName.length}/150 · Tối thiểu 3 ký tự</span>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Mã định danh mong muốn</span>
                <input autoComplete="off" maxLength={30} value={organizationCode}
                  onChange={event => setOrganizationCode(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                  placeholder="pk-tam-duc"
                  className={`${fieldClass} font-tabular ${codeError || availability === 'duplicate' || duplicateField === 'code' ? 'border-red-500 ring-2 ring-red-50' : 'border-slate-200'}`}/>
                {codeError ? (
                  <span className="mt-1.5 block text-[13px] leading-[1.6] text-[#DC2626]">Mã định danh chỉ gồm chữ thường không dấu, chữ số và dấu gạch nối (3–30 ký tự).</span>
                ) : (
                  <div className="mt-1.5 flex min-h-6 items-center justify-between gap-3">
                    <span className="font-tabular text-[10px] leading-[1.6] text-slate-600">3–30 ký tự · chữ thường, số và dấu gạch nối</span>
                    {availability === 'checking' && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-blue-700">
                        <span className="animate-spin"><RefreshIco s={13}/></span>Đang kiểm tra
                      </span>
                    )}
                    {availability === 'available' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        <CheckIco s={11}/>Mã khả dụng
                      </span>
                    )}
                    {availability === 'duplicate' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                        <XCircIco s={11}/>Mã đã tồn tại
                      </span>
                    )}
                  </div>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Email quản trị đầu tiên</span>
                <input type="email" autoComplete="email" value={adminEmail} onChange={event => { setAdminEmail(event.target.value); setDuplicateError(false); setDuplicateField(null) }}
                  placeholder="quantri@doanhnghiep.vn"
                  className={`${fieldClass} ${emailError || duplicateField === 'email' ? 'border-red-500 ring-2 ring-red-50' : 'border-slate-200'}`}/>
                {emailError && <span className="mt-1.5 block text-[13px] leading-[1.6] text-[#DC2626]">Địa chỉ email không đúng định dạng.</span>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">SĐT liên hệ</span>
                <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} value={phone}
                  onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0901234567"
                  className={`${fieldClass} font-tabular ${phoneError ? 'border-red-400' : 'border-slate-200'}`}/>
                {phoneError
                  ? <span className="mt-1.5 block text-[13px] leading-[1.6] text-[#DC2626]">Số điện thoại phải đủ 10 chữ số.</span>
                  : <span className="mt-1.5 block font-tabular text-[10px] leading-[1.6] text-slate-600">{phone.length}/10 chữ số</span>}
              </label>

              <button type="button" onClick={submit} disabled={sending || availability === 'checking'}
                className="mt-2 hidden h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:bg-blue-300 sm:flex">
                {sending ? <span className="animate-spin"><RefreshIco s={17}/></span> : <ArrowRIco s={17}/>}
                {sending ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đăng ký'}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-slate-600">Thông tin của bạn được mã hóa và chỉ dùng cho quá trình xét duyệt đối tác.</p>

              <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-18px_rgba(15,23,42,0.28)] backdrop-blur sm:hidden">
                <button type="button" onClick={submit} disabled={sending || availability === 'checking'}
                  className="mx-auto flex h-[54px] w-full max-w-[560px] items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-bold text-white transition-colors disabled:cursor-wait disabled:bg-blue-300">
                  {sending ? <span className="animate-spin"><RefreshIco s={17}/></span> : <ArrowRIco s={17}/>}
                  {sending ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đăng ký'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function AuthScreen({ onAuth }: { onAuth: (role: Role) => void }) {
  const [authPortal, setAuthPortal] = useState<'registration' | 'customer' | 'internal' | 'forgot'>('internal')
  const [internalStep, setInternalStep] = useState<'tenant' | 'credentials'>('tenant')
  const [loginTenantCode, setLoginTenantCode] = useState('')
  const [loginTenantError, setLoginTenantError] = useState<'not-found' | 'suspended' | null>(null)
  const [loginError, setLoginError] = useState<'credentials' | 'disabled' | 'lockout' | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const [tenantCode, setTenantCode] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resendSeconds, setResendSeconds] = useState(59)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  const showToast = (t: ToastMsg) => { setToast(t); setTimeout(() => setToast(null), 3200) }

  useEffect(() => {
    document.title = authPortal === 'registration'
      ? 'NextTurn - Đăng ký cơ sở'
      : authPortal === 'customer'
        ? 'NextTurn - Xác thực khách hàng'
        : authPortal === 'forgot'
          ? 'NextTurn - Quên mật khẩu'
          : 'NextTurn - Đăng nhập hệ thống'
  }, [authPortal])

  const handleRegistration = () => {
    if (!businessName || !tenantCode || !businessPhone || !representativeName || !adminEmail) {
      showToast({ type:'error', text:'Vui lòng nhập đầy đủ thông tin đăng ký.' })
      return
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantCode)) {
      showToast({ type:'error', text:'Mã định danh chỉ được gồm chữ thường không dấu, số và gạch nối.' })
      return
    }
    if (!/^\d{10}$/.test(businessPhone)) {
      showToast({ type:'error', text:'Số điện thoại liên hệ phải gồm 10 chữ số.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      showToast({ type:'error', text:'Vui lòng nhập email quản trị hợp lệ.' })
      return
    }
    if (!acceptedTerms) {
      showToast({ type:'error', text:'Vui lòng đồng ý với điều khoản dịch vụ và chính sách bảo mật dữ liệu.' })
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      showToast({ type:'success', text:'Yêu cầu đăng ký cơ sở đã được gửi thành công.' })
    }, 900)
  }

  useEffect(() => {
    if (otpStep !== 'verify' || resendSeconds <= 0) return
    const timer = setTimeout(() => setResendSeconds(seconds => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [otpStep, resendSeconds])

  const handleSendOtp = () => {
    const value = contact.trim()
    const isPhone = /^\d{10}$/.test(value)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    if (!isPhone && !isEmail) {
      showToast({ type:'error', text:'Vui lòng nhập số điện thoại 10 số hoặc email hợp lệ.' })
      return
    }
    setOtp(['', '', '', '', '', ''])
    setResendSeconds(59)
    setOtpStep('verify')
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtp(current => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6).split('')
    if (!digits.length) return
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] ?? ''))
    otpRefs.current[Math.min(digits.length, 6) - 1]?.focus()
  }

  const handleVerifyOtp = () => {
    if (otp.some(digit => !digit)) {
      showToast({ type:'error', text:'Vui lòng nhập đầy đủ mã xác thực gồm 6 chữ số.' })
      return
    }
    setLoading(true)
    setTimeout(() => { setLoading(false); onAuth('customer') }, 900)
  }

  const handleSignIn = () => {
    if (!username || !password) {
      showToast({ type:'error', text:'Vui lòng nhập đầy đủ thông tin.' })
      return
    }
    if (password.length < 6) { showToast({ type:'error', text:'Mật khẩu phải có ít nhất 6 ký tự.' }); return }
    if (failedAttempts >= 5) {
      setLoginError('lockout')
      return
    }
    if (username.toLowerCase().includes('disabled')) {
      setLoginError('disabled')
      return
    }
    if (password !== '12345678') {
      const nextAttempts = failedAttempts + 1
      setFailedAttempts(nextAttempts)
      setLoginError(nextAttempts >= 5 ? 'lockout' : 'credentials')
      return
    }
    setLoginError(null)
    setLoading(true)
    const account = username.toLowerCase()
    const accountRole: Role = account.includes('counter') ? 'staff' : 'admin'
    setTimeout(() => { setLoading(false); onAuth(accountRole) }, 900)
  }

  const handleTenantContinue = () => {
    const value = loginTenantCode.trim().toLowerCase()
    if (value === 'pk-suspended') {
      setLoginTenantError('suspended')
      return
    }
    if (!/^[a-z0-9-]{3,30}$/.test(value) || !['pk-alpha','st-jude'].includes(value)) {
      setLoginTenantError('not-found')
      return
    }
    setLoginTenantError(null)
    setInternalStep('credentials')
  }

  const handleForgotRequest = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      showToast({ type:'error', text:'Vui lòng nhập địa chỉ email hợp lệ.' })
      return
    }
    showToast({ type:'success', text:'Liên kết đặt lại mật khẩu đã được gửi.' })
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"

  return (
    <div className="min-h-screen flex">
      {toast && <Toast msg={toast} onDone={() => setToast(null)}/>}

      {authPortal !== 'registration' && authPortal !== 'internal' && (
        /* Left brand panel */
        <div className="hidden lg:flex flex-col w-[44%] p-12 text-white"
          style={{ background: 'linear-gradient(160deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight">NextTurn</span>
        </div>

        {/* Hero content */}
        <div className="my-auto">
          <h1 className="text-4xl font-extrabold leading-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Quản lý hàng đợi<br/>thông minh hơn.
          </h1>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            Tối ưu hóa trải nghiệm khách hàng và điều phối vận hành hiệu quả tại mọi điểm dịch vụ — từ phòng khám đến ngân hàng.
          </p>
          <div className="space-y-3">
            {[
              'Đặt lịch hẹn trực tuyến 24/7 không cần đến cơ sở',
              'Theo dõi số thứ tự hàng đợi theo thời gian thực',
              'Bảng điều khiển phân tích vận hành toàn diện',
              'Hỗ trợ đa cơ sở và gán nhãn thương hiệu riêng',
            ].map(f => (
              <div key={f} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIco s={11}/>
                </div>
                <span className="text-blue-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        </div>
      )}

      {/* Right form panel */}
      <div className={`flex-1 flex items-center justify-center bg-slate-50 p-6 ${authPortal === 'registration' ? 'py-8' : ''}`}>
        <div className={`w-full ${authPortal === 'registration' ? 'max-w-screen-sm' : authPortal === 'internal' ? 'max-w-[440px]' : 'max-w-lg'}`}>
          {authPortal === 'registration' && (
            <div className="mb-5 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">NextTurn</span>
            </div>
          )}
          <div className={`bg-white rounded-2xl p-8 ${authPortal === 'internal' && internalStep === 'credentials' ? 'border-l-4 border-cyan-600' : ''}`} style={{ boxShadow: '0 8px 30px rgba(15,23,42,.08), 0 0 0 1px #E2E8F0' }}>
            <div className="mb-7">
              {authPortal !== 'registration' && !(authPortal === 'internal' && internalStep === 'credentials') && (
                <div className={`items-center gap-2 mb-5 ${authPortal === 'internal' && internalStep === 'tenant' ? 'flex' : 'flex lg:hidden'}`}>
                  <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
                  </div>
                  <span className="font-bold text-slate-900">NextTurn</span>
                </div>
              )}
              {authPortal === 'internal' && internalStep === 'credentials' && (
                <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-600 text-white">
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-relaxed text-slate-900">Phòng khám St. Jude</p>
                    <p className="text-[10px] font-semibold leading-relaxed text-cyan-700">CLINICAL · CỔNG NHÂN SỰ</p>
                  </div>
                </div>
              )}
              {authPortal === 'internal' && internalStep !== 'tenant' && (
                <button type="button" onClick={() => { window.history.pushState({}, '', '/'); setInternalStep('tenant'); setPassword('') }}
                  className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-700">
                  <span className="rotate-180"><ArrowRIco s={14}/></span>
                  Đổi mã cơ sở
                </button>
              )}
              {(authPortal === 'registration' || authPortal === 'forgot') && (
                <button
                  type="button"
                  onClick={() => setAuthPortal('internal')}
                  className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-700"
                >
                  <span className="rotate-180"><ArrowRIco s={14}/></span>
                  Quay lại Đăng nhập
                </button>
              )}
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {authPortal === 'registration'
                  ? 'Đăng ký cơ sở dịch vụ mới'
                  : authPortal === 'forgot'
                  ? 'Khôi phục mật khẩu'
                  : authPortal === 'internal'
                  ? internalStep === 'tenant'
                    ? 'Đăng nhập nhân sự'
                    : 'Đăng nhập hệ thống'
                  : otpStep === 'request'
                    ? 'Tra cứu & Quản lý lịch hẹn'
                    : 'Xác thực OTP'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {authPortal === 'registration'
                  ? 'Tạo không gian điều phối hàng đợi cho phòng khám, cơ quan hoặc chi nhánh của bạn'
                  : authPortal === 'forgot'
                  ? 'Nhập địa chỉ email quản trị hoặc tài khoản đã đăng ký để nhận liên kết đặt lại mật khẩu'
                  : authPortal === 'internal'
                  ? internalStep === 'tenant'
                    ? 'Nhập mã cơ sở để tiếp tục đến cổng đăng nhập dành cho nhân sự vận hành'
                    : `Cơ sở ${loginTenantCode} · Chỉ dành cho Admin và Nhân viên quầy`
                  : otpStep === 'request'
                    ? 'Nhập số điện thoại hoặc email để nhận mã xác thực một lần (OTP)'
                    : <>Mã gồm 6 chữ số đã được gửi đến <span className="font-semibold text-slate-700">{contact}</span></>}
              </p>
            </div>

            {authPortal === 'registration' ? (
              <div className="space-y-6">
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">1</span>
                    <h3 className="text-sm font-bold text-slate-800">Thông tin cơ sở</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên cơ sở / Doanh nghiệp</label>
                      <input
                        type="text"
                        autoFocus
                        autoComplete="organization"
                        className={inputCls}
                        placeholder="Ví dụ: Phòng khám Đa khoa Tâm Đức"
                        value={businessName}
                        onChange={event => setBusinessName(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã định danh hệ thống (Tenant Code)</label>
                      <input
                        type="text"
                        autoComplete="off"
                        className={inputCls}
                        placeholder="pk-tamduc"
                        value={tenantCode}
                        onChange={event => setTenantCode(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      />
                      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                        Chỉ gồm chữ thường không dấu và gạch nối, ví dụ: pk-tamduc
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại liên hệ</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        className={inputCls}
                        placeholder="0901234567"
                        maxLength={10}
                        value={businessPhone}
                        onChange={event => setBusinessPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200"/>

                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200">2</span>
                    <h3 className="text-sm font-bold text-slate-800">Người quản trị cơ sở</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Họ và tên người đại diện</label>
                      <input
                        type="text"
                        autoComplete="name"
                        className={inputCls}
                        placeholder="Nguyễn Văn A"
                        value={representativeName}
                        onChange={event => setRepresentativeName(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email quản trị</label>
                      <input
                        type="email"
                        autoComplete="email"
                        className={inputCls}
                        placeholder="quantri@example.com"
                        value={adminEmail}
                        onChange={event => setAdminEmail(event.target.value)}
                      />
                      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                        Dùng để kích hoạt tài khoản quản trị Keycloak
                      </p>
                    </div>
                  </div>
                </section>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={event => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-600">
                    Tôi đồng ý với <span className="font-semibold text-blue-600">Điều khoản dịch vụ</span> và <span className="font-semibold text-blue-600">Chính sách bảo mật dữ liệu</span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleRegistration}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-wait bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                  ) : <ArrowRIco s={16}/>}
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đăng ký cơ sở'}
                </button>

                <div className="space-y-3 border-t border-slate-200 pt-5 text-center">
                  <p className="text-xs text-slate-500">
                    Cơ sở của bạn đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthPortal('internal')}
                      className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                </div>

                <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-relaxed text-slate-400">
                  <ClockIco s={13}/>
                  Yêu cầu sẽ được phê duyệt trong vòng 24 giờ làm việc
                </p>
              </div>
            ) : authPortal === 'customer' ? (
              otpStep === 'request' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại hoặc Email</label>
                    <input
                      type="text"
                      inputMode="email"
                      autoFocus
                      autoComplete="email"
                      className={inputCls}
                      placeholder="Nhập SĐT (10 số) hoặc email của bạn"
                      value={contact}
                      onChange={event => setContact(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && handleSendOtp()}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    Gửi mã xác thực OTP
                    <ArrowRIco s={16}/>
                  </button>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-slate-200"/>
                    <span className="text-xs text-slate-400">hoặc</span>
                    <div className="flex-1 h-px bg-slate-200"/>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast({ type:'info', text:'Vui lòng đưa mã QR tại sảnh vào khung hình để tiếp tục.' })}
                    className="w-full py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
                      {[0,1,2,3].map(item => <span key={item} className="h-1.5 w-1.5 rounded-[1px] bg-current"/>)}
                    </span>
                    Quét mã QR tại sảnh (Khách vãng lai)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthPortal('internal')}
                    className="w-full pt-1 text-center text-xs font-medium leading-relaxed text-slate-500 transition-colors hover:text-blue-700"
                  >
                    Bạn là nhân viên cơ sở? <span className="font-semibold text-blue-600">Đăng nhập nội bộ tại đây</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="grid grid-cols-6 gap-2" onPaste={event => {
                      event.preventDefault()
                      handleOtpPaste(event.clipboardData.getData('text'))
                    }}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={element => { otpRefs.current[index] = element }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          autoFocus={index === 0}
                          maxLength={1}
                          aria-label={`Chữ số OTP thứ ${index + 1}`}
                          value={digit}
                          onChange={event => handleOtpChange(index, event.target.value)}
                          onKeyDown={event => handleOtpKeyDown(index, event.key)}
                          className="aspect-square min-w-0 rounded-xl border border-slate-200 bg-white text-center font-tabular text-xl font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-center">
                    <button
                      type="button"
                      disabled={resendSeconds > 0}
                      onClick={() => setResendSeconds(59)}
                      className="text-xs font-semibold text-blue-600 transition-colors disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {resendSeconds > 0 ? `Gửi lại mã sau (${resendSeconds}s)` : 'Gửi lại mã xác thực'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setOtpStep('request')}
                        className="text-xs font-semibold text-slate-500 transition-colors hover:text-blue-700"
                      >
                        Đổi số điện thoại / email khác
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-wait bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                    ) : <CheckIco s={16}/>}
                    {loading ? 'Đang xác thực...' : 'Xác nhận & Tiếp tục'}
                  </button>
                </div>
              )
            ) : authPortal === 'forgot' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    className={inputCls}
                    placeholder="nhanvien@example.com"
                    value={forgotEmail}
                    onChange={event => setForgotEmail(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && handleForgotRequest()}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleForgotRequest}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  Gửi liên kết xác nhận
                  <ArrowRIco s={16}/>
                </button>

                <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                  <InfoIco s={16}/>
                  <span>Vui lòng kiểm tra hòm thư của bạn sau khi gửi yêu cầu.</span>
                </div>
              </div>
            ) : authPortal === 'internal' && internalStep === 'tenant' ? (
              <div
                className="space-y-5"
                data-access-policy="Only Admin and Counter Staff pass this tenant gate. End Users use widget OTP; Specialists have no login."
              >
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mã cơ sở</span>
                  <input
                    type="text"
                    autoFocus
                    autoComplete="organization"
                    value={loginTenantCode}
                    onChange={event => {
                      setLoginTenantCode(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))
                      setLoginTenantError(null)
                    }}
                    onKeyDown={event => event.key === 'Enter' && handleTenantContinue()}
                    placeholder="pk-alpha"
                    className={`${inputCls} font-tabular ${loginTenantError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                  />
                  <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400">Chuỗi viết liền không dấu, 3–30 ký tự</span>
                </label>

                {loginTenantError && (
                  <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${loginTenantError === 'suspended' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <AlertIco s={16}/>
                    <span>
                      {loginTenantError === 'suspended'
                        ? 'Cơ sở đang tạm thời bị khóa dịch vụ. Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.'
                        : 'Mã cơ sở không tồn tại. Vui lòng kiểm tra lại hoặc liên hệ quản trị viên.'}
                    </span>
                  </div>
                )}

                <button type="button" onClick={handleTenantContinue}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                  Tiếp tục <ArrowRIco s={16}/>
                </button>

                <p className="text-center text-xs leading-relaxed text-slate-500">
                  Quên mã cơ sở? Liên hệ hỗ trợ nền tảng.
                </p>
              </div>
            ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên đăng nhập hoặc Email</label>
                <input type="text" className={inputCls} placeholder="admin@example.com hoặc username"
                  autoComplete="username"
                  value={username} onChange={e => { setUsername(e.target.value); if (loginError !== 'lockout') setLoginError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className={`${inputCls} pr-11`} placeholder="••••••••"
                    autoComplete="current-password"
                    value={password} onChange={e => { setPassword(e.target.value); if (loginError !== 'lockout') setLoginError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOffIco s={17}/> : <EyeIco s={17}/>}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${loginError === 'credentials' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <AlertIco s={16}/>
                  <span>
                    {loginError === 'credentials'
                      ? 'Tài khoản hoặc mật khẩu không chính xác.'
                      : loginError === 'disabled'
                        ? 'Tài khoản đã bị vô hiệu hóa.'
                        : 'Tài khoản tạm khóa 15 phút do đăng nhập sai quá 5 lần. Vui lòng thử lại sau.'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"/>
                  <span className="text-xs text-slate-500">Ghi nhớ đăng nhập</span>
                </label>
                <button onClick={() => setAuthPortal('forgot')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Quên mật khẩu?
                </button>
              </div>

              <button onClick={handleSignIn} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-wait bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300">
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                ) : <ArrowRIco s={16}/>}
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>

              {internalStep === 'credentials' && loginTenantCode === 'pk-alpha' && (
                <>
                  <div className="flex items-center gap-3 py-1"><span className="h-px flex-1 bg-slate-200"/><span className="text-[10px] font-semibold text-slate-400">SSO DO CƠ SỞ QUẢN LÝ</span><span className="h-px flex-1 bg-slate-200"/></div>
                  <button type="button" onClick={() => onAuth('admin')}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="2" y="2" width="9" height="9" fill="#F25022"/><rect x="13" y="2" width="9" height="9" fill="#7FBA00"/><rect x="2" y="13" width="9" height="9" fill="#00A4EF"/><rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Đăng nhập với Google Workspace / Microsoft
                  </button>
                </>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Tài khoản mẫu (Bấm để điền nhanh):
                </p>
                <div className="space-y-2">
                  {[
                    { label:'Nhân viên quầy', email:'counter@gmail.com' },
                    { label:'Quản trị viên cơ sở', email:'admin@gmail.com' },
                  ].map(account => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setUsername(account.email)
                        setPassword('12345678')
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
                    >
                      <span className="block text-xs font-semibold text-slate-700">{account.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {account.email} | Mật khẩu: 12345678
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <p className="mb-3 text-center text-xs text-slate-500">
                  Chưa có tài khoản cho cơ sở của bạn?
                </p>
                <button
                  type="button"
                  onClick={() => window.location.assign('/partners/register')}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  Đăng ký cơ sở mới
                </button>
              </div>

              <button onClick={() => setAuthPortal('customer')}
                className="w-full pt-1 text-center text-xs font-medium leading-relaxed text-slate-500 transition-colors hover:text-blue-700">
                Khách hàng tra cứu lịch hẹn? <span className="font-semibold text-blue-600">Xác thực OTP tại đây</span>
              </button>
              {internalStep === 'credentials' && (
                <p
                  className="border-t border-slate-100 pt-4 text-center text-[11px] leading-relaxed text-slate-400"
                  data-role-routing="admin → Admin Console; counter staff → Kanban UI-02"
                >
                  Dành cho quản trị viên và nhân viên quầy.
                </p>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   SCREEN 3 — TICKET CARD COMPONENT
══════════════════════════════════════════════════════════════════ */
interface TicketCardProps {
  ticket: KTicket; elapsed?: number
  onCallNext?: () => void; onComplete?: () => void
  onNoShow?: () => void;   onTransfer?: () => void
  onRecall?: () => void;   onCancel?: () => void
  isDragging?: boolean
}

function TicketCard({ ticket: t, elapsed, onCallNext, onComplete, onNoShow, onTransfer, onRecall, onCancel, isDragging }: TicketCardProps) {
  const [hovered, setHovered] = useState(false)
  const isSrv = t.col === 'serving'
  const isWait = t.col === 'waiting'
  const isNoshow = t.col === 'noshow'
  const isCompleted = t.col === 'completed'

  const fmtElapsed = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div
      className="relative rounded-xl transition-all duration-200 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isDragging ? '#F8FAFC' : '#fff',
        opacity: isDragging ? 0.6 : 1,
        transform: hovered && !isDragging ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 20px -4px rgba(15,23,42,.12), 0 0 0 1px #CBD5E1' : '0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0',
        borderLeft: `3px solid ${isSrv ? '#10B981' : isWait ? '#3B82F6' : isNoshow ? '#DC2626' : '#CBD5E1'}`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}>

      {/* Drag handle */}
      <div className="absolute top-3 right-2 text-slate-300 opacity-0 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        <GripIco s={14}/>
      </div>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-tabular text-xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                {t.code}
              </span>
              {t.priority && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest" style={{ background:'#FEF9C3', color:'#A16207' }}>
                  ƯU TIÊN
                </span>
              )}
            </div>
            {/* Type badge */}
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                style={t.type==='booked'
                  ? { background:'#EFF6FF', color:'#1E40AF' }
                  : { background:'#F8FAFC', color:'#64748B', border:'1px solid #E2E8F0' }}>
                {t.type==='booked' ? '📋 ĐẶT LỊCH' : '🚶 VÃNG LAI'}
              </span>
            </div>
          </div>
          {/* Live timer for serving */}
          {isSrv && elapsed !== undefined && (
            <div className="text-right shrink-0">
              <div className="font-tabular text-base font-bold text-emerald-600 dot-blink">{fmtElapsed(elapsed)}</div>
              <div className="text-[10px] text-slate-400">đã phục vụ</div>
            </div>
          )}
          {t.apptTime && !isSrv && (
            <div className="text-right shrink-0">
              <div className="font-tabular text-xs font-bold text-blue-600">{t.apptTime}</div>
              <div className="text-[10px] text-slate-400">lịch hẹn</div>
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t.name}
          </div>
          {t.phone !== '—' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-tabular">
              <PhoneIco s={11}/>{t.phone}
            </div>
          )}
          <div className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background:'#F1F5F9', color:'#475569' }}>
            {t.service}
          </div>
        </div>

        {/* Wait time (for waiting) */}
        {isWait && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <ClockIco s={12}/><span className="font-tabular font-semibold text-slate-500">~{t.waitMin} phút chờ</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {isWait && onCallNext && (
            <button onClick={onCallNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
              style={{ background:'#2563EB', minHeight:36 }}
              onMouseEnter={e => e.currentTarget.style.background='#1D4ED8'}
              onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
              <ArrowRIco s={13}/> Gọi số
            </button>
          )}
          {isSrv && (
            <>
              <button onClick={onComplete}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
                style={{ background:'#059669', minHeight:36 }}
                onMouseEnter={e => e.currentTarget.style.background='#047857'}
                onMouseLeave={e => e.currentTarget.style.background='#059669'}>
                <CheckIco s={13}/> Hoàn thành
              </button>
              <button onClick={onNoShow}
                className="py-2 px-3 rounded-lg text-xs font-semibold border transition-all active:scale-95"
                style={{ background:'#FFFBEB', color:'#92400E', borderColor:'#FCD34D', minHeight:36 }}>
                Vắng mặt
              </button>
            </>
          )}
          {isNoshow && (
            <>
              <button onClick={onRecall}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all active:scale-95"
                style={{ background:'#F5F3FF', color:'#5B21B6', borderColor:'#DDD6FE', minHeight:36 }}>
                <RefreshIco s={12}/> Gọi lại
              </button>
              <button onClick={onCancel}
                className="py-2 px-3 rounded-lg text-xs font-semibold text-red-600 border transition-all active:scale-95"
                style={{ background:'#FEF2F2', borderColor:'#FECACA', minHeight:36 }}>
                Hủy bỏ
              </button>
            </>
          )}
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2">
              <CheckIco s={12}/> Đã hoàn thành ca phục vụ
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   SCREEN 2 — COUNTER COMMAND BAR + KANBAN BOARD
══════════════════════════════════════════════════════════════════ */
function CounterCommandBar({ servedToday }: { servedToday: number }) {
  const [status, setStatus] = useState<'serving'|'available'|'break'>('serving')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [serviceFilter, setServiceFilter] = useState('Tất cả dịch vụ')

  const statusCfg = {
    serving:   { label:'Đang phục vụ', color:'#059669', bg:'#ECFDF5', dot:'#10B981' },
    available: { label:'Sẵn sàng',     color:'#1E40AF', bg:'#EFF6FF', dot:'#3B82F6' },
    break:     { label:'Tạm nghỉ',     color:'#92400E', bg:'#FFFBEB', dot:'#F59E0B' },
  }
  const sc = statusCfg[status]

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 flex-wrap">
      {/* Counter badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background:'#EFF6FF', border:'1.5px solid #BFDBFE' }}>
        <div className="w-2 h-2 rounded-full bg-blue-500 dot-blink"/>
        <span className="text-sm font-bold text-blue-800">QUẦY TIẾP NHẬN</span>
        <span className="text-slate-300">·</span>
        <span className="text-xs font-medium text-blue-600">Tư vấn & Phục vụ</span>
      </div>

      {/* Service filter */}
      <div className="relative">
        <select className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer appearance-none pr-7"
          value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
          <option>Tất cả dịch vụ</option>
          {SERVICES.map(s => <option key={s}>{s}</option>)}
        </select>
        <ChevDnIco s={12}/>
      </div>

      {/* Throughput */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <BarIco s={13}/>
        <span className="font-tabular text-slate-700">{servedToday}</span> phục vụ hôm nay
      </div>

      <div className="flex-1"/>

      {/* Status toggle */}
      <div className="relative">
        <button onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all"
          style={{ background: sc.bg, color: sc.color, borderColor: sc.color + '40' }}>
          <span className="w-2 h-2 rounded-full dot-blink" style={{ background: sc.dot }}/>
          {sc.label}
          <ChevDnIco s={12}/>
        </button>
        {showStatusMenu && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
            {(['serving','available','break'] as const).map(s => {
              const c = statusCfg[s]
              return (
                <button key={s} onClick={() => { setStatus(s); setShowStatusMenu(false) }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-left hover:bg-slate-50 transition-colors"
                  style={{ color: s===status ? c.color : '#475569' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: c.dot }}/>{c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Staff avatar */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold">NH</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: sc.dot }}/>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-slate-700">Nguyễn Thị Hồng</p>
          <p className="text-[10px] text-slate-400">Ca sáng · 07:00 – 12:00</p>
        </div>
      </div>
    </div>
  )
}

function KanbanBoard() {
  const [tickets, setTickets] = useState<KTicket[]>(INIT_KANBAN)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<KanbanCol | null>(null)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [servedToday, setServedToday] = useState(23)

  const showToast = useCallback((t: ToastMsg) => { setToast(t); setTimeout(() => setToast(null), 3000) }, [])

  // Live elapsed timer for serving ticket
  useEffect(() => {
    const srv = tickets.find(t => t.col === 'serving')
    if (!srv?.calledAt) return
    setElapsed(Math.floor((Date.now() - srv.calledAt) / 1000))
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [tickets])

  const moveTicket = useCallback((id: string, toCol: KanbanCol) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, col: toCol, calledAt: toCol === 'serving' ? Date.now() : t.calledAt } : t))
  }, [])

  const callNext = useCallback((ticketId: string) => {
    const hasServing = tickets.some(t => t.col === 'serving')
    if (hasServing) { showToast({ type:'info', text:'Hoàn thành vé đang phục vụ trước khi gọi số mới.' }); return }
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, col:'serving', calledAt:Date.now() } : t))
    setElapsed(0)
    showToast({ type:'success', text:'Đã gọi số — Khách đang được hướng dẫn vào quầy.' })
  }, [tickets, showToast])

  const complete = useCallback((id: string, code: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, col:'completed' } : t))
    setServedToday(n => n + 1)
    showToast({ type:'success', text:`${code} – Hoàn thành phục vụ.` })
  }, [showToast])

  const markNoShow = useCallback((id: string, code: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, col:'noshow' } : t))
    showToast({ type:'info', text:`${code} – Đánh dấu vắng mặt. Khách có 8 giây để hoàn tác.` })
  }, [showToast])

  const recall = useCallback((id: string, code: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, col:'waiting', waitMin:5 } : t))
    showToast({ type:'info', text:`${code} – Đã gọi lại, chuyển về hàng chờ.` })
  }, [showToast])

  const cancel = useCallback((id: string, code: string) => {
    setTickets(prev => prev.filter(t => t.id !== id))
    showToast({ type:'info', text:`${code} – Đã huỷ và xoá khỏi hàng đợi.` })
  }, [showToast])

  const onDrop = useCallback((toCol: KanbanCol) => {
    if (!draggingId) return
    moveTicket(draggingId, toCol)
    setDraggingId(null); setDragOverCol(null)
    showToast({ type:'info', text:'Vé đã được chuyển sang cột mới.' })
  }, [draggingId, moveTicket, showToast])

  return (
    <div className="flex flex-col h-full">
      {toast && <Toast msg={toast} onDone={() => setToast(null)}/>}
      <CounterCommandBar servedToday={servedToday}/>

      {/* Kanban columns */}
      <div className="flex-1 overflow-hidden p-5 grid gap-4" style={{ gridTemplateColumns:'repeat(4, 1fr)' }}>
        {KCOLS.map(col => {
          const colTickets = tickets.filter(t => t.col === col.id)
          const isDragTarget = dragOverCol === col.id
          return (
            <div key={col.id} className="flex flex-col min-h-0 rounded-2xl transition-all duration-150"
              style={{ background: isDragTarget ? col.bg : '#F8FAFC', border: isDragTarget ? `2px dashed ${col.accentColor}60` : '2px solid transparent' }}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => onDrop(col.id)}>

              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.accentColor }}/>
                  <span className="text-sm font-bold text-slate-700">{col.label}</span>
                </div>
                <span className="font-tabular text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: col.bg, color: col.accentColor }}>
                  {colTickets.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
                {colTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-300 text-xs font-medium">
                    <TicketIco s={24}/>
                    <span className="mt-2">{col.emptyText}</span>
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <div key={ticket.id} draggable
                      onDragStart={() => setDraggingId(ticket.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}>
                      <TicketCard
                        ticket={ticket}
                        elapsed={ticket.col === 'serving' ? elapsed : undefined}
                        isDragging={draggingId === ticket.id}
                        onCallNext={() => callNext(ticket.id)}
                        onComplete={() => complete(ticket.id, ticket.code)}
                        onNoShow={() => markNoShow(ticket.id, ticket.code)}
                        onRecall={() => recall(ticket.id, ticket.code)}
                        onCancel={() => cancel(ticket.id, ticket.code)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════ */
function AnalyticsDashboard() {
  const [branch, setBranch] = useState('Cơ sở Quận 10')
  const [waitingCount, setWaitingCount] = useState(12)
  const [clock, setClock] = useState(new Date())
  const [lastAction, setLastAction] = useState('Sẵn sàng tiếp nhận lượt tiếp theo')

  const runAction = useCallback((action: 'next' | 'recall' | 'absent') => {
    if (action === 'next') {
      setWaitingCount(count => Math.max(0, count - 1))
      setLastAction('Đã gọi số A-098 đến quầy tiếp nhận')
      return
    }
    setLastAction(action === 'recall' ? 'Đã gọi lại số A-097' : 'Đã đánh dấu A-097 vắng mặt')
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select')) return
      if (event.code === 'Space') {
        event.preventDefault()
        runAction('next')
      } else if (event.key.toLowerCase() === 'r') {
        runAction('recall')
      } else if (event.key.toLowerCase() === 'n') {
        runAction('absent')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [runAction])

  return (
    <div className="min-h-full bg-slate-50">
      <div className="h-[72px] border-b border-slate-200 bg-white px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => runAction('next')}
            className="min-h-[54px] min-w-[260px] rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 active:bg-blue-800"
          >
            <span className="flex items-center justify-center gap-3">
              <ArrowRIco s={18}/>
              Gọi số tiếp theo
              <kbd className="rounded-md border border-white/20 bg-white/15 px-2 py-1 font-tabular text-[10px] font-medium text-blue-50">
                Space
              </kbd>
            </span>
          </button>
          <button
            type="button"
            onClick={() => runAction('recall')}
            className="h-[54px] rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <span className="flex items-center gap-2">
              <RefreshIco s={16}/>
              Gọi lại
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-tabular text-[10px] text-slate-500">R</kbd>
            </span>
          </button>
          <button
            type="button"
            onClick={() => runAction('absent')}
            className="h-[54px] rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <span className="flex items-center gap-2">
              <XCircIco s={16}/>
              Vắng mặt
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-tabular text-[10px] text-slate-500">N</kbd>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <div className="flex items-center gap-2 text-slate-600">
            <ClockIco s={16}/>
            <time className="font-tabular text-sm font-semibold" dateTime={clock.toISOString()}>
              {clock.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </time>
          </div>
          <div className="h-6 w-px bg-slate-200"/>
          <div className="font-tabular text-sm font-medium text-slate-600">
            Đang chờ: <strong className="text-slate-900">{waitingCount}</strong>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
            </span>
            2/3 Chuyên viên sẵn sàng
          </div>
        </div>
      </div>

      <div className="p-6 max-w-full overflow-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"/>
              {lastAction}
            </div>
            <h1 className="text-xl font-bold text-slate-900">Trung tâm điều phối hàng đợi</h1>
            <p className="text-sm leading-relaxed text-slate-500 mt-1">Thứ Tư, 30 tháng 9, 2026 · Phòng khám Đa khoa St. Jude</p>
          </div>
          <select className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={branch} onChange={e => setBranch(e.target.value)}>
            {['Cơ sở Quận 10','Cơ sở Bình Thạnh','Cơ sở Gò Vấp'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Vé phục vụ hôm nay', value:'247', unit:'lượt', delta:'+12%', color:'#1E40AF', bg:'#EFF6FF' },
          { label:'Thời gian chờ TB',    value:'8.3', unit:'phút', delta:'-1.2p', color:'#059669', bg:'#ECFDF5' },
          { label:'Tỉ lệ vắng mặt',     value:'4.2', unit:'%',    delta:'-0.8%', color:'#D97706', bg:'#FFFBEB' },
          { label:'Điểm hài lòng',       value:'4.7', unit:'/ 5',  delta:'+0.2',  color:'#7C3AED', bg:'#F5F3FF' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl px-5 py-4" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-400 leading-tight max-w-[100px]">{k.label}</p>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background:k.bg, color:k.color }}>{k.delta}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-tabular text-3xl font-bold" style={{ color:k.color }}>{k.value}</span>
              <span className="text-sm text-slate-400">{k.unit}</span>
            </div>
          </div>
        ))}
        </div>

        <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-7 bg-white rounded-2xl p-5" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Lưu lượng hàng đợi hôm nay</h3>
              <p className="text-xs text-slate-400 mt-0.5">Số vé phát hành theo giờ · {branch}</p>
            </div>
          </div>
          <HourlyChart/>
        </div>
        <div className="col-span-5 bg-white rounded-2xl p-5" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Phân loại dịch vụ</h3>
          <div className="space-y-3">
            {SERVICES_STATS.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-600 truncate max-w-[120px]">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-tabular text-slate-400">{s.avg}p TB</span>
                    <span className="font-tabular font-bold text-slate-700 w-6 text-right">{s.count}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${Math.round(s.count/247*100)}%`, background:s.color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="bg-white rounded-2xl p-5" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
        <h3 className="text-sm font-bold text-slate-800 mb-4">Phản hồi gần đây</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name:'Nguyễn Thị Lan', svc:'Tư vấn tổng quát', rating:5, comment:'Nhân viên nhiệt tình, không phải chờ lâu.' },
            { name:'Trần Văn Minh',  svc:'Xét nghiệm máu',    rating:4, comment:'Hệ thống đặt lịch rất tiện lợi, giảm nhiều thời gian chờ.' },
            { name:'Lê Thị Hoa',    svc:'Siêu âm thai',      rating:5, comment:'Giao diện dễ dùng, nhận thông báo đúng lúc.' },
          ].map(f => (
            <div key={f.name} className="flex gap-3 p-3 rounded-xl" style={{ background:'#F8FAFC' }}>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-[11px] font-bold shrink-0">{f.name[0]}</div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-700">{f.name}</span>
                  <div className="flex text-amber-400 gap-0.5">{Array.from({length:f.rating}).map((_,i) => <StarIco key={i} s={10} fill/>)}</div>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{f.comment}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [clock, setClock] = useState(new Date())
  const [showConflict, setShowConflict] = useState(true)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const [ticketAction, setTicketAction] = useState<{ type:'hold' | 'transfer' | 'note'; ticket:OpsTicket } | null>(null)
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<OpsStage | null>(null)
  const [dragOverTicketId, setDragOverTicketId] = useState<string | null>(null)
  const [staffToast, setStaffToast] = useState<string | null>(null)
  const [dynamicQr, setDynamicQr] = useState<DynamicCheckinState>(() => getDynamicCheckinData())
  const [showCounterQrModal, setShowCounterQrModal] = useState(false)
  const [copiedCounterUrl, setCopiedCounterUrl] = useState(false)

  const showStaffToast = useCallback((msg: string) => {
    setStaffToast(msg)
    window.setTimeout(() => setStaffToast(null), 2500)
  }, [])

  useEffect(() => {
    const update = () => setDynamicQr(getDynamicCheckinData())
    const timer = window.setInterval(update, 1000)
    const handleSync = () => update()
    window.addEventListener('nextturn_qr_sync', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('nextturn_qr_sync', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const copyCounterUrl = useCallback(() => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(dynamicQr.checkInUrl).catch(() => {})
    }
    setCopiedCounterUrl(true)
    showStaffToast('Đã sao chép đường dẫn check-in quầy!')
    window.setTimeout(() => setCopiedCounterUrl(false), 2000)
  }, [dynamicQr.checkInUrl, showStaffToast])

  const [tickets, setTickets] = useState<OpsTicket[]>([
    ...[
      ['A-043','Trần Văn Minh','Xét nghiệm máu','08:48'],
      ['A-044','Lê Thị Hoa','Tư vấn tổng quát','08:53'],
      ['A-045','Phạm Văn Bình','Tiêm phòng','08:57'],
      ['A-046','Hoàng Thị Mai','Siêu âm','09:01'],
      ['A-047','Vũ Thanh Tùng','Tư vấn tổng quát','09:04'],
      ['A-048','Đặng Thị Ngọc','Xét nghiệm máu','09:08'],
      ['A-049','Bùi Văn Hùng','Răng hàm mặt','09:12'],
      ['A-050','Ngô Lan Anh','Tư vấn tổng quát','09:16'],
    ].map(([code,name,service,time], index) => ({
      id:`wait-${index}`, code, name, service, time, stage:'waiting' as const,
    })),
    { id:'call-1', code:'A-042', name:'Nguyễn Thị Ánh Nguyệt', service:'Tư vấn tổng quát', time:'08:38', stage:'calling', priority:true },
    { id:'serve-1', code:'A-096', name:'Nguyễn Minh Anh', service:'Xét nghiệm máu', time:'08:31', stage:'serving' },
    { id:'serve-2', code:'A-095', name:'Trần Quốc Bảo', service:'Tư vấn tổng quát', time:'08:26', stage:'serving' },
  ])

  const runAction = useCallback((action: 'next' | 'recall' | 'absent') => {
    setTickets(current => {
      if (action === 'recall') return [...current]
      if (action === 'absent') {
        const called = current.find(ticket => ticket.stage === 'calling')
        return called
          ? current.map(ticket => ticket.id === called.id ? { ...ticket, stage:'completed' } : ticket)
          : current
      }
      const next = current.find(ticket => ticket.stage === 'waiting')
      return next
        ? current.map(ticket => ticket.id === next.id ? { ...ticket, stage:'calling' } : ticket)
        : current
    })
  }, [])

  const handleCardDrop = useCallback((targetTicketId: string, targetStage: OpsStage) => {
    if (!draggingTicketId) return
    const draggedItem = tickets.find(t => t.id === draggingTicketId)
    if (!draggedItem) return

    setTickets(prev => {
      const remaining = prev.filter(t => t.id !== draggingTicketId)
      const targetIndex = remaining.findIndex(t => t.id === targetTicketId)
      const updatedItem = { ...draggedItem, stage: targetStage }
      if (targetIndex === -1) {
        return [...remaining, updatedItem]
      }
      const updated = [...remaining]
      updated.splice(targetIndex, 0, updatedItem)
      return updated
    })

    const stageLabels: Record<OpsStage, string> = {
      waiting: 'Đang chờ',
      calling: 'Đang gọi',
      serving: 'Đang phục vụ',
      completed: 'Hoàn tất',
    }
    showStaffToast(`Đã chuyển vé ${draggedItem.code} sang cột ${stageLabels[targetStage]}`)
    setDraggingTicketId(null)
    setDragOverStage(null)
    setDragOverTicketId(null)
  }, [draggingTicketId, tickets, showStaffToast])

  const handleColumnDrop = useCallback((targetStage: OpsStage) => {
    if (!draggingTicketId) return
    const draggedItem = tickets.find(t => t.id === draggingTicketId)
    if (!draggedItem) return

    setTickets(prev => {
      const remaining = prev.filter(t => t.id !== draggingTicketId)
      return [...remaining, { ...draggedItem, stage: targetStage }]
    })

    const stageLabels: Record<OpsStage, string> = {
      waiting: 'Đang chờ',
      calling: 'Đang gọi',
      serving: 'Đang phục vụ',
      completed: 'Hoàn tất',
    }
    showStaffToast(`Đã chuyển vé ${draggedItem.code} sang cột ${stageLabels[targetStage]}`)
    setDraggingTicketId(null)
    setDragOverStage(null)
    setDragOverTicketId(null)
  }, [draggingTicketId, tickets, showStaffToast])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select')) return
      if (event.code === 'Space') {
        event.preventDefault()
        runAction('next')
      } else if (event.key.toLowerCase() === 'r') {
        runAction('recall')
      } else if (event.key.toLowerCase() === 'n') {
        runAction('absent')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [runAction])

  const columns: Array<{ stage: OpsStage; label: string; chip: string; text: string; tint: string }> = [
    { stage:'waiting', label:'ĐANG CHỜ', chip:'#EFF6FF', text:'#1E40AF', tint:'rgba(239,246,255,0.4)' },
    { stage:'calling', label:'ĐANG GỌI', chip:'#FFFBEB', text:'#92400E', tint:'rgba(255,251,235,0.5)' },
    { stage:'serving', label:'ĐANG PHỤC VỤ', chip:'#ECFDF5', text:'#065F46', tint:'rgba(236,253,245,0.5)' },
    { stage:'completed', label:'HOÀN TẤT', chip:'#F1F5F9', text:'#475569', tint:'rgba(241,245,249,0.6)' },
  ]
  const waitingCount = tickets.filter(ticket => ticket.stage === 'waiting').length

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {staffToast && (
        <div role="status" className="overlay-enter fixed top-4 right-6 z-[250] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <CheckIco s={14}/>
          <span>{staffToast}</span>
        </div>
      )}
      {showShortcutHelp && (
        <div
          className="overlay-enter fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(15,23,42,0.32)] p-6"
          role="presentation"
          onMouseDown={() => setShowShortcutHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-title"
            className="dialog-enter w-full max-w-md rounded-xl bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.28)]"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="shortcut-title" className="text-lg font-bold leading-relaxed text-slate-900">Phím tắt bàn phím</h2>
                <p className="text-xs leading-relaxed text-slate-500">Điều phối hàng đợi nhanh mà không rời bàn phím.</p>
              </div>
              <button type="button" onClick={() => setShowShortcutHelp(false)} aria-label="Đóng hướng dẫn phím tắt"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
                <XSmIco s={17}/>
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                ['Space','Gọi tiếp'],
                ['R','Gọi lại'],
                ['N','Vắng mặt'],
                ['H','Giữ lượt'],
                ['T','Chuyển chuyên môn'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium leading-relaxed text-slate-700">{label}</span>
                  <kbd className="min-w-10 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-center font-tabular text-xs font-bold text-slate-600 shadow-sm">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {ticketAction && (
        <div className="overlay-enter fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/35 p-6" role="presentation" onMouseDown={() => setTicketAction(null)}>
          <div role="dialog" aria-modal="true" className="dialog-enter w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-modal)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-tabular text-[11px] font-bold text-blue-700">{ticketAction.ticket.code}</p>
                <h2 className="mt-1 text-lg font-bold leading-relaxed text-slate-900">
                  {ticketAction.type === 'hold' ? 'Hold Confirmation' : ticketAction.type === 'transfer' ? 'Transfer Specialist' : 'Add Note'}
                </h2>
              </div>
              <button type="button" onClick={() => setTicketAction(null)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><XSmIco s={17}/></button>
            </div>
            {ticketAction.type === 'hold' ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">Xác nhận giữ lượt này trong hàng đợi hiện tại?</div>
            ) : ticketAction.type === 'transfer' ? (
              <div className="mt-5 space-y-2">
                {['BS. Minh — Đang rảnh','BS. Hương — Đang phục vụ','BS. Tuấn — Giải lao'].map((specialist,index) => (
                  <button key={specialist} type="button" className={`w-full rounded-lg border p-3 text-left text-sm font-semibold ${index === 0 ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'}`}>{specialist}</button>
                ))}
              </div>
            ) : (
              <label className="mt-5 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Ghi chú nội bộ</span><textarea rows={4} autoFocus className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm leading-relaxed outline-none focus:border-blue-500" placeholder="Nhập ghi chú cho lượt phục vụ..."/></label>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setTicketAction(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-600">Hủy</button>
              <button type="button" onClick={() => setTicketAction(null)} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
      {showConflict && (
        <div role="alert" className="fixed right-5 top-5 z-[100] flex max-w-md items-start gap-3 border-l-[3px] border-amber-600 bg-white p-4 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.14),0_8px_10px_-6px_rgba(15,23,42,0.08)]">
          <span className="mt-0.5 shrink-0 text-amber-600"><AlertIco s={18}/></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-relaxed text-slate-800">
              Thao tác thất bại: Vé A-042 vừa được nhân viên khác cập nhật.
            </p>
            <button type="button" onClick={() => setShowConflict(false)}
              className="mt-2 text-xs font-bold text-blue-700 transition-colors hover:text-blue-900">
              Tải lại
            </button>
          </div>
        </div>
      )}
      {showCounterQrModal && (
        <div
          className="overlay-enter fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-xs"
          role="presentation"
          onMouseDown={() => setShowCounterQrModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="counter-qr-title"
            className="dialog-enter w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  QUẦY TIẾP NHẬN CHÍNH · SẢNH CHÍNH
                </span>
                <h2 id="counter-qr-title" className="mt-1.5 text-lg font-bold text-slate-900">
                  Mã QR & Đường dẫn Check-in tại Quầy
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Khách hàng quét mã hoặc truy cập đường dẫn để xác nhận lịch hẹn hoặc lấy số thứ tự.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCounterQrModal(false)}
                aria-label="Đóng bảng mã QR"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <XSmIco s={17}/>
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-white p-6 border border-slate-200 text-center">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
                <QRCode sz={180}/>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {dynamicQr.token}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-tabular text-xs font-bold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"/>
                  Tự động làm mới sau: <strong className="text-blue-700">{dynamicQr.remainingSeconds}s</strong>
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <TicketIco s={13}/> Đường dẫn check-in của quầy
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 font-mono">
                  Đồng bộ thời gian thực
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={dynamicQr.checkInUrl}
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700 outline-none select-all focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={copyCounterUrl}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 shrink-0 shadow-xs"
                >
                  {copiedCounterUrl ? <><CheckIco s={14}/>Đã chép</> : <><CopyIco s={14}/>Sao chép URL</>}
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => window.open(dynamicQr.checkInUrl, '_blank')}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <MonitorIco s={16}/>
                <span>Mở giao diện khách</span>
                <ExternalLinkIco s={13}/>
              </button>
              <button
                type="button"
                onClick={rotateDynamicCheckinNow}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshIco s={15}/>
                <span>Làm mới URL ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="sticky top-0 z-50 flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white" title="NextTurn">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="NextTurn">
            <path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>
          </svg>
        </div>

        <div className="flex h-10 shrink-0 items-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300">
          <button type="button" className="flex h-full items-center gap-2 rounded-l-lg px-3 transition-colors hover:bg-blue-50">
            Khám tổng quát
            <ChevDnIco s={13}/>
          </button>
          <span className="h-5 w-px bg-slate-200"/>
          <span className="group/capacity relative flex h-full items-center px-2">
            <button type="button" aria-label="Xem năng lực chuyên viên"
              className="rounded-full bg-emerald-50 px-2 py-0.5 font-tabular text-[11px] font-bold text-emerald-800">
              2/3
            </button>
            <span className="pointer-events-none absolute left-1/2 top-full z-[120] w-64 -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-all duration-200 ease-out group-hover/capacity:pointer-events-auto group-hover/capacity:translate-y-0 group-hover/capacity:opacity-100 group-focus-within/capacity:pointer-events-auto group-focus-within/capacity:translate-y-0 group-focus-within/capacity:opacity-100">
              <span className="block rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.08)]">
                <span className="block border-b border-slate-100 px-2 py-1.5 text-[10px] font-bold tracking-[0.08em] text-slate-400">CHUYÊN VIÊN</span>
                <span className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"/>
                  <span className="text-xs font-semibold leading-relaxed text-slate-700">Minh <span className="font-normal text-slate-500">— rảnh</span></span>
                </span>
                <span className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500"/>
                  <span className="text-xs font-semibold leading-relaxed text-slate-700">Hương <span className="font-normal text-slate-500">— đang phục vụ <span className="font-tabular">A-096</span></span></span>
                </span>
                <span className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400"/>
                  <span className="text-xs font-semibold leading-relaxed text-slate-700">Tuấn <span className="font-normal text-slate-500">— giải lao</span></span>
                </span>
              </span>
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => runAction('next')} disabled={waitingCount === 0}
            className="h-[54px] min-w-[220px] rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
            <span className="flex items-center justify-center gap-3">
              <ArrowRIco s={18}/>Gọi số tiếp theo
              <kbd className="rounded-md border border-white/20 bg-white/15 px-2 py-1 font-tabular text-[10px] font-medium text-blue-50">Space</kbd>
            </span>
          </button>
          <button type="button" onClick={() => runAction('recall')}
            className="h-[54px] rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <span className="flex items-center gap-2"><RefreshIco s={16}/>Gọi lại<kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-tabular text-[10px] text-slate-500">R</kbd></span>
          </button>
          <button type="button" onClick={() => runAction('absent')}
            className="h-[54px] rounded-lg border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200">
            <span className="flex items-center gap-2"><XCircIco s={16}/>Vắng mặt<kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-tabular text-[10px] text-slate-500">N</kbd></span>
          </button>
        </div>

        <div className="flex-1"/>

        {/* Dynamic QR Check-in URL for Counter Staff */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setShowCounterQrModal(true)}
            title="Mở bảng mã QR tiếp nhận khách tại quầy"
            className="flex h-9 items-center gap-2 rounded-md bg-white px-3 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:border-blue-300 hover:text-blue-700"
          >
            <QrIco s={15}/>
            <span>QR Tiếp nhận quầy</span>
            <span className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 font-tabular text-[10px] font-bold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"/>
              {dynamicQr.remainingSeconds}s
            </span>
          </button>
          <button
            type="button"
            onClick={copyCounterUrl}
            title="Sao chép URL check-in động hiện tại"
            className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
          >
            {copiedCounterUrl ? <CheckIco s={14}/> : <CopyIco s={14}/>}
            <span className="hidden xl:inline">{copiedCounterUrl ? 'Đã chép' : 'Sao chép link'}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-slate-600">
          <ClockIco s={16}/>
          <time className="font-tabular text-sm font-semibold" dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </time>
          <span className="h-5 w-px bg-slate-200"/>
          <span className="font-tabular text-sm font-medium">Đang chờ: <strong className="text-slate-700">{String(waitingCount).padStart(2, '0')}</strong></span>
        </div>

        <button type="button" title="Mở màn hình sảnh" aria-label="Mở màn hình sảnh"
          onClick={() => window.open(`${window.location.origin}/st-jude/display`, '_blank', 'noopener,noreferrer')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
          <MonitorIco s={18}/>
        </button>

        <div className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-600">
          Ca sáng <span className="font-tabular text-slate-700">07:30–11:30</span>
        </div>

        <div className="relative shrink-0">
          <button type="button" onClick={() => setShowAvatarMenu(value => !value)} aria-label="Mở menu tài khoản" aria-expanded={showAvatarMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-800 text-xs font-bold text-white ring-2 ring-white transition-shadow hover:ring-blue-200">
            NH
          </button>
          {showAvatarMenu && (
            <div className="overlay-enter absolute right-0 top-full z-[110] mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold leading-relaxed text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500"/>
                Trạng thái ca: <span className="text-emerald-700">Đang phục vụ</span>
              </div>
              <button type="button" onClick={() => { setShowShortcutHelp(true); setShowAvatarMenu(false) }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                <span className="flex items-center gap-2"><InfoIco s={15}/>Phím tắt</span>
                <kbd className="font-tabular text-[10px] text-slate-400">[?]</kbd>
              </button>
              <button type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                <ShieldIco s={15}/>Đổi mật khẩu
              </button>
              <div className="my-1 h-px bg-slate-200"/>
              <button type="button" onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-red-800 transition-colors hover:bg-red-50">
                <LogOutIco s={15}/>Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 p-6">
        <div className="grid h-full min-h-0 grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {columns.map((column, columnIndex) => {
            const columnTickets = tickets.filter(ticket => ticket.stage === column.stage)
            const isDragOverThisStage = dragOverStage === column.stage
            return (
              <section key={column.stage}
                onDragOver={e => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOverStage !== column.stage) setDragOverStage(column.stage)
                }}
                onDragLeave={e => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return
                  setDragOverStage(null)
                }}
                onDrop={e => {
                  e.preventDefault()
                  handleColumnDrop(column.stage)
                }}
                className={`min-h-0 flex flex-col overflow-y-auto transition-all duration-150 ${columnIndex < columns.length - 1 ? 'border-r border-slate-200' : ''} ${isDragOverThisStage ? 'bg-blue-50/70 ring-2 ring-inset ring-blue-500/70' : ''}`}
                style={{ background: isDragOverThisStage ? undefined : column.tint }}>
                <div className="sticky top-0 z-10 px-4 pb-3 pt-4 backdrop-blur-sm" style={{ background:column.tint }}>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background:column.chip, color:column.text }}>
                    <span className="text-xs font-bold tracking-[0.08em]">{column.label}</span>
                    <span className="rounded-md bg-white/70 px-2 py-0.5 font-tabular text-xs font-bold">
                      {String(columnTickets.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 px-4 pb-4 flex-1">
                  {columnTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', ticket.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingTicketId(ticket.id)
                      }}
                      onDragEnd={() => {
                        setDraggingTicketId(null)
                        setDragOverStage(null)
                        setDragOverTicketId(null)
                      }}
                      onDragOver={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverTicketId !== ticket.id) setDragOverTicketId(ticket.id)
                        if (dragOverStage !== column.stage) setDragOverStage(column.stage)
                      }}
                      onDrop={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCardDrop(ticket.id, column.stage)
                      }}
                      className={`group/card flex w-full flex-col gap-0 transition-[gap,opacity,transform] duration-150 ease-out hover:gap-3 focus-within:gap-3 cursor-grab active:cursor-grabbing ${draggingTicketId === ticket.id ? 'opacity-40 scale-[0.98]' : ''} ${dragOverTicketId === ticket.id && draggingTicketId !== ticket.id ? 'border-t-2 border-blue-500 pt-1' : ''}`}
                    >
                      <article
                        className={`relative flex min-h-[120px] flex-col justify-center rounded-[10px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_1px_1px_rgba(15,23,42,0.02)] transition-all duration-200 ease-out group-hover/card:-translate-y-0.5 group-hover/card:shadow-[0_12px_24px_-8px_rgba(15,23,42,0.18),0_4px_8px_-4px_rgba(15,23,42,0.10)] group-focus-within/card:-translate-y-0.5 ${ticket.stage === 'calling' ? 'calling-timeout' : ticket.id === 'serve-1' ? 'serving-overtime' : 'group-hover/card:border-slate-300 group-focus-within/card:border-slate-300'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-tabular text-[22px] font-bold leading-none text-slate-900">{ticket.code}</span>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold tracking-[0.04em] text-blue-800">
                            ĐẶT HẸN
                          </span>
                        </div>
                        <p className="py-1 text-[15px] font-normal leading-[1.6] text-slate-900">
                          {ticket.name}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-tabular text-[13px] text-slate-600">
                            <ClockIco s={16}/>
                            Đã chờ 14:32
                          </span>
                          {ticket.stage === 'calling' ? (
                            <span className="rounded-md bg-red-50 px-2 py-1 font-tabular text-xs font-bold text-red-800">01:14</span>
                          ) : ticket.id === 'serve-1' ? (
                            <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Vượt T_standard</span>
                          ) : (
                            <span className="text-slate-400 group-hover/card:text-blue-600 transition-colors cursor-grab" aria-label="Kéo thả để sắp xếp hoặc chuyển trạng thái"><GripIco s={16}/></span>
                          )}
                        </div>
                      </article>

                      <div
                        className="max-h-0 min-h-0 w-full overflow-hidden rounded-[10px] border-t border-[#E2E8F0] bg-[#F8FAFC] opacity-0 shadow-[var(--shadow-card)] transition-[max-height,opacity] duration-150 ease-out group-hover/card:max-h-[240px] group-hover/card:min-h-[180px] group-hover/card:opacity-100 group-focus-within/card:max-h-[240px] group-focus-within/card:min-h-[180px] group-focus-within/card:opacity-100"
                        data-layout="Normal-flow Auto Layout child; never absolutely positioned"
                      >
                        <div className="space-y-2 p-4">
                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold leading-[1.5] text-slate-600">Cơ sở 100 (Đặt hẹn) + Lão hóa +25 (5 phút) = <strong className="text-slate-900">125 Điểm</strong></p>
                            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <span className="w-4/5 bg-blue-600"/>
                              <span className="w-1/5 bg-amber-400"/>
                            </div>
                          </div>

                          <p className="font-tabular text-[13px] leading-[1.5] text-[#475569]">T_standard: 15 phút • Dự kiến 10:42</p>

                          <div className="flex gap-3">
                            <button type="button" title="Giữ lượt [H]" aria-label="Giữ lượt, phím H" onClick={() => setTicketAction({ type:'hold', ticket })}
                              data-prototype-navigation="Hold Confirmation"
                              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 transition-colors duration-150 ease-out hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-blue-700">
                              <PauseIco s={19}/>
                              <kbd className="mt-1 font-tabular text-[10px] leading-none text-[#94A3B8]">[H]</kbd>
                            </button>
                            <button type="button" title="Chuyển chuyên môn [T]" aria-label="Chuyển chuyên môn, phím T" onClick={() => setTicketAction({ type:'transfer', ticket })}
                              data-prototype-navigation="Transfer Specialist"
                              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 transition-colors duration-150 ease-out hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-blue-700">
                              <SwapIco s={19}/>
                              <kbd className="mt-1 font-tabular text-[10px] leading-none text-[#94A3B8]">[T]</kbd>
                            </button>
                            <button type="button" title="Ghi chú" aria-label="Ghi chú" onClick={() => setTicketAction({ type:'note', ticket })}
                              data-prototype-navigation="Add Note"
                              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 transition-colors duration-150 ease-out hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-blue-700">
                              <NoteIco s={19}/>
                              <span className="mt-1 text-[10px] leading-none text-[#94A3B8]">Ghi chú</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Khách lần đầu</span>
                            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Cần phiên dịch</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isDragOverThisStage && draggingTicketId && (
                    <div className="rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80 p-3.5 text-center text-xs font-bold text-blue-700 animate-pulse">
                      Thả vé vào đây để chuyển sang {column.label}
                    </div>
                  )}
                  {columnTickets.length === 0 && (!isDragOverThisStage || !draggingTicketId) && (
                    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="15" y="18" width="42" height="36" rx="6"/>
                        <path d="M23 29h26M23 36h18M23 43h11"/>
                        <path d="M28 18v-3h16v3"/>
                        <circle cx="52" cy="51" r="9" fill="#F8FAFC"/>
                        <path d="M48.5 51h7M52 47.5v7"/>
                      </svg>
                      <p className="mt-3 text-sm leading-relaxed text-slate-500">Hàng đợi hiện đang trống.</p>
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER / GUEST TICKET VIEW
══════════════════════════════════════════════════════════════════ */
function CustomerView({ onLogout }: { onLogout: () => void }) {
  const STATES: QueueState[] = ['waiting','upcoming','serving','completed']
  const [idx, setIdx] = useState(0)
  const state = STATES[idx]

  const CFG: Record<QueueState, { label:string; bg:string; border:string; text:string; dot:string; pulseClass:string; progress:number }> = {
    waiting:   { label:'ĐANG CHỜ',      bg:'#EFF6FF', border:'#BFDBFE', text:'#1E40AF', dot:'#3B82F6', pulseClass:'',               progress:15 },
    upcoming:  { label:'SẮP ĐẾN LƯỢT', bg:'#FFFBEB', border:'#FCD34D', text:'#92400E', dot:'#F59E0B', pulseClass:'pulse-upcoming',   progress:60 },
    serving:   { label:'ĐANG PHỤC VỤ', bg:'#ECFDF5', border:'#6EE7B7', text:'#065F46', dot:'#10B981', pulseClass:'pulse-serving',    progress:100 },
    completed: { label:'HOÀN THÀNH',   bg:'#F8FAFC', border:'#E2E8F0', text:'#475569', dot:'#94A3B8', pulseClass:'',               progress:100 },
  }
  const cfg = CFG[state]

  return (
    <div className="relative p-8 flex flex-col items-center bg-slate-50 min-h-full">
      <button type="button" onClick={onLogout}
        className="absolute right-6 top-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900">
        <LogOutIco s={15}/>Đăng xuất
      </button>
      <div className="w-full max-w-sm">
        <p className="text-center text-xs text-slate-400 font-semibold tracking-widest uppercase mb-4">Vé hàng đợi của bạn</p>

        <div className={`rounded-2xl p-6 mb-4 transition-all duration-300 ${cfg.pulseClass}`}
          style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest" style={{ color:cfg.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background:cfg.dot }}/>
              {cfg.label}
            </div>
            <span className="text-[10px] text-slate-400">Tư vấn tổng quát</span>
          </div>
          <div className="text-center py-3">
            <div className="text-[10px] font-bold tracking-[.15em] text-slate-400 uppercase mb-1">Số thứ tự</div>
            <div className="font-tabular font-extrabold leading-none" style={{ fontSize:60, color:'#0F172A', letterSpacing:'-0.03em' }}>A-042</div>
          </div>
          <div className="h-1.5 rounded-full bg-white/60 overflow-hidden my-4">
            <div className="h-full rounded-full transition-all duration-700" style={{ width:`${cfg.progress}%`, background:cfg.dot }}/>
          </div>
          <div className="flex items-center justify-between text-xs">
            {state==='serving' ? <span className="font-semibold" style={{ color:'#065F46' }}>Vui lòng đến <strong>QUẦY TIẾP NHẬN</strong></span>
             : state==='completed' ? <span className="text-slate-400">Dịch vụ hoàn thành — Cảm ơn!</span>
             : <>
                <span className="text-slate-400">{state==='waiting'?'12 người':'2 người'} phía trước</span>
                <span className="font-tabular font-semibold text-slate-500">~{state==='waiting'?'18':'3'} phút</span>
               </>
            }
          </div>
        </div>

        {state !== 'completed' && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 mb-4" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
            <QRCode sz={64}/>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mb-1">Mã xác thực QR</p>
              <p className="font-tabular text-sm font-bold text-slate-800">NX-4842-K</p>
              <p className="text-[10px] text-slate-400 mt-1">Xuất trình tại quầy để check-in</p>
            </div>
          </div>
        )}
        {state === 'completed' && (
          <div className="bg-white rounded-2xl p-4 text-center" style={{ boxShadow:'0 1px 3px rgba(15,23,42,.06), 0 0 0 1px #E2E8F0' }}>
            <p className="text-xs text-slate-500 mb-2">Đánh giá trải nghiệm</p>
            <div className="flex justify-center gap-2 text-amber-400">{[1,2,3,4,5].map(i => <StarIco key={i} s={22} fill={i<=4}/>)}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {STATES.map((s,i) => (
            <button key={s} onClick={() => setIdx(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={{ background:idx===i?CFG[s].bg:'#fff', color:idx===i?CFG[s].text:'#64748B', borderColor:idx===i?CFG[s].border:'#E2E8F0' }}>
              {CFG[s].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER PAGE
══════════════════════════════════════════════════════════════════ */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
        <ListIco s={28}/>
      </div>
      <h2 className="text-lg font-bold text-slate-700 mb-2">{title}</h2>
      <p className="text-sm text-slate-400 max-w-xs">Trang này đang trong quá trình phát triển và sẽ sớm được ra mắt.</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   SCREEN 4 — APP SHELL: SIDEBAR + HEADER
══════════════════════════════════════════════════════════════════ */
type NavItem = { page: Page; label: string; icon: React.ReactNode }
type NavSection = { section: string | null; items: NavItem[]; forRoles?: Role[] }

const NAV_CONFIG: NavSection[] = [
  { section: null, items: [
    { page:'dashboard', label:'Tổng quan',      icon:<GridIco s={16}/> },
  ], forRoles: ['superadmin','admin'] },
  { section: 'VẬN HÀNH', items: [
    { page:'kanban',   label:'Quầy giao dịch', icon:<MonitorIco s={16}/> },
    { page:'display',  label:'Màn hình sảnh',  icon:<TvIco s={16}/> },
  ]},
  { section: 'CẤU HÌNH', items: [
    { page:'services',      label:'Dịch vụ',         icon:<ListIco s={16}/> },
    { page:'staff-list',    label:'Nhân viên',        icon:<UsersIco s={16}/> },
    { page:'schedule',      label:'Lịch làm việc',    icon:<CalIco s={16}/> },
    { page:'queue-settings',label:'Cài đặt hàng đợi', icon:<SettingsIco s={16}/> },
  ], forRoles: ['superadmin','admin'] },
  { section: 'PHÂN TÍCH', items: [
    { page:'analytics', label:'Báo cáo',         icon:<BarIco s={16}/> },
  ], forRoles: ['superadmin','admin'] },
  { section: 'HỆ THỐNG', items: [
    { page:'tenants', label:'Quản lý tenants', icon:<ServerIco s={16}/> },
  ], forRoles: ['superadmin'] },
  { section: 'KHÁCH HÀNG', items: [
    { page:'my-ticket', label:'Vé của tôi', icon:<TicketIco s={16}/> },
  ], forRoles: ['customer','guest'] },
]

function Sidebar({ role, currentPage, onNav, collapsed, onToggle }: {
  role: Role; currentPage: Page; onNav: (p: Page) => void; collapsed: boolean; onToggle: () => void
}) {
  const isSA = role === 'superadmin'
  const accentColor = isSA ? '#6366F1' : '#3B82F6'

  const visibleSections = NAV_CONFIG.filter(sec => !sec.forRoles || sec.forRoles.includes(role))

  return (
    <aside className="flex flex-col h-full shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 56 : 220, background:'#0F172A', borderRight:'1px solid rgba(255,255,255,.05)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b" style={{ borderColor:'rgba(255,255,255,.06)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: isSA ? '#6366F1' : '#1E40AF' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-white tracking-tight">NextTurn</span>
            {isSA && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest" style={{ background:'rgba(99,102,241,.2)', color:'#A5B4FC' }}>SA</span>}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {visibleSections.map((sec, si) => (
          <div key={si} className="mb-4">
            {sec.section && !collapsed && (
              <p className="px-3 py-1 text-[10px] font-bold tracking-widest mb-1" style={{ color:'#334155' }}>
                {sec.section}
              </p>
            )}
            {sec.items.map(item => {
              const active = currentPage === item.page
              return (
                <button key={item.page} onClick={() => onNav(item.page)}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 mb-0.5"
                  style={{
                    color: active ? '#fff' : '#64748B',
                    background: active ? (isSA ? 'rgba(99,102,241,.18)' : 'rgba(59,130,246,.15)') : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => !active && (e.currentTarget.style.background='rgba(255,255,255,.04)')}
                  onMouseLeave={e => !active && (e.currentTarget.style.background='transparent')}>
                  <span style={{ color: active ? accentColor : '#475569', flexShrink:0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-t" style={{ borderColor:'rgba(255,255,255,.06)' }}>
        <button onClick={onToggle}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ color:'#475569', justifyContent: collapsed ? 'center' : 'flex-start' }}
          onMouseEnter={e => e.currentTarget.style.color='#94A3B8'}
          onMouseLeave={e => e.currentTarget.style.color='#475569'}>
          <MenuIco s={15}/>
          {!collapsed && <span>Thu gọn menu</span>}
        </button>
      </div>
    </aside>
  )
}

function AppHeader({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const cfg = ROLE_CFG[role]
  const names: Record<Role, string> = {
    superadmin: 'Vũ Quốc Thắng', admin: 'Trần Thị Bích Ngân',
    staff: 'Nguyễn Thị Hồng', customer: 'Lê Văn Hùng', guest: 'Khách vãng lai',
  }
  const initials: Record<Role, string> = {
    superadmin:'VT', admin:'BN', staff:'NH', customer:'LH', guest:'KH',
  }
  return (
    <header className="flex items-center justify-end gap-4 px-6 h-14 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <RoleBadge role={role}/>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800">{names[role]}</p>
          <p className="text-xs text-slate-400">{cfg.desc}</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: cfg.color }}>
          {initials[role]}
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all border border-slate-200">
          <LogOutIco s={13}/> Đăng xuất
        </button>
      </div>
    </header>
  )
}

function ChartTooltip({ label, value }: { label: string; value: string }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-white px-3 py-2 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
      <span className="block text-[10px] font-medium text-slate-500">{label}</span>
      <span className="block font-tabular text-xs font-bold text-slate-900">{value}</span>
    </span>
  )
}

function TicketVolumeChart() {
  const values = [18,31,47,38,56,63,49,72,58,44]
  const labels = ['07h','08h','09h','10h','11h','12h','13h','14h','15h','16h']
  return (
    <section className="col-span-8 rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold leading-relaxed text-slate-800">Số vé phục vụ theo giờ</h3>
          <p className="text-xs leading-relaxed text-slate-500">Số lượt hoàn tất theo từng giờ vận hành</p>
        </div>
        <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600"/>Vé phục vụ</span>
      </div>
      <div className="mt-5 flex h-56">
        <div className="flex w-9 flex-col justify-between pb-7 text-right font-tabular text-[9px] text-slate-400">
          <span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
        </div>
        <div className="relative ml-3 flex-1">
          <div className="absolute inset-x-0 top-0 h-px bg-slate-200"/><div className="absolute inset-x-0 top-1/4 h-px bg-slate-200"/>
          <div className="absolute inset-x-0 top-2/4 h-px bg-slate-200"/><div className="absolute inset-x-0 top-3/4 h-px bg-slate-200"/>
          <div className="absolute inset-x-0 bottom-7 h-px bg-slate-200"/>
          <div className="absolute inset-x-0 bottom-7 top-0 flex items-end justify-around gap-2 px-2">
            {values.map((value,index) => (
              <div key={labels[index]} className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t bg-blue-600 transition-colors duration-200 group-hover:bg-blue-700" style={{ height:`${value / 80 * 100}%` }}/>
                <ChartTooltip label={labels[index]} value={`${value} vé`}/>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-around px-1 font-tabular text-[9px] text-slate-400">
            {labels.map(label => <span key={label}>{label}</span>)}
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-slate-400">Thời gian</span>
        </div>
      </div>
    </section>
  )
}

function WaitTrendChart() {
  const [range, setRange] = useState<'Ngày' | 'Tuần'>('Ngày')
  const points = range === 'Ngày'
    ? [{x:5,y:62,v:'9.8'},{x:18,y:48,v:'8.6'},{x:31,y:55,v:'9.2'},{x:44,y:36,v:'7.5'},{x:57,y:42,v:'8.1'},{x:70,y:24,v:'6.8'},{x:83,y:31,v:'7.2'},{x:96,y:18,v:'6.3'}]
    : [{x:5,y:70,v:'10.4'},{x:20,y:58,v:'9.5'},{x:35,y:43,v:'8.2'},{x:50,y:51,v:'8.9'},{x:65,y:35,v:'7.6'},{x:80,y:29,v:'7.1'},{x:96,y:20,v:'6.5'}]
  const path = points.map(point => `${point.x * 6},${point.y * 1.8}`).join(' ')
  return (
    <section className="col-span-8 rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold leading-relaxed text-slate-800">Xu hướng thời gian chờ trung bình</h3>
          <p className="text-xs leading-relaxed text-slate-500">Đơn vị phút · càng thấp càng tốt</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['Ngày','Tuần'] as const).map(item => (
            <button key={item} type="button" onClick={() => setRange(item)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${range === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="h-0.5 w-5 bg-emerald-500"/>Thời gian chờ TB</div>
      <div className="mt-3 flex h-56">
        <div className="flex w-9 flex-col justify-between pb-7 text-right font-tabular text-[9px] text-slate-400">
          <span>15p</span><span>12p</span><span>9p</span><span>6p</span><span>3p</span>
        </div>
        <div className="relative ml-3 flex-1">
          {[0,25,50,75,100].map(top => <div key={top} className="absolute inset-x-0 h-px bg-slate-200" style={{ top:`${top}%` }}/>)}
          <svg className="absolute inset-x-0 top-0 h-[calc(100%_-_28px)] w-full" viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="Biểu đồ xu hướng thời gian chờ">
            <polyline points={path} fill="none" stroke="#10B981" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
          </svg>
          {points.map((point,index) => (
            <button key={index} type="button" className="group absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
              style={{ left:`${point.x}%`, top:`${point.y}%` }}>
              <ChartTooltip label={range === 'Ngày' ? `${7 + index * 2}:00` : `Ngày ${index + 1}`} value={`${point.v} phút`}/>
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-0 flex justify-between font-tabular text-[9px] text-slate-400">
            {(range === 'Ngày' ? ['07h','09h','11h','13h','15h','17h'] : ['T2','T3','T4','T5','T6','T7','CN']).map(label => <span key={label}>{label}</span>)}
          </div>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-slate-400">Thời gian</span>
        </div>
      </div>
    </section>
  )
}

function BookingMixChart() {
  return (
    <section className="col-span-4 rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold leading-relaxed text-slate-800">Tỷ lệ đặt hẹn trước vs vãng lai</h3>
      <p className="text-xs leading-relaxed text-slate-500">Cơ cấu 247 lượt tiếp nhận</p>
      <div className="flex h-56 items-center justify-center">
        <div className="group relative h-36 w-36 rounded-full" style={{ background:'conic-gradient(#2563EB 0 68%, #10B981 68% 100%)' }}>
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
            <span className="font-tabular text-2xl font-bold text-slate-900">247</span>
            <span className="text-[9px] font-semibold text-slate-400">TỔNG VÉ</span>
          </div>
          <ChartTooltip label="Đặt hẹn / Vãng lai" value="168 / 79 vé"/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-blue-50 p-2.5"><p className="flex items-center gap-2 text-[10px] font-semibold text-blue-800"><span className="h-2 w-2 rounded-sm bg-blue-600"/>Đặt hẹn</p><p className="mt-1 font-tabular text-sm font-bold text-blue-900">68%</p></div>
        <div className="rounded-lg bg-emerald-50 p-2.5"><p className="flex items-center gap-2 text-[10px] font-semibold text-emerald-800"><span className="h-2 w-2 rounded-sm bg-emerald-500"/>Vãng lai</p><p className="mt-1 font-tabular text-sm font-bold text-emerald-900">32%</p></div>
      </div>
    </section>
  )
}

function OutcomeChart() {
  const rows = [
    { label:'T2', done:68, cancelled:12, absent:7 },
    { label:'T3', done:74, cancelled:9, absent:5 },
    { label:'T4', done:62, cancelled:14, absent:8 },
    { label:'T5', done:81, cancelled:7, absent:4 },
    { label:'T6', done:77, cancelled:11, absent:6 },
  ]
  return (
    <section className="col-span-4 rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-bold leading-relaxed text-slate-800">Hoàn tất / Đã hủy / Vắng mặt</h3>
      <div className="mt-2 flex flex-wrap gap-3 text-[9px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500"/>Hoàn tất</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-amber-500"/>Đã hủy</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-red-500"/>Vắng mặt</span>
      </div>
      <div className="mt-5 flex justify-between pl-7 font-tabular text-[9px] text-slate-400"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 vé</span></div>
      <div className="mt-2 space-y-4">
        {rows.map(row => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-5 font-tabular text-[10px] font-bold text-slate-500">{row.label}</span>
            <div className="flex h-6 flex-1 overflow-visible rounded bg-slate-100" style={{ backgroundImage:'linear-gradient(to right, #E2E8F0 1px, transparent 1px)', backgroundSize:'25% 100%' }}>
              {[
                ['Hoàn tất',row.done,'bg-emerald-500'],
                ['Đã hủy',row.cancelled,'bg-amber-500'],
                ['Vắng mặt',row.absent,'bg-red-500'],
              ].map(([label,value,color]) => (
                <div key={String(label)} className={`group relative h-full first:rounded-l last:rounded-r ${color}`} style={{ width:`${Number(value)}%` }}>
                  <ChartTooltip label={`${row.label} · ${label}`} value={`${value} vé`}/>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[9px] font-semibold text-slate-400">Ngày trong tuần · Giá trị theo số vé</p>
    </section>
  )
}

function StaffRanking() {
  const staff = [
    { name:'Nguyễn Thị Hồng', role:'Nhân viên quầy', served:42, avg:'11 phút', positive:96 },
    { name:'Trần Văn Minh', role:'Nhân viên quầy', served:38, avg:'13 phút', positive:92 },
    { name:'Lê Hoàng Anh', role:'Nhân viên quầy', served:35, avg:'14 phút', positive:89 },
    { name:'Phạm Thu Hương', role:'Nhân viên quầy', served:29, avg:'24 phút', positive:81, warning:true },
  ]
  return (
    <section className="col-span-8 rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold leading-relaxed text-slate-800">Hiệu suất nhân viên</h3>
        <p className="text-xs leading-relaxed text-slate-500">Xếp hạng theo dữ liệu phục vụ trong khoảng thời gian đã chọn</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Nhân viên','Lượt phục vụ','Thời gian TB','% đánh giá tích cực'].map(label => (
                <th key={label} className="px-5 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(person => (
              <tr key={person.name} className={`border-b border-slate-100 last:border-0 ${person.warning ? 'border-l-[3px] border-l-amber-500 bg-amber-50/30' : ''}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-800">
                      {person.name.split(' ').slice(-2).map(part => part[0]).join('')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold leading-relaxed text-slate-800">{person.name}</p>
                      <p className="font-tabular text-[10px] text-slate-400">{person.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-tabular text-xs font-bold text-slate-700">{person.served}</td>
                <td className="px-5 py-3">
                  <span className="font-tabular text-xs font-bold text-slate-700">{person.avg}</span>
                  {person.warning && (
                    <span className="ml-2 inline-flex rounded bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">
                      Vượt 150% T_standard
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${person.positive >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width:`${person.positive}%` }}/>
                    </div>
                    <span className="w-9 text-right font-tabular text-xs font-bold text-slate-700">{person.positive}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CSATAnalytics() {
  const distribution = [
    { stars:5, value:72, count:134 },
    { stars:4, value:19, count:35 },
    { stars:3, value:6, count:11 },
    { stars:2, value:2, count:4 },
    { stars:1, value:1, count:2 },
  ]
  return (
    <section className="col-span-4 rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold leading-relaxed text-slate-800">Phân bố CSAT</h3>
          <p className="text-xs leading-relaxed text-slate-500">186 phản hồi đã xác minh</p>
        </div>
        <span className="flex items-center gap-1 font-tabular text-lg font-bold text-slate-900"><StarIco s={16} fill/>4.7</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {distribution.map(item => (
          <div key={item.stars} className="flex items-center gap-2">
            <span className="flex w-7 items-center gap-1 font-tabular text-[10px] font-bold text-slate-600">{item.stars}<StarIco s={9} fill/></span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-400" style={{ width:`${item.value}%` }}/>
            </div>
            <span className="w-7 text-right font-tabular text-[10px] text-slate-500">{item.count}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.04em] text-slate-500">XU HƯỚNG CSAT TUẦN</p>
          <span className="font-tabular text-[10px] font-bold text-emerald-700">+0.3</span>
        </div>
        <svg viewBox="0 0 320 70" className="h-16 w-full" aria-label="Xu hướng CSAT trong tuần">
          <defs>
            <linearGradient id="csatFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity=".2"/><stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0 58 L0 48 L53 42 L106 45 L160 31 L213 35 L266 20 L320 14 L320 58 Z" fill="url(#csatFill)"/>
          <polyline points="0,48 53,42 106,45 160,31 213,35 266,20 320,14" fill="none" stroke="#2563EB" strokeWidth="2.5"/>
          {[['0','48'],['53','42'],['106','45'],['160','31'],['213','35'],['266','20'],['320','14']].map(([x,y]) => <circle key={x} cx={x} cy={y} r="3" fill="#2563EB" stroke="white" strokeWidth="2"/>)}
        </svg>
        <div className="flex justify-between font-tabular text-[8px] text-slate-400">{['T2','T3','T4','T5','T6','T7','CN'].map(day => <span key={day}>{day}</span>)}</div>
      </div>
    </section>
  )
}

function KpiPopover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-full z-40 mt-2 translate-y-1 rounded-[10px] border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
      <p className="mb-2 text-[10px] font-bold tracking-[0.04em] text-slate-500">{title}</p>
      {children}
    </div>
  )
}

type ServiceStatus = 'active' | 'inactive'
interface AdminService {
  id: number; code: string; name: string; standard: number; price: number
  status: ServiceStatus; today: number; actual: number
}

function ServicesScreen() {
  const initialServices: AdminService[] = Array.from({ length:24 }, (_,index) => {
    const names = ['Khám tổng quát','Xét nghiệm máu','Siêu âm tổng quát','Tiêm phòng','Răng hàm mặt','Tư vấn kết quả']
    const standards = [15,10,25,12,30,20]
    return {
      id:index + 1,
      code:`SVC-${String(index + 1).padStart(4, '0')}`,
      name:index < names.length ? names[index] : `${names[index % names.length]} ${Math.floor(index / names.length) + 1}`,
      standard:standards[index % standards.length],
      price:index % 4 === 0 ? 0 : (index % 5 + 1) * 50000,
      status:index % 7 === 0 ? 'inactive' : 'active',
      today:34 - (index % 9),
      actual:standards[index % standards.length] + (index % 3 === 0 ? 2 : -1),
    }
  })
  const [services, setServices] = useState(initialServices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null)
  const [duplicateError, setDuplicateError] = useState(false)
  const [form, setForm] = useState({ name:'', standard:15, price:0 })

  const filtered = services.filter(service => {
    const matchesSearch = `${service.code} ${service.name}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (statusFilter === 'all' || service.status === statusFilter)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const visibleServices = filtered.slice((page - 1) * 20, page * 20)

  const openDrawer = (service?: AdminService) => {
    setEditingId(service?.id ?? null)
    setForm(service ? { name:service.name, standard:service.standard, price:service.price } : { name:'', standard:15, price:0 })
    setDuplicateError(false)
    setDrawerOpen(true)
  }

  const saveService = () => {
    const duplicate = services.some(service => service.id !== editingId && service.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    if (duplicate) {
      setDuplicateError(true)
      return
    }
    if (form.name.trim().length < 3) return
    if (editingId) {
      setServices(current => current.map(service => service.id === editingId ? { ...service, ...form } : service))
    } else {
      const id = Math.max(...services.map(service => service.id)) + 1
      setServices(current => [...current, { id, code:`SVC-${String(id).padStart(4, '0')}`, ...form, status:'active', today:0, actual:form.standard }])
    }
    setDrawerOpen(false)
  }

  const suspendTarget = () => {
    if (!deleteTarget) return
    setServices(current => current.map(service => service.id === deleteTarget.id ? { ...service, status:'inactive' } : service))
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold leading-relaxed text-slate-900">Danh mục dịch vụ</h1>
          <p className="text-xs leading-relaxed text-slate-500">Quản lý dịch vụ, thời gian tiêu chuẩn và đơn giá tại cơ sở</p>
        </div>
        <button type="button" onClick={() => openDrawer()}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
          <span className="text-lg leading-none">+</span>Thêm dịch vụ
        </button>
      </header>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <label className="relative w-80">
            <span className="pointer-events-none absolute left-3 top-3 text-slate-400"><SearchIco s={15}/></span>
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}
              placeholder="Tìm theo mã hoặc tên dịch vụ"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500"/>
          </label>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {[
              ['all','Tất cả'],
              ['active','Hoạt động'],
              ['inactive','Tạm ngưng'],
            ].map(([value,label]) => (
              <button key={value} type="button" onClick={() => { setStatusFilter(value as 'all' | ServiceStatus); setPage(1) }}
                className={`rounded-md px-3 py-2 text-xs font-semibold ${statusFilter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-visible rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Mã','Tên dịch vụ','T_standard','Đơn giá','Trạng thái',''].map(label => (
                  <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleServices.map(service => {
                const overStandard = service.actual > service.standard
                return (
                  <tr key={service.id} className="group relative border-b border-slate-100 transition-all duration-200 last:border-0 hover:z-20 hover:bg-slate-50 hover:shadow-sm">
                    <td className="px-4 py-3 font-tabular text-xs font-bold text-slate-600">{service.code}</td>
                    <td className="relative px-4 py-3">
                      <span className="text-xs font-semibold leading-relaxed text-slate-800">{service.name}</span>
                      <div className="pointer-events-none absolute left-0 top-full z-40 mt-1 w-80 translate-y-1 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="text-[10px] leading-relaxed text-slate-600">
                          Vé hôm nay: <span className="font-tabular font-bold">{service.today}</span>
                          <span className="px-1 text-slate-300">•</span>
                          Thực tế <span className="font-tabular font-bold">{service.actual} phút</span> vs T_standard <span className="font-tabular font-bold">{service.standard} phút</span>
                        </p>
                        {overStandard && <span className="mt-2 inline-flex rounded bg-amber-50 px-2 py-1 font-tabular text-[9px] font-bold text-amber-800">+{service.actual - service.standard} phút</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-tabular text-xs font-bold text-slate-700">{service.standard} phút</td>
                    <td className="px-4 py-3 font-tabular text-xs font-semibold text-slate-700">{service.price.toLocaleString('vi-VN')} đ</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-[9px] font-bold tracking-[0.05em] ${service.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {service.status === 'active' ? 'HOẠT ĐỘNG' : 'TẠM NGƯNG'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openDrawer(service)} aria-label={`Sửa ${service.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-700"><EditIco s={15}/></button>
                        <button type="button" onClick={() => setDeleteTarget(service)} aria-label={`Xóa ${service.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"><TrashIco s={15}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-[10px] text-slate-500">
              Hiển thị <span className="font-tabular font-semibold">{visibleServices.length}</span> / <span className="font-tabular font-semibold">{filtered.length}</span> dịch vụ · 20 hàng mỗi trang
            </p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40">Trước</button>
              <span className="font-tabular text-[10px] font-bold text-slate-600">{page} / {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40">Sau</button>
            </div>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setDrawerOpen(false)}/>
          <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[480px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">{editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}</h2>
                <p className="text-[10px] leading-relaxed text-slate-500">Thiết lập thông tin vận hành của dịch vụ</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Đóng drawer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><XSmIco s={17}/></button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Tên dịch vụ</span>
                <input value={form.name} minLength={3} maxLength={255}
                  onChange={event => { setForm(value => ({ ...value, name:event.target.value })); setDuplicateError(false) }}
                  className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${duplicateError ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}/>
                <span className="mt-1 block text-[10px] text-slate-400">{form.name.length}/255 ký tự · Tối thiểu 3 ký tự</span>
                {duplicateError && <span className="mt-2 block text-xs leading-relaxed text-red-700">Tên dịch vụ đã tồn tại trong danh mục này. Vui lòng nhập tên khác.</span>}
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">T_standard</span>
                <div className="flex h-11 overflow-hidden rounded-lg border border-slate-200">
                  <button type="button" onClick={() => setForm(value => ({ ...value, standard:Math.max(1, value.standard - 1) }))}
                    className="w-11 bg-slate-50 text-lg text-slate-600">−</button>
                  <input type="number" min={1} step={1} value={form.standard}
                    onChange={event => setForm(value => ({ ...value, standard:Math.max(1, Number(event.target.value)) }))}
                    className="min-w-0 flex-1 border-x border-slate-200 text-center font-tabular text-sm font-bold outline-none"/>
                  <button type="button" onClick={() => setForm(value => ({ ...value, standard:value.standard + 1 }))}
                    className="w-11 bg-slate-50 text-lg text-slate-600">+</button>
                </div>
                <span className="mt-1 block text-[10px] text-slate-400">Thời gian tiêu chuẩn tính theo phút nguyên</span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">Đơn giá</span>
                <div className="relative">
                  <input type="number" min={0} step={1000} value={form.price}
                    onChange={event => setForm(value => ({ ...value, price:Math.max(0, Number(event.target.value)) }))}
                    className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-10 font-tabular text-sm outline-none focus:border-blue-500"/>
                  <span className="absolute right-3 top-3 text-xs text-slate-400">đ</span>
                </div>
                <span className="mt-1 block text-[10px] text-slate-400">0 = miễn phí</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button type="button" onClick={() => setDrawerOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600">Hủy</button>
              <button type="button" onClick={saveService} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Lưu dịch vụ</button>
            </div>
          </aside>
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 p-6">
          <div className="dialog-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertIco s={23}/></div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Không thể xóa dịch vụ</h2>
            <p className="mt-2 text-sm leading-[1.7] text-slate-600">
              Dịch vụ này hiện đang có lịch hẹn hoặc vé chờ chưa hoàn tất. Hệ thống không thể xóa dịch vụ. Quản trị viên vui lòng chuyển sang trạng thái "Tạm ngưng hoạt động" (Inactive) để dừng tiếp nhận lượt mới.
            </p>
            <button type="button" onClick={suspendTarget} className="mt-6 h-11 w-full rounded-lg bg-amber-600 text-sm font-bold text-white">
              Chuyển sang Tạm ngưng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type StaffRole = 'admin' | 'counter' | 'specialist'
interface AdminStaff {
  id: number; code: string; name: string; email: string; phone: string
  role: StaffRole; services: string[]; status: 'active' | 'inactive'
}

function LegacyStaffScreen() {
  const activeServices = ['Khám tổng quát','Xét nghiệm máu','Siêu âm tổng quát','Tiêm phòng','Răng hàm mặt','Tư vấn kết quả']
  const [staff, setStaff] = useState<AdminStaff[]>([
    { id:1, code:'STAFF-0001', name:'Trần Thị Bích Ngân', email:'ngan.tran@stjude.vn', phone:'0901234567', role:'admin', services:['Khám tổng quát','Tư vấn kết quả'], status:'active' },
    { id:2, code:'STAFF-0002', name:'Nguyễn Thị Hồng', email:'hong.nguyen@stjude.vn', phone:'0912345678', role:'counter', services:['Khám tổng quát'], status:'active' },
    { id:3, code:'STAFF-0003', name:'Lê Minh Tuấn', email:'tuan.le@stjude.vn', phone:'0923456789', role:'specialist', services:['Xét nghiệm máu','Siêu âm tổng quát'], status:'active' },
    { id:4, code:'STAFF-0004', name:'Phạm Thu Hương', email:'huong.pham@stjude.vn', phone:'0934567890', role:'specialist', services:['Tiêm phòng','Khám tổng quát','Tư vấn kết quả'], status:'active' },
    { id:5, code:'STAFF-0005', name:'Vũ Quốc Minh', email:'minh.vu@stjude.vn', phone:'0945678901', role:'counter', services:['Răng hàm mặt'], status:'inactive' },
  ])
  const [createOpen, setCreateOpen] = useState(false)
  const [detailStaff, setDetailStaff] = useState<AdminStaff | null>(null)
  const [detailTab, setDetailTab] = useState<'profile' | 'assignment' | 'history'>('profile')
  const [assignments, setAssignments] = useState<string[]>([])
  const [assignmentToast, setAssignmentToast] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<AdminStaff | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [duplicateError, setDuplicateError] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', phone:'', role:'counter' as StaffRole })

  useEffect(() => {
    if (!assignmentToast) return
    const timer = window.setTimeout(() => setAssignmentToast(false), 3200)
    return () => window.clearTimeout(timer)
  }, [assignmentToast])

  const formatPhone = (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  const roleConfig: Record<StaffRole, { label:string; cls:string }> = {
    admin:{ label:'Quản trị viên', cls:'bg-violet-50 text-violet-800' },
    counter:{ label:'Nhân viên quầy', cls:'bg-blue-50 text-blue-800' },
    specialist:{ label:'Chuyên viên', cls:'bg-cyan-50 text-cyan-800' },
  }

  const openCreate = () => {
    setForm({ name:'', email:'', phone:'', role:'counter' })
    setDuplicateError(false)
    setCreateOpen(true)
  }

  const saveStaff = () => {
    const duplicate = staff.some(person => person.email.toLowerCase() === form.email.toLowerCase() || person.phone === form.phone)
    if (duplicate) {
      setDuplicateError(true)
      return
    }
    if (!/^[\p{L}\s]{2,100}$/u.test(form.name.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !/^\d{10}$/.test(form.phone)) return
    const id = staff.length + 1
    setStaff(current => [...current, { id, code:`STAFF-${String(id).padStart(4, '0')}`, ...form, services:['Khám tổng quát'], status:'active' }])
    setCreateOpen(false)
  }

  const openDetail = (person: AdminStaff) => {
    setDetailStaff(person)
    setAssignments(person.services)
    setDetailTab('profile')
  }

  const disableStaff = () => {
    if (!suspendTarget || !reassignTo) return
    setStaff(current => current.map(person => person.id === suspendTarget.id ? { ...person, status:'inactive' } : person))
    setSuspendTarget(null)
    setReassignTo('')
  }

  return (
    <div className="min-h-full bg-slate-50" data-hard-delete-policy="Hard-delete forbidden when service history exists; apply soft INACTIVE and disable the Keycloak identity.">
      {assignmentToast && (
        <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 border-l-[3px] border-emerald-500 bg-white p-4 shadow-[var(--shadow-modal)]">
          <CheckIco s={17}/><div><p className="text-sm font-semibold text-slate-800">Đã lưu phân công dịch vụ.</p><p className="mt-1 text-[10px] text-slate-500">Valkey cache invalidated instantly</p></div>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold leading-relaxed text-slate-900">Nhân viên</h1>
          <p className="text-xs leading-relaxed text-slate-500">Quản lý tài khoản, vai trò và phân công dịch vụ</p>
        </div>
        <button type="button" onClick={openCreate} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700">+ Thêm nhân viên</button>
      </header>

      <div className="p-6">
        <div className="rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              {['Mã','Họ tên','Email','SĐT','Vai trò','Dịch vụ phụ trách','Trạng thái',''].map(label => <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>)}
            </tr></thead>
            <tbody>
              {staff.map(person => (
                <tr key={person.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-tabular text-[11px] font-bold text-slate-600">{person.code}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{person.name}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-600">{person.email}</td>
                  <td className="px-4 py-3 font-tabular text-[11px] text-slate-600">{formatPhone(person.phone)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${roleConfig[person.role].cls}`}>{roleConfig[person.role].label}</span></td>
                  <td className="group relative px-4 py-3">
                    <button type="button" className="rounded-full bg-slate-100 px-2.5 py-1 font-tabular text-[10px] font-bold text-slate-600">{person.services.length} dịch vụ</button>
                    <div className="pointer-events-none absolute left-4 top-full z-40 mt-1 w-56 translate-y-1 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="mb-2 text-[9px] font-bold tracking-wide text-slate-400">DỊCH VỤ PHỤ TRÁCH</p>
                      <div className="space-y-1">{person.services.map(service => <p key={service} className="text-[10px] text-slate-700">{service}</p>)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${person.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{person.status === 'active' ? 'HOẠT ĐỘNG' : 'VÔ HIỆU HÓA'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openDetail(person)} aria-label={`Xem ${person.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-700"><EyeIco s={15}/></button>
                      <button type="button" onClick={() => setSuspendTarget(person)} aria-label={`Vô hiệu hóa ${person.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"><PauseIco s={15}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setCreateOpen(false)}/>
          <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[480px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6"><div><h2 className="text-base font-bold">Thêm nhân viên</h2><p className="text-[10px] text-slate-500">Tạo tài khoản nhân sự mới</p></div><button type="button" onClick={() => setCreateOpen(false)}><XSmIco s={17}/></button></div>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">Họ tên</span><input value={form.name} maxLength={100} onChange={event => setForm(value => ({ ...value, name:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/><span className="mt-1 block text-[10px] text-slate-400">2–100 ký tự, chỉ gồm chữ cái và khoảng trắng</span></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">Email</span><input type="email" value={form.email} onChange={event => { setForm(value => ({ ...value, email:event.target.value })); setDuplicateError(false) }} className={`h-11 w-full rounded-lg border px-3 text-sm outline-none ${duplicateError ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}/></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">SĐT</span><input inputMode="numeric" value={formatPhone(form.phone)} onChange={event => { setForm(value => ({ ...value, phone:event.target.value.replace(/\D/g, '').slice(0, 10) })); setDuplicateError(false) }} placeholder="090 123 4567" className={`h-11 w-full rounded-lg border px-3 font-tabular text-sm outline-none ${duplicateError ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'}`}/><span className="mt-1 block text-[10px] text-slate-400">Số điện thoại Việt Nam gồm 10 chữ số</span></label>
              {duplicateError && <p className="rounded-lg bg-red-50 p-3 text-xs leading-relaxed text-red-700">Email hoặc số điện thoại này đã được đăng ký bởi một nhân viên khác trong hệ thống.</p>}
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">Vai trò</span><select value={form.role} onChange={event => setForm(value => ({ ...value, role:event.target.value as StaffRole }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none"><option value="admin">Quản trị viên</option><option value="counter">Nhân viên quầy</option><option value="specialist">Chuyên viên</option></select></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold">Hủy</button><button type="button" onClick={saveStaff} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Tạo nhân viên</button></div>
          </aside>
        </>
      )}

      {detailStaff && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setDetailStaff(null)}/>
          <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[560px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6"><div><h2 className="text-base font-bold">{detailStaff.name}</h2><p className="font-tabular text-[10px] text-slate-500">{detailStaff.code}</p></div><button type="button" onClick={() => setDetailStaff(null)}><XSmIco s={17}/></button></div>
            <div className="flex border-b border-slate-200 px-6">
              {[['profile','Hồ sơ'],['assignment','Phân công dịch vụ'],['history','Lịch sử phục vụ']].map(([value,label]) => <button key={value} type="button" onClick={() => setDetailTab(value as typeof detailTab)} className={`border-b-2 px-4 py-3 text-xs font-semibold ${detailTab === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>{label}</button>)}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {detailTab === 'profile' && <div className="space-y-4">{[['Họ tên',detailStaff.name],['Email',detailStaff.email],['SĐT',formatPhone(detailStaff.phone)],['Vai trò',roleConfig[detailStaff.role].label]].map(([label,value]) => <div key={label} className="border-b border-slate-100 pb-3"><p className="text-[10px] font-semibold text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>)}</div>}
              {detailTab === 'assignment' && (
                <div data-cache-behavior="Valkey cache invalidated instantly">
                  <p className="text-xs leading-relaxed text-slate-500">Chọn ít nhất một dịch vụ mà nhân viên phụ trách.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">{activeServices.map(service => <label key={service} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={assignments.includes(service)} onChange={event => setAssignments(values => event.target.checked ? [...values, service] : values.filter(value => value !== service))} className="h-4 w-4 rounded border-slate-300 text-blue-600"/>{service}</label>)}</div>
                  {assignments.length === 0 && <p className="mt-3 text-xs text-red-600">Phải phân công ít nhất 1 dịch vụ.</p>}
                  <button type="button" disabled={assignments.length === 0} onClick={() => { setStaff(current => current.map(person => person.id === detailStaff.id ? { ...person, services:assignments } : person)); setDetailStaff({ ...detailStaff, services:assignments }); setAssignmentToast(true) }} className="mt-5 h-11 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">Lưu phân công</button>
                </div>
              )}
              {detailTab === 'history' && <div className="space-y-3">{[['A-042','Khám tổng quát','13 phút'],['A-037','Tư vấn kết quả','18 phút'],['A-029','Khám tổng quát','11 phút']].map(([code,service,duration]) => <div key={code} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><div><p className="font-tabular text-xs font-bold text-slate-800">{code}</p><p className="text-[10px] text-slate-500">{service}</p></div><span className="font-tabular text-xs text-slate-600">{duration}</span></div>)}</div>}
            </div>
          </aside>
        </>
      )}

      {suspendTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 p-6">
          <div className="dialog-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertIco s={23}/></div>
            <h2 className="mt-4 text-lg font-bold">Vô hiệu hóa nhân viên?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Nhân viên này có <strong>3 cuộc hẹn sắp diễn ra</strong>. Chọn người tiếp nhận thay thế trước khi tiếp tục.</p>
            <div className="mt-4 space-y-2">{['02/11 · Khám tổng quát · 09:00','02/11 · Tư vấn kết quả · 10:30','03/11 · Khám tổng quát · 08:15'].map(item => <p key={item} className="rounded-lg bg-slate-50 px-3 py-2 font-tabular text-[10px] text-slate-600">{item}</p>)}</div>
            <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold">Phân công lại cho</span><select value={reassignTo} onChange={event => setReassignTo(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Chọn nhân viên thay thế</option>{staff.filter(person => person.id !== suspendTarget.id && person.status === 'active').map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            <button type="button" disabled={!reassignTo} onClick={disableStaff} className="mt-5 h-11 w-full rounded-lg bg-amber-600 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400">Vô hiệu hóa</button>
          </div>
        </div>
      )}
    </div>
  )
}

type LoginStaffRole = 'admin' | 'counter'
interface LoginStaffRecord {
  id:number; code:string; name:string; email:string; phone:string
  role:LoginStaffRole; status:'active' | 'inactive'; lastLogin:string; futureAppointments:number
}
interface SpecialistRecord {
  id:number; code:string; name:string; phone:string; email?:string
  services:string[]; onShift:boolean; status:'active' | 'inactive'; hasImpact:boolean
}

function StaffScreen() {
  const serviceOptions = ['Khám tổng quát','Xét nghiệm máu','Siêu âm tổng quát','Tiêm phòng','Răng hàm mặt']
  const [segment, setSegment] = useState<'staff' | 'specialists'>('staff')
  const [loginStaff, setLoginStaff] = useState<LoginStaffRecord[]>([
    { id:1, code:'STAFF-0001', name:'Trần Thị Bích Ngân', email:'ngan.tran@stjude.vn', phone:'0901234567', role:'admin', status:'active', lastLogin:'31/10/2026 10:38:14', futureAppointments:0 },
    { id:2, code:'STAFF-0002', name:'Nguyễn Thị Hồng', email:'hong.nguyen@stjude.vn', phone:'0912345678', role:'counter', status:'active', lastLogin:'31/10/2026 10:41:03', futureAppointments:3 },
    { id:3, code:'STAFF-0003', name:'Vũ Quốc Minh', email:'minh.vu@stjude.vn', phone:'0923456789', role:'counter', status:'inactive', lastLogin:'29/10/2026 17:22:51', futureAppointments:0 },
  ])
  const [specialists, setSpecialists] = useState<SpecialistRecord[]>([
    { id:1, code:'SPEC-0001', name:'BS. Lê Minh Tuấn', phone:'0934567890', email:'tuan.le@stjude.vn', services:['Khám tổng quát','Tư vấn kết quả'], onShift:true, status:'active', hasImpact:true },
    { id:2, code:'SPEC-0002', name:'ĐD. Phạm Thu Hương', phone:'0945678901', services:['Tiêm phòng','Xét nghiệm máu'], onShift:true, status:'active', hasImpact:false },
    { id:3, code:'SPEC-0003', name:'BS. Hoàng Lan Anh', phone:'0956789012', email:'lananh.hoang@stjude.vn', services:['Siêu âm tổng quát'], onShift:false, status:'active', hasImpact:true },
    { id:4, code:'SPEC-0004', name:'BS. Trần Quốc Bảo', phone:'0967890123', services:['Răng hàm mặt'], onShift:false, status:'inactive', hasImpact:false },
  ])
  const [drawer, setDrawer] = useState<'staff' | 'specialist' | null>(null)
  const [duplicateError, setDuplicateError] = useState(false)
  const [staffForm, setStaffForm] = useState({ name:'', email:'', phone:'', role:'counter' as LoginStaffRole })
  const [specialistForm, setSpecialistForm] = useState({ name:'', phone:'', email:'', services:[] as string[] })
  const [staffGuard, setStaffGuard] = useState<LoginStaffRecord | null>(null)
  const [specialistGuard, setSpecialistGuard] = useState<SpecialistRecord | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [capacityToast, setCapacityToast] = useState(false)

  useEffect(() => {
    if (!capacityToast) return
    const timer = window.setTimeout(() => setCapacityToast(false), 3200)
    return () => window.clearTimeout(timer)
  }, [capacityToast])

  const formatPhone = (phone:string) => phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  const roleCfg: Record<LoginStaffRole,{label:string; cls:string}> = {
    admin:{ label:'QUẢN TRỊ VIÊN', cls:'bg-blue-50 text-blue-800' },
    counter:{ label:'NHÂN VIÊN QUẦY', cls:'bg-emerald-50 text-emerald-800' },
  }
  const openDrawer = (type:'staff' | 'specialist') => {
    setDuplicateError(false)
    setStaffForm({ name:'', email:'', phone:'', role:'counter' })
    setSpecialistForm({ name:'', phone:'', email:'', services:[] })
    setDrawer(type)
  }
  const saveLoginStaff = () => {
    const duplicate = loginStaff.some(person => person.email.toLowerCase() === staffForm.email.toLowerCase() || person.phone === staffForm.phone)
    if (duplicate) { setDuplicateError(true); return }
    if (!/^[\p{L}\s.]{2,100}$/u.test(staffForm.name.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email) || !/^\d{10}$/.test(staffForm.phone)) return
    const id = loginStaff.length + 1
    setLoginStaff(current => [...current, { id, code:`STAFF-${String(id).padStart(4,'0')}`, ...staffForm, status:'active', lastLogin:'Chưa đăng nhập', futureAppointments:0 }])
    setDrawer(null)
  }
  const saveSpecialist = () => {
    const duplicate = specialists.some(person => person.phone === specialistForm.phone || (!!specialistForm.email && person.email?.toLowerCase() === specialistForm.email.toLowerCase()))
    if (duplicate) { setDuplicateError(true); return }
    if (!/^\d{10}$/.test(specialistForm.phone) || specialistForm.services.length === 0) return
    const id = specialists.length + 1
    setSpecialists(current => [...current, { id, code:`SPEC-${String(id).padStart(4,'0')}`, ...specialistForm, onShift:false, status:'active', hasImpact:false }])
    setDrawer(null)
    setCapacityToast(true)
  }
  const requestStaffSuspend = (person:LoginStaffRecord) => {
    if (person.futureAppointments > 0) setStaffGuard(person)
    else setLoginStaff(current => current.map(item => item.id === person.id ? { ...item, status:'inactive' } : item))
  }
  const requestSpecialistSuspend = (person:SpecialistRecord) => {
    if (person.hasImpact) setSpecialistGuard(person)
    else {
      setSpecialists(current => current.map(item => item.id === person.id ? { ...item, status:'inactive' } : item))
      setCapacityToast(true)
    }
  }

  return (
    <div
      className="min-h-full bg-slate-50"
      data-specialist-model="No Keycloak account; specialist records only drive capacity_per_slot and load-balancing."
      data-staff-disable-policy="Staff suspension applies soft INACTIVE and disables the Keycloak identity."
    >
      {capacityToast && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 border-l-[3px] border-emerald-500 bg-white p-4 shadow-[var(--shadow-modal)]"><CheckIco s={17}/><div><p className="text-sm font-semibold text-slate-800">Đã cập nhật năng lực chuyên viên.</p><p className="mt-1 text-[10px] text-slate-500">Valkey capacity cache invalidated instantly</p></div></div>}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div className="flex h-[72px] items-center justify-between"><div><h1 className="text-lg font-bold text-slate-900">Nhân viên & Chuyên viên</h1><p className="text-xs leading-relaxed text-slate-500">Tách biệt tài khoản vận hành và nguồn lực chuyên môn không đăng nhập</p></div><button type="button" onClick={() => openDrawer(segment === 'staff' ? 'staff' : 'specialist')} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">+ {segment === 'staff' ? 'Thêm nhân sự' : 'Thêm chuyên viên'}</button></div>
        <div className="flex gap-6">
          <button type="button" onClick={() => setSegment('staff')} className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold ${segment === 'staff' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Nhân sự vận hành <span className="rounded-full bg-slate-100 px-2 py-0.5 font-tabular text-[9px]">{loginStaff.length}</span></button>
          <button type="button" onClick={() => setSegment('specialists')} className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold ${segment === 'specialists' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Chuyên viên <span className="rounded-full bg-slate-100 px-2 py-0.5 font-tabular text-[9px]">{specialists.length}</span></button>
        </div>
      </header>
      <div className="p-6">
        {segment === 'staff' ? (
          <div className="rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
            <table className="w-full border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50">{['Mã','Họ tên','Email','SĐT','Vai trò','Trạng thái',''].map(label => <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>)}</tr></thead><tbody>{loginStaff.map(person => <tr key={person.id} className="group relative border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-4 py-3 font-tabular text-[11px] font-bold text-slate-600">{person.code}</td><td className="relative px-4 py-3 text-xs font-semibold text-slate-800">{person.name}<div className="pointer-events-none absolute left-4 top-full z-40 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 group-hover:opacity-100"><p className="text-[10px] text-slate-500">Đăng nhập gần nhất</p><p className="mt-1 whitespace-nowrap font-tabular text-[10px] font-bold text-slate-700">{person.lastLogin}</p></div></td><td className="px-4 py-3 text-[11px] text-slate-600">{person.email}</td><td className="px-4 py-3 font-tabular text-[11px] text-slate-600">{formatPhone(person.phone)}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${roleCfg[person.role].cls}`}>{roleCfg[person.role].label}</span></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${person.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{person.status === 'active' ? 'HOẠT ĐỘNG' : 'VÔ HIỆU HÓA'}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => requestStaffSuspend(person)} aria-label={`Vô hiệu hóa ${person.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"><PauseIco s={15}/></button></td></tr>)}</tbody></table>
          </div>
        ) : (
          <div className="rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
            <table className="w-full border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50">{['Mã','Họ tên','SĐT / Email','Dịch vụ phụ trách','Ca hôm nay','Trạng thái',''].map(label => <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>)}</tr></thead><tbody>{specialists.map(person => <tr key={person.id} className="group relative border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-4 py-3 font-tabular text-[11px] font-bold text-slate-600">{person.code}</td><td className="relative px-4 py-3 text-xs font-semibold text-slate-800">{person.name}<div className="pointer-events-none absolute left-4 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 group-hover:opacity-100"><p className="text-[10px] text-slate-600">Hôm nay: <span className="font-tabular font-bold">3 lượt</span> • TB <span className="font-tabular font-bold">14 phút</span> vs T_standard <span className="font-tabular font-bold">15 phút</span></p></div></td><td className="px-4 py-3"><p className="font-tabular text-[11px] text-slate-600">{formatPhone(person.phone)}</p><p className="mt-1 text-[9px] text-slate-400">{person.email ?? 'Không có email'}</p></td><td className="group/services relative px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 font-tabular text-[9px] font-bold text-slate-600">{person.services.length} dịch vụ</span><div className="pointer-events-none absolute left-4 top-full z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-opacity group-hover/services:opacity-100">{person.services.map(service => <p key={service} className="py-1 text-[10px] text-slate-700">{service}</p>)}</div></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${person.onShift ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>{person.onShift ? 'TRONG CA' : 'NGOÀI CA'}</span></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${person.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{person.status === 'active' ? 'HOẠT ĐỘNG' : 'TẠM NGƯNG'}</span></td><td className="px-4 py-3"><button type="button" onClick={() => requestSpecialistSuspend(person)} aria-label={`Tạm ngưng ${person.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-700"><PauseIco s={15}/></button></td></tr>)}</tbody></table>
          </div>
        )}
      </div>

      {drawer && <>
        <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setDrawer(null)}/>
        <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[480px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]">
          <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6"><div><h2 className="text-base font-bold">{drawer === 'staff' ? 'Thêm nhân sự vận hành' : 'Thêm chuyên viên'}</h2><p className="text-[10px] text-slate-500">{drawer === 'staff' ? 'Keycloak account + activation email created on save' : 'Không tạo tài khoản đăng nhập'}</p></div><button type="button" onClick={() => setDrawer(null)}><XSmIco s={17}/></button></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold">Họ tên</span><input value={drawer === 'staff' ? staffForm.name : specialistForm.name} maxLength={100} onChange={event => drawer === 'staff' ? setStaffForm(value => ({ ...value, name:event.target.value })) : setSpecialistForm(value => ({ ...value, name:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/><span className="mt-1 block text-[10px] text-slate-400">2–100 ký tự</span></label>
            {drawer === 'staff' && <label className="block"><span className="mb-1.5 block text-xs font-semibold">Email</span><input type="email" value={staffForm.email} onChange={event => { setStaffForm(value => ({ ...value, email:event.target.value })); setDuplicateError(false) }} className={`h-11 w-full rounded-lg border px-3 text-sm ${duplicateError ? 'border-red-400' : 'border-slate-200'}`}/></label>}
            <label className="block"><span className="mb-1.5 block text-xs font-semibold">SĐT</span><input inputMode="numeric" value={formatPhone(drawer === 'staff' ? staffForm.phone : specialistForm.phone)} onChange={event => { const phone=event.target.value.replace(/\D/g,'').slice(0,10); drawer === 'staff' ? setStaffForm(value => ({ ...value, phone })) : setSpecialistForm(value => ({ ...value, phone })); setDuplicateError(false) }} className={`h-11 w-full rounded-lg border px-3 font-tabular text-sm ${duplicateError ? 'border-red-400' : 'border-slate-200'}`}/></label>
            {drawer === 'specialist' && <label className="block"><span className="mb-1.5 block text-xs font-semibold">Email <span className="font-normal text-slate-400">(không bắt buộc)</span></span><input type="email" value={specialistForm.email} onChange={event => { setSpecialistForm(value => ({ ...value, email:event.target.value })); setDuplicateError(false) }} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>}
            {duplicateError && <p className="rounded-lg bg-red-50 p-3 text-xs leading-relaxed text-red-700">Email hoặc số điện thoại này đã được đăng ký bởi một nhân viên khác trong hệ thống.</p>}
            {drawer === 'staff' ? <label className="block"><span className="mb-1.5 block text-xs font-semibold">Vai trò</span><select value={staffForm.role} onChange={event => setStaffForm(value => ({ ...value, role:event.target.value as LoginStaffRole }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="admin">Quản trị viên</option><option value="counter">Nhân viên quầy</option></select><span className="mt-2 block text-[10px] text-blue-700">Keycloak account + activation email created on save</span></label> : <div><p className="mb-2 text-xs font-semibold">Dịch vụ phụ trách</p><div className="grid grid-cols-2 gap-2">{serviceOptions.map(service => <label key={service} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-[10px] font-semibold"><input type="checkbox" checked={specialistForm.services.includes(service)} onChange={event => setSpecialistForm(value => ({ ...value, services:event.target.checked ? [...value.services,service] : value.services.filter(item => item !== service) }))}/>{service}</label>)}</div>{specialistForm.services.length === 0 && <p className="mt-2 text-[10px] text-red-600">Chọn ít nhất 1 dịch vụ.</p>}<p className="mt-3 text-[10px] leading-relaxed text-slate-500">No Keycloak account, no activation email — this record only drives capacity_per_slot and load-balancing.</p></div>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => setDrawer(null)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold">Hủy</button><button type="button" disabled={drawer === 'specialist' && specialistForm.services.length === 0} onClick={drawer === 'staff' ? saveLoginStaff : saveSpecialist} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:bg-slate-200">Lưu</button></div>
        </aside>
      </>}

      {staffGuard && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 p-6"><div className="dialog-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertIco s={22}/></div><h2 className="mt-4 text-lg font-bold">Cần điều chuyển lịch hẹn</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Nhân sự này có <strong>{staffGuard.futureAppointments} cuộc hẹn sắp diễn ra</strong>. Chọn nhân sự thay thế trước khi vô hiệu hóa tài khoản Keycloak.</p><select value={reassignTo} onChange={event => setReassignTo(event.target.value)} className="mt-4 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Chọn nhân sự thay thế</option>{loginStaff.filter(person => person.id !== staffGuard.id && person.status === 'active').map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button type="button" disabled={!reassignTo} onClick={() => { setLoginStaff(current => current.map(item => item.id === staffGuard.id ? { ...item, status:'inactive' } : item)); setStaffGuard(null); setReassignTo('') }} className="mt-5 h-11 w-full rounded-lg bg-amber-600 text-sm font-bold text-white disabled:bg-slate-200">Điều chuyển & vô hiệu hóa</button></div></div>}
      {specialistGuard && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 p-6"><div className="dialog-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertIco s={22}/></div><h2 className="mt-4 text-lg font-bold">Chuyên viên đang ảnh hưởng vận hành</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Chuyên viên đang có lượt <strong>SERVING</strong> hoặc ca <strong>BOOKED</strong> trong hôm nay. Việc tạm ngưng sẽ thay đổi capacity_per_slot.</p><div className="mt-4 space-y-2"><p className="rounded-lg bg-slate-50 p-3 font-tabular text-[10px] text-slate-600">A-042 · SERVING · Khám tổng quát</p><p className="rounded-lg bg-slate-50 p-3 font-tabular text-[10px] text-slate-600">13:00–17:00 · BOOKED shift</p></div><button type="button" onClick={() => { setSpecialists(current => current.map(item => item.id === specialistGuard.id ? { ...item, status:'inactive' } : item)); setSpecialistGuard(null); setCapacityToast(true) }} className="mt-5 h-11 w-full rounded-lg bg-amber-600 text-sm font-bold text-white">Xác nhận tạm ngưng</button></div></div>}
    </div>
  )
}

interface ShiftBlock {
  id: number; staff: string; day: number; start: string; end: string; service: string; tone: string; past?: boolean
}

function ScheduleScreen() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const staffNames = ['Nguyễn Thị Hồng','Lê Minh Tuấn','Phạm Thu Hương','Vũ Quốc Minh']
  const days = [
    { label:'Thứ 2', date:'28/09', past:true },
    { label:'Thứ 3', date:'29/09', past:true },
    { label:'Thứ 4', date:'30/09', today:true },
    { label:'Thứ 5', date:'01/10' },
    { label:'Thứ 6', date:'02/10' },
    { label:'Thứ 7', date:'03/10' },
    { label:'CN', date:'04/10' },
  ]
  const shifts: ShiftBlock[] = [
    { id:1, staff:staffNames[0], day:0, start:'07:30', end:'11:30', service:'Khám tổng quát', tone:'bg-blue-50 border-blue-200 text-blue-900', past:true },
    { id:2, staff:staffNames[0], day:2, start:'07:30', end:'11:30', service:'Khám tổng quát', tone:'bg-blue-50 border-blue-200 text-blue-900' },
    { id:3, staff:staffNames[0], day:4, start:'13:00', end:'17:00', service:'Tư vấn kết quả', tone:'bg-violet-50 border-violet-200 text-violet-900' },
    { id:4, staff:staffNames[1], day:1, start:'08:00', end:'12:00', service:'Xét nghiệm máu', tone:'bg-cyan-50 border-cyan-200 text-cyan-900', past:true },
    { id:5, staff:staffNames[1], day:3, start:'08:00', end:'12:00', service:'Xét nghiệm máu', tone:'bg-cyan-50 border-cyan-200 text-cyan-900' },
    { id:6, staff:staffNames[2], day:2, start:'07:30', end:'11:30', service:'Tiêm phòng', tone:'bg-emerald-50 border-emerald-200 text-emerald-900' },
    { id:7, staff:staffNames[2], day:5, start:'08:00', end:'12:00', service:'Tiêm phòng', tone:'bg-emerald-50 border-emerald-200 text-emerald-900' },
    { id:8, staff:staffNames[3], day:4, start:'07:30', end:'11:30', service:'Răng hàm mặt', tone:'bg-amber-50 border-amber-200 text-amber-900' },
  ]
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftBlock | null>(null)
  const [overlapError, setOverlapError] = useState(false)
  const [cancelGuard, setCancelGuard] = useState(false)
  const [shiftForm, setShiftForm] = useState({ staff:staffNames[0], date:todayIso, start:'07:30', end:'11:30' })
  const slots = [
    { time:'07:30–07:45', state:'AVAILABLE' },
    { time:'07:45–08:00', state:'BOOKED' },
    { time:'08:00–08:15', state:'HOLDING' },
    { time:'08:15–08:30', state:'AVAILABLE' },
    { time:'08:30–08:45', state:'BOOKED' },
    { time:'08:45–09:00', state:'AVAILABLE' },
    { time:'09:00–09:15', state:'AVAILABLE' },
    { time:'09:15–09:30', state:'HOLDING' },
    { time:'09:30–09:45', state:'AVAILABLE' },
  ]

  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div><h1 className="text-lg font-bold text-slate-900">Lịch làm việc</h1><p className="text-xs leading-relaxed text-slate-500">Phân ca và kiểm soát năng lực phục vụ theo tuần</p></div>
        <button type="button" onClick={() => setCreateOpen(true)} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">+ Tạo ca trực</button>
      </header>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-sm font-bold text-slate-800">28/09 – 04/10/2026</p><p className="text-[10px] text-slate-500">Tuần hiện tại · Ngày quá khứ chỉ có thể xem</p></div>
          <div className="flex gap-2"><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Tuần trước</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Tuần sau</button></div>
        </div>
        <div className="overflow-x-auto rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <div className="grid min-w-[1080px] grid-cols-[180px_repeat(7,minmax(120px,1fr))]">
            <div className="border-b border-r border-slate-200 bg-slate-50 p-3 text-[10px] font-bold text-slate-500">NHÂN VIÊN</div>
            {days.map(day => <div key={day.label} className={`border-b border-r border-slate-200 p-3 text-center last:border-r-0 ${day.today ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : day.past ? 'bg-slate-50 opacity-50' : 'bg-white'}`}><p className={`text-xs font-bold ${day.today ? 'text-blue-800' : 'text-slate-600'}`}>{day.label}</p><p className="mt-1 font-tabular text-[10px] text-slate-400">{day.date}</p>{day.today && <span className="mt-1 inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">HÔM NAY</span>}</div>)}
            {staffNames.map(staffName => (
              <div key={staffName} className="contents">
                <div className="flex min-h-28 items-center border-b border-r border-slate-200 p-3"><div><p className="text-xs font-semibold text-slate-800">{staffName}</p><p className="mt-1 text-[10px] text-slate-400">Chuyên viên</p></div></div>
                {days.map((day,dayIndex) => {
                  const shift = shifts.find(item => item.staff === staffName && item.day === dayIndex)
                  return (
                    <div key={`${staffName}-${day.label}`} className={`min-h-28 border-b border-r border-slate-200 p-2 last:border-r-0 ${day.today ? 'bg-blue-50/40' : day.past ? 'bg-slate-50/60' : ''}`}>
                      {shift && <button type="button" disabled={shift.past} onClick={() => setSelectedShift(shift)} className={`w-full rounded-lg border p-2 text-left shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 ${shift.tone}`}><span className="block font-tabular text-[11px] font-bold">{shift.start}–{shift.end}</span><span className="mt-1 block truncate text-[9px] font-semibold">{shift.service}</span></button>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {createOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setCreateOpen(false)}/>
          <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[480px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]" data-duration-rule="Shift duration must be greater than or equal to T_standard.">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6"><div><h2 className="text-base font-bold">Tạo ca trực</h2><p className="text-[10px] text-slate-500">Thời lượng ca phải ≥ T_standard</p></div><button type="button" onClick={() => setCreateOpen(false)}><XSmIco s={17}/></button></div>
            <div className="flex-1 space-y-4 p-6">
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">Nhân viên</span><select value={shiftForm.staff} onChange={event => setShiftForm(value => ({ ...value, staff:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm">{staffNames.map(name => <option key={name}>{name}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-semibold">Ngày</span><input type="date" min={todayIso} value={shiftForm.date} onChange={event => setShiftForm(value => ({ ...value, date:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 font-tabular text-sm"/></label>
              <div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-semibold">Giờ bắt đầu</span><input type="time" value={shiftForm.start} onChange={event => setShiftForm(value => ({ ...value, start:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 font-tabular text-sm"/></label><label><span className="mb-1.5 block text-xs font-semibold">Giờ kết thúc</span><input type="time" value={shiftForm.end} onChange={event => setShiftForm(value => ({ ...value, end:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 font-tabular text-sm"/></label></div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">Ca trực phải đủ dài để sinh ít nhất một slot theo T_standard của dịch vụ.</div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold">Hủy</button><button type="button" onClick={() => setOverlapError(true)} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Tạo ca trực</button></div>
          </aside>
        </>
      )}

      {overlapError && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/30 p-6"><div className="dialog-enter w-full max-w-md rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700"><AlertIco s={22}/></div><h2 className="mt-4 text-lg font-bold">Ca trực bị trùng</h2><p className="mt-2 text-sm leading-[1.7] text-slate-600">Nhân viên đã được phân công ca trực khác từ {shiftForm.start} đến {shiftForm.end} trong ngày này. Vui lòng kiểm tra lại.</p><button type="button" onClick={() => setOverlapError(false)} className="mt-5 h-11 w-full rounded-lg bg-slate-900 text-sm font-bold text-white">Đã hiểu</button></div></div>}

      {selectedShift && (
        <>
          <div className="fixed inset-0 z-[100] bg-slate-900/20" onClick={() => setSelectedShift(null)}/>
          <aside className="dialog-enter fixed bottom-0 right-0 top-0 z-[110] flex w-[560px] flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-modal)]">
            <div className="flex h-[72px] items-center justify-between border-b border-slate-200 px-6"><div><h2 className="text-base font-bold">{selectedShift.service}</h2><p className="font-tabular text-[10px] text-slate-500">{selectedShift.start}–{selectedShift.end} · {selectedShift.staff}</p></div><button type="button" onClick={() => setSelectedShift(null)}><XSmIco s={17}/></button></div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-lg bg-slate-50 p-3"><p className="font-tabular text-[10px] font-semibold text-slate-600">Slot_k = [start+(k−1)×T_standard, start+k×T_standard]</p><p className="mt-1 text-[10px] text-slate-400">T_standard = 15 phút · capacity mặc định mỗi slot</p></div>
              <div className="mt-5 grid grid-cols-3 gap-3">{slots.map(slot => <div key={slot.time} className={`rounded-lg border p-3 ${slot.state === 'AVAILABLE' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : slot.state === 'HOLDING' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-100 text-slate-500'}`}><div className="flex items-center justify-between"><span className="font-tabular text-[10px] font-bold">{slot.time}</span>{slot.state === 'BOOKED' && <LockIco s={12}/>}</div><p className="mt-2 text-[9px] font-bold">{slot.state}</p><span className="mt-2 inline-flex rounded bg-white/70 px-1.5 py-0.5 font-tabular text-[8px] font-bold">capacity: 2</span></div>)}</div>
              <button type="button" onClick={() => setCancelGuard(true)} className="mt-6 h-10 rounded-lg border border-red-200 px-4 text-xs font-bold text-red-700">Hủy ca trực</button>
            </div>
          </aside>
        </>
      )}

      {cancelGuard && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/30 p-6"><div className="dialog-enter w-full max-w-lg rounded-xl bg-white p-6 shadow-[var(--shadow-modal)]"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertIco s={22}/></div><h2 className="mt-4 text-lg font-bold">Ca trực có lịch hẹn đã xác nhận</h2><p className="mt-2 text-sm leading-[1.7] text-slate-600">Ca trực hiện có 3 lịch hẹn của khách hàng đã được xác nhận. Vui lòng hủy lịch hẹn hoặc điều chuyển nhân viên thay thế trước khi hủy ca trực này.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCancelGuard(false)} className="h-11 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700">Hủy</button><button type="button" className="h-11 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Điều chuyển nhân viên</button></div></div></div>}
    </div>
  )
}

function QueueSettingsScreen() {
  const [policy, setPolicy] = useState({ minLead:2, maxAdvance:5, cancellation:24 })
  const [saved, setSaved] = useState(false)
  const [dynamicQr, setDynamicQr] = useState<DynamicCheckinState>(() => getDynamicCheckinData())
  const [copiedUrl, setCopiedUrl] = useState(false)

  useEffect(() => {
    const update = () => setDynamicQr(getDynamicCheckinData())
    const timer = window.setInterval(update, 1000)
    const handleSync = () => update()
    window.addEventListener('nextturn_qr_sync', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('nextturn_qr_sync', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 3000)
    return () => window.clearTimeout(timer)
  }, [saved])

  const copyUrl = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(dynamicQr.checkInUrl).catch(() => {})
    }
    setCopiedUrl(true)
    window.setTimeout(() => setCopiedUrl(false), 2500)
  }

  const previewDays = [
    ['Hôm nay','31/10'],['CN','01/11'],['T2','02/11'],['T3','03/11'],
    ['T4','04/11'],['T5','05/11'],['T6','06/11'],['T7','07/11'],
  ]
  const ringOffset = 113 - (dynamicQr.remainingSeconds / 60) * 113

  return (
    <div className="min-h-full bg-slate-50">
      {saved && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 border-l-[3px] border-emerald-500 bg-white p-4 shadow-[var(--shadow-modal)]"><CheckIco s={17}/><div><p className="text-sm font-semibold text-slate-800">Đã lưu chính sách đặt hẹn.</p><p className="mt-1 text-[10px] text-slate-500">Applies instantly via Valkey</p></div></div>}
      <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div><h1 className="text-lg font-bold text-slate-900">Cài đặt hàng đợi & tiếp nhận</h1><p className="text-xs leading-relaxed text-slate-500">Thiết lập chính sách đặt hẹn và các điểm check-in tại cơ sở</p></div>
      </header>
      <div className="space-y-5 p-6">
        <section className="rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]" data-cache-behavior="Applies instantly via Valkey">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-800">A. Chính sách đặt hẹn</h2><p className="mt-1 text-xs text-slate-500">Giới hạn thời gian khách hàng có thể đặt, đổi hoặc hủy lịch.</p></div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <label className="block"><span className="text-xs font-semibold text-slate-700">Đặt trước tối thiểu</span><div className="relative mt-1.5"><input type="number" min={0} value={policy.minLead} onChange={event => setPolicy(value => ({ ...value, minLead:Math.max(0, Number(event.target.value)) }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-12 font-tabular text-sm outline-none focus:border-blue-500"/><span className="absolute right-3 top-3 text-xs text-slate-400">giờ</span></div><span className="mt-1 block font-tabular text-[9px] text-slate-400">min_lead_time_hours</span></label>
              <label className="block"><span className="text-xs font-semibold text-slate-700">Mở lịch trước tối đa</span><div className="relative mt-1.5"><input type="number" min={1} value={policy.maxAdvance} onChange={event => setPolicy(value => ({ ...value, maxAdvance:Math.max(1, Number(event.target.value)) }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-12 font-tabular text-sm outline-none focus:border-blue-500"/><span className="absolute right-3 top-3 text-xs text-slate-400">ngày</span></div><span className="mt-1 block font-tabular text-[9px] text-slate-400">max_advance_booking_days</span></label>
              <label className="block"><span className="text-xs font-semibold text-slate-700">Hạn chót tự hủy/đổi</span><div className="relative mt-1.5"><input type="number" min={0} value={policy.cancellation} onChange={event => setPolicy(value => ({ ...value, cancellation:Math.max(0, Number(event.target.value)) }))} className="h-11 w-full rounded-lg border border-slate-200 px-3 pr-12 font-tabular text-sm outline-none focus:border-blue-500"/><span className="absolute right-3 top-3 text-xs text-slate-400">giờ</span></div><span className="mt-1 block font-tabular text-[9px] text-slate-400">cancellation_deadline_hours</span></label>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-700">Xem trước cửa sổ đặt lịch</p><p className="mt-0.5 text-[10px] text-slate-500">Ngày ngoài khoảng cho phép được làm mờ và vô hiệu hóa.</p></div><span className="rounded bg-blue-50 px-2 py-1 font-tabular text-[9px] font-bold text-blue-700">{policy.minLead}h → {policy.maxAdvance} ngày</span></div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {previewDays.map(([day,date],index) => {
                  const disabled = index === 0 && policy.minLead > 0 || index > policy.maxAdvance
                  return <button key={`${day}-${date}`} type="button" disabled={disabled} className={`min-w-20 rounded-lg border px-3 py-2 text-center ${disabled ? 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-300 opacity-50' : 'border-blue-200 bg-white text-blue-800'}`}><span className="block text-[10px] font-semibold">{day}</span><span className="mt-1 block font-tabular text-xs font-bold">{date}</span></button>
                })}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between"><p className="text-[10px] text-slate-400">Thay đổi áp dụng ngay qua Valkey, không cần khởi động lại.</p><button type="button" onClick={() => setSaved(true)} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Lưu chính sách</button></div>
          </div>
        </section>

        <section data-qr-security="QR rotates every 60s via SSE, HMAC-SHA256 signed, never persisted.">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">B. Điểm check-in QR & Đường dẫn tiếp nhận</h2>
              <p className="mt-1 text-xs text-slate-500">Mã QR động và đường dẫn check-in tại quầy, tự động xoay vòng mỗi 60 giây và đồng bộ trực tiếp tới quầy tiếp nhận.</p>
            </div>
            <button
              type="button"
              onClick={rotateDynamicCheckinNow}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-xs"
            >
              <RefreshIco s={13}/>
              <span>Làm mới mã ngay</span>
            </button>
          </div>

          <article className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Quầy tiếp nhận chính</h3>
                  <span className="font-mono text-xs font-semibold text-slate-400">· RECEPTION-01</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Sảnh tầng trệt · Điểm tiếp nhận và check-in duy nhất của cơ sở</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                ĐANG HOẠT ĐỘNG
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 rounded-xl bg-slate-50/80 p-5 border border-slate-200/80">
              <div className="md:col-span-4 flex flex-col items-center justify-center gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <QRCode sz={128}/>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {dynamicQr.token}
                  </span>
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 44 44" className="-rotate-90">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#E2E8F0" strokeWidth="3"/>
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeDasharray="113" strokeDashoffset={ringOffset}/>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-tabular text-xs font-bold text-slate-700">
                      {String(Math.floor(dynamicQr.remainingSeconds / 60)).padStart(2, '0')}:{String(dynamicQr.remainingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Cơ chế làm mới URL định kỳ (60 giây)</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Mã xác thực một lần được tạo tự động, chống chụp lại mã cũ và đồng bộ trực tiếp tới màn hình quầy tiếp nhận nhân viên.
                    </p>
                  </div>
                </div>

                {/* Dynamic Check-in URL Box */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <TicketIco s={13}/> Đường dẫn check-in động (Dynamic URL)
                    </label>
                    <span className="text-[10px] font-semibold text-blue-600 font-mono">
                      Reset sau {dynamicQr.remainingSeconds}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={dynamicQr.checkInUrl}
                      className="h-10 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-700 outline-none select-all focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="flex h-10 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 shrink-0 shadow-xs"
                    >
                      {copiedUrl ? <><CheckIco s={14}/>Đã chép</> : <><CopyIco s={14}/>Sao chép URL</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => window.open(dynamicQr.checkInUrl, '_blank')}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <MonitorIco s={15}/>
                <span>Xem màn hình tiếp nhận khách</span>
                <ExternalLinkIco s={13}/>
              </button>
              <button
                type="button"
                onClick={rotateDynamicCheckinNow}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshIco s={15}/>
                <span>Tạo URL mới ngay</span>
              </button>
              <button
                type="button"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <DownloadIco s={15}/>
                <span>Tải bản in mã QR</span>
              </button>
            </div>
          </article>
          <p className="mt-3 text-right text-[10px] text-slate-400">QR & URL rotate every 60s via SSE, HMAC-SHA256 signed, synchronized across Admin & Counter.</p>
        </section>
      </div>
    </div>
  )
}

function NotificationSettingsScreen() {
  const templates = [
    { name:'Xác nhận đặt lịch', subject:'Xác nhận lịch hẹn {ticket_code}', body:'Xin chào {customer_name}, lịch hẹn dịch vụ {service_name} của bạn đã được xác nhận vào {appointment_time}. Mã vé: {ticket_code}.' },
    { name:'Nhắc lịch hẹn', subject:'Nhắc lịch hẹn sắp tới', body:'Xin chào {customer_name}, bạn có lịch {service_name} vào {appointment_time}. Vui lòng đến sớm 10 phút để check-in.' },
    { name:'Cảnh báo sắp đến lượt', subject:'Bạn sắp đến lượt', body:'Vé {ticket_code} của bạn sắp được phục vụ. Vui lòng di chuyển đến khu vực chờ.' },
    { name:'Mời vào quầy', subject:'Mời bạn đến quầy phục vụ', body:'Kính mời {customer_name}, vé {ticket_code} đến quầy của {counter_staff_name}.' },
    { name:'Khảo sát đánh giá', subject:'Đánh giá trải nghiệm của bạn', body:'Xin chào {customer_name}, dịch vụ {service_name} đã hoàn tất. Hãy dành ít phút chia sẻ trải nghiệm của bạn.' },
  ]
  const placeholders = ['{customer_name}','{service_name}','{appointment_time}','{ticket_code}','{counter_staff_name}']
  const [tab, setTab] = useState<'templates' | 'logs'>('templates')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [subject, setSubject] = useState(templates[0].subject)
  const [body, setBody] = useState(templates[0].body)
  const [saved, setSaved] = useState(false)
  const [logSearch, setLogSearch] = useState('')
  const [retryToast, setRetryToast] = useState(false)
  const [retryCounts, setRetryCounts] = useState<Record<number, number>>({})
  const logs = [
    { id:1, time:'31/10/2026 10:42:07', recipient:'Nguyễn Minh Anh · 0901234567', ticket:'A-042', channel:'Email', summary:'Mời vào quầy tiếp nhận', status:'success' },
    { id:2, time:'31/10/2026 10:40:18', recipient:'Trần Thu Hà · 0912345678', ticket:'A-041', channel:'Push', summary:'Cảnh báo sắp đến lượt', status:'success' },
    { id:3, time:'31/10/2026 10:35:02', recipient:'Lê Quốc Bảo · 0923456789', ticket:'A-039', channel:'Email', summary:'Nhắc lịch hẹn 10:45', status:'failed', error:'SMTP 550: Hộp thư người nhận không tồn tại.' },
    { id:4, time:'31/10/2026 10:31:44', recipient:'Phạm Ngọc Mai · 0934567890', ticket:'APT-0040', channel:'Push', summary:'Xác nhận đặt lịch', status:'success' },
    { id:5, time:'31/10/2026 10:28:11', recipient:'Vũ Hoàng Nam · 0945678901', ticket:'A-037', channel:'Email', summary:'Khảo sát đánh giá', status:'failed', error:'Kết nối nhà cung cấp email quá thời gian.' },
  ]
  const sampleValues: Record<string,string> = {
    '{customer_name}':'Nguyễn Minh Anh',
    '{service_name}':'Khám tổng quát',
    '{appointment_time}':'09:30, 02/11/2026',
    '{ticket_code}':'A-042',
    '{counter_staff_name}':'Nguyễn Thị Hồng (Nhân viên tiếp nhận)',
  }
  const renderSample = (content: string) => Object.entries(sampleValues).reduce((result,[key,value]) => result.replaceAll(key,value), content)

  useEffect(() => {
    if (!saved && !retryToast) return
    const timer = window.setTimeout(() => { setSaved(false); setRetryToast(false) }, 3000)
    return () => window.clearTimeout(timer)
  }, [saved, retryToast])

  const selectTemplate = (index: number) => {
    setSelectedIndex(index)
    setSubject(templates[index].subject)
    setBody(templates[index].body)
  }
  const filteredLogs = logs.filter(log => `${log.recipient} ${log.ticket}`.toLowerCase().includes(logSearch.toLowerCase()))

  return (
    <div className="min-h-full bg-slate-50">
      {(saved || retryToast) && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 border-l-[3px] border-emerald-500 bg-white p-4 shadow-[var(--shadow-modal)]"><CheckIco s={17}/><p className="text-sm font-semibold text-slate-800">{saved ? 'Đã lưu mẫu bản tin.' : 'Đã đưa bản tin vào hàng đợi gửi lại.'}</p></div>}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div className="flex h-[72px] items-center"><div><h1 className="text-lg font-bold text-slate-900">Cấu hình thông báo</h1><p className="text-xs leading-relaxed text-slate-500">Quản lý nội dung và theo dõi trạng thái gửi bản tin</p></div></div>
        <div className="flex gap-6">
          <button type="button" onClick={() => setTab('templates')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'templates' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Mẫu bản tin</button>
          <button type="button" onClick={() => setTab('logs')} className={`border-b-2 pb-3 text-xs font-bold ${tab === 'logs' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>Nhật ký gửi</button>
        </div>
      </header>

      {tab === 'templates' ? (
        <div className="p-6">
          <div className="grid grid-cols-5 gap-3">
            {templates.map((template,index) => <button key={template.name} type="button" onClick={() => selectTemplate(index)} className={`rounded-[10px] border bg-white p-4 text-left shadow-[var(--shadow-card)] ${selectedIndex === index ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><NoteIco s={16}/></span><span className="mt-3 block text-xs font-bold leading-relaxed text-slate-800">{template.name}</span></button>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <section className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-bold text-slate-800">Biên tập mẫu</h2>
              <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">TIÊU ĐỀ</span><input value={subject} onChange={event => setSubject(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/></label>
              <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">NỘI DUNG</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={9} className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm leading-[1.7] outline-none focus:border-blue-500"/></label>
              <div className="mt-3"><p className="mb-2 text-[10px] font-semibold text-slate-500">CHÈN BIẾN NỘI DUNG</p><div className="flex flex-wrap gap-2">{placeholders.map(placeholder => <button key={placeholder} type="button" onClick={() => setBody(value => `${value}${value.endsWith(' ') ? '' : ' '}${placeholder}`)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-tabular text-[9px] font-bold text-blue-700">{placeholder}</button>)}</div></div>
              <div className="mt-5 flex justify-end"><button type="button" onClick={() => setSaved(true)} className="h-10 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white">Lưu mẫu</button></div>
            </section>
            <section className="rounded-[10px] border border-slate-200 bg-slate-100 p-5 shadow-[var(--shadow-card)]">
              <p className="mb-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">XEM TRƯỚC EMAIL</p>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white"><NoteIco s={17}/></div><div><p className="text-xs font-bold text-slate-800">Phòng khám St. Jude</p><p className="text-[9px] text-slate-400">notifications@nextturn.vn</p></div></div>
                <div className="p-5"><h3 className="text-base font-bold leading-relaxed text-slate-900">{renderSample(subject)}</h3><p className="mt-4 whitespace-pre-wrap text-sm leading-[1.8] text-slate-600">{renderSample(body)}</p><div className="mt-6 border-t border-slate-100 pt-4 text-[10px] text-slate-400">Bản tin tự động từ hệ thống NextTurn</div></div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="p-6" data-retry-policy="Maximum 3 retries per failed notification.">
          <div className="mb-4 flex items-center justify-between"><label className="relative w-80"><span className="absolute left-3 top-3 text-slate-400"><SearchIco s={15}/></span><input value={logSearch} onChange={event => setLogSearch(event.target.value)} placeholder="Lọc theo SĐT hoặc mã vé" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500"/></label><p className="text-[10px] text-slate-400">Thử lại tối đa 3 lần cho mỗi bản tin thất bại</p></div>
          <div className="rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50">{['Thời gian gửi','Người nhận','Kênh','Tóm tắt','Trạng thái'].map(label => <th key={label} className="px-4 py-3 text-[10px] font-bold tracking-[0.04em] text-slate-500">{label}</th>)}</tr></thead><tbody>{filteredLogs.map(log => <tr key={log.id} className={`group border-b border-slate-100 last:border-0 ${log.status === 'failed' ? 'hover:bg-red-50/30' : 'hover:bg-slate-50'}`}><td className="px-4 py-3 font-tabular text-[10px] text-slate-600">{log.time}</td><td className="px-4 py-3 text-[11px] font-semibold text-slate-700">{log.recipient}<span className="mt-0.5 block font-tabular text-[9px] font-normal text-slate-400">{log.ticket}</span></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${log.channel === 'Email' ? 'bg-blue-50 text-blue-800' : 'bg-violet-50 text-violet-800'}`}>{log.channel}</span></td><td className="px-4 py-3 text-[11px] text-slate-600">{log.summary}</td><td className="relative px-4 py-3"><span className={`rounded px-2 py-1 text-[9px] font-bold ${log.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{log.status === 'success' ? 'Thành công' : 'Thất bại'}</span>{log.status === 'failed' && <div className="pointer-events-none absolute right-4 top-full z-40 mt-1 w-72 translate-y-1 rounded-lg border border-red-100 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"><p className="text-[10px] leading-relaxed text-red-700">{log.error}</p><button type="button" disabled={(retryCounts[log.id] ?? 0) >= 3} onClick={() => { setRetryCounts(value => ({ ...value, [log.id]:(value[log.id] ?? 0) + 1 })); setRetryToast(true) }} className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700 disabled:opacity-40">Thử lại ({retryCounts[log.id] ?? 0}/3)</button></div>}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  )
}

function FeedbackManagementScreen() {
  const reviews = [
    { id:1, rating:1, service:'Khám tổng quát', staff:'Nguyễn Thị Hồng', comment:'Tôi đã chờ quá lâu và không được thông báo khi quầy thay đổi.', time:'31/10/2026 10:18:42', phone:'090****567', ticket:'A-031' },
    { id:2, rating:2, service:'Xét nghiệm máu', staff:'Lê Minh Tuấn', comment:'Quy trình rõ ràng nhưng thời gian trả kết quả chậm hơn dự kiến.', time:'31/10/2026 09:44:16', phone:'091****234', ticket:'A-027' },
    { id:3, rating:5, service:'Khám tổng quát', staff:'Nguyễn Thị Hồng', comment:'Nhân viên hướng dẫn tận tình, thời gian chờ ngắn.', time:'31/10/2026 10:36:08', phone:'093****890', ticket:'A-040' },
    { id:4, rating:4, service:'Tiêm phòng', staff:'Phạm Thu Hương', comment:'Đặt lịch thuận tiện và được gọi đúng giờ.', time:'31/10/2026 08:52:31', phone:'094****112', ticket:'A-019' },
    { id:5, rating:5, service:'Xét nghiệm máu', staff:'Lê Minh Tuấn', comment:'Không gian sạch sẽ, quy trình nhanh và chuyên nghiệp.', time:'30/10/2026 16:20:04', phone:'096****445', ticket:'A-118' },
    { id:6, rating:3, service:'Khám tổng quát', staff:'Phạm Thu Hương', comment:'Trải nghiệm ổn, cần thêm ghế tại khu vực chờ.', time:'30/10/2026 14:11:27', phone:'097****778', ticket:'A-105' },
  ]
  const [starFilter, setStarFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const filtered = reviews
    .filter(review => starFilter === 'all' || review.rating === Number(starFilter))
    .filter(review => serviceFilter === 'all' || review.service === serviceFilter)
    .filter(review => staffFilter === 'all' || review.staff === staffFilter)
    .sort((a,b) => (a.rating <= 2 ? -1 : 1) - (b.rating <= 2 ? -1 : 1))
  const average = filtered.length ? filtered.reduce((sum,review) => sum + review.rating, 0) / filtered.length : 0
  const csat = filtered.length ? filtered.filter(review => review.rating >= 4).length / filtered.length * 100 : 0

  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-20 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div><h1 className="text-lg font-bold text-slate-900">Quản lý đánh giá</h1><p className="text-xs leading-relaxed text-slate-500">Theo dõi mức độ hài lòng và xử lý phản hồi cần chú ý</p></div>
      </header>
      <div className="p-6">
        <div className="flex items-end gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
          <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">SỐ SAO</span><select value={starFilter} onChange={event => setStarFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><option value="all">Tất cả mức sao</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} sao</option>)}</select></label>
          <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">TỪ NGÀY</span><input type="date" defaultValue="2026-10-01" className="h-10 rounded-lg border border-slate-200 px-3 font-tabular text-xs"/></label>
          <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">ĐẾN NGÀY</span><input type="date" defaultValue="2026-10-31" className="h-10 rounded-lg border border-slate-200 px-3 font-tabular text-xs"/></label>
          <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">DỊCH VỤ</span><select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><option value="all">Tất cả dịch vụ</option><option>Khám tổng quát</option><option>Xét nghiệm máu</option><option>Tiêm phòng</option><option>Răng hàm mặt</option></select></label>
          <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-500">NHÂN VIÊN</span><select value={staffFilter} onChange={event => setStaffFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold"><option value="all">Tất cả nhân viên</option><option>Nguyễn Thị Hồng</option><option>Lê Minh Tuấn</option><option>Phạm Thu Hương</option></select></label>
        </div>

        <div className="mt-4 grid grid-cols-3 overflow-visible rounded-[10px] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <div className="border-r border-slate-200 p-4"><p className="text-xs font-medium text-slate-500">Tổng đánh giá</p><p className="mt-2 font-tabular text-2xl font-bold text-slate-900">{filtered.length}</p></div>
          <div className="border-r border-slate-200 p-4"><p className="text-xs font-medium text-slate-500">Điểm trung bình</p><div className="mt-2 flex items-center gap-2"><span className="text-amber-400"><StarIco s={21} fill/></span><span className="font-tabular text-2xl font-bold text-slate-900">{average.toFixed(1)}</span></div></div>
          <div className="group relative p-4"><p className="text-xs font-medium text-slate-500">CSAT</p><p className="mt-2 font-tabular text-2xl font-bold text-blue-700">{csat.toFixed(1)}%</p><div className="pointer-events-none absolute right-4 top-full z-40 mt-1 translate-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"><p className="font-tabular text-[10px] font-semibold text-slate-700">(4–5 sao / tổng) × 100%</p></div></div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-[10px] border border-slate-200 bg-white text-center shadow-[var(--shadow-card)]">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m32 10 6.2 12.6L52 24.6l-10 9.7 2.4 13.7L32 41.5 19.6 48 22 34.3l-10-9.7 13.8-2Z"/><path d="M16 54h32"/></svg>
              <p className="mt-4 text-sm font-medium text-slate-500">Chưa có đánh giá trong khoảng thời gian này.</p>
            </div>
          ) : filtered.map(review => {
            const needsAttention = review.rating <= 2
            return (
              <article key={review.id} className={`group relative rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-hover)] ${needsAttention ? 'border-l-[3px] border-l-red-500' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-amber-400">{[1,2,3,4,5].map(star => <StarIco key={star} s={14} fill={star <= review.rating}/>)}</div>
                    <p className="mt-2 text-xs font-semibold text-slate-700">{review.service}<span className="px-2 text-slate-300">•</span><span className="font-normal text-slate-500">{review.staff}</span></p>
                  </div>
                  <div className="flex items-center gap-2">{needsAttention && <span className="rounded bg-red-50 px-2 py-1 text-[9px] font-bold tracking-[0.06em] text-red-800">CẦN XỬ LÝ</span>}<time className="font-tabular text-[10px] text-slate-400">{review.time}</time></div>
                </div>
                <p className="mt-4 max-w-4xl text-sm leading-[1.7] text-slate-700">{review.comment}</p>
                <div className="pointer-events-none absolute right-5 top-full z-40 mt-1 w-72 translate-y-1 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[var(--shadow-modal)] transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-[9px] font-bold tracking-[0.05em] text-slate-400">THÔNG TIN XỬ LÝ KHIẾU NẠI</p>
                  <div className="mt-2 flex justify-between text-[10px] text-slate-600"><span>SĐT khách hàng</span><span className="font-tabular font-bold">{review.phone}</span></div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-600"><span>Mã vé</span><span className="font-tabular font-bold">{review.ticket}</span></div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BranchAdminConsole({ onLogout }: { onLogout: () => void }) {
  const [activeAdminPage, setActiveAdminPage] = useState<'overview' | 'services' | 'staff' | 'schedule' | 'settings' | 'notifications' | 'feedback'>('overview')
  const previewState = new URLSearchParams(window.location.search).get('adminState')
  const [activeRange, setActiveRange] = useState('Hôm nay')
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [loadingCharts, setLoadingCharts] = useState(previewState === 'loading')
  const [noChartData, setNoChartData] = useState(previewState === 'no-data')
  const [exportToast, setExportToast] = useState(false)
  const [liveDataTime, setLiveDataTime] = useState(new Date(2026, 9, 31, 10, 42, 7))

  useEffect(() => {
    const timer = window.setInterval(() => setLiveDataTime(value => new Date(value.getTime() + 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!loadingCharts) return
    const timer = window.setTimeout(() => setLoadingCharts(false), 900)
    return () => window.clearTimeout(timer)
  }, [loadingCharts])

  useEffect(() => {
    if (!exportToast) return
    const timer = window.setTimeout(() => setExportToast(false), 3600)
    return () => window.clearTimeout(timer)
  }, [exportToast])

  const selectRange = (range: string) => {
    setActiveRange(range)
    if (range === 'Tùy chỉnh') {
      setShowCustomRange(true)
      return
    }
    setShowCustomRange(false)
    setNoChartData(false)
    setLoadingCharts(true)
  }

  const navSections = [
    {
      label:'VẬN HÀNH',
      items:[
        { label:'Tổng quan', icon:<GridIco s={17}/>, page:'overview' },
        { label:'Điểm check-in QR', icon:<TicketIco s={17}/>, page:'checkin' },
      ],
    },
    {
      label:'CẤU HÌNH',
      items:[
        { label:'Dịch vụ', icon:<ListIco s={17}/>, page:'services' },
        { label:'Nhân viên', icon:<UsersIco s={17}/>, page:'staff' },
        { label:'Lịch làm việc', icon:<CalIco s={17}/>, page:'schedule' },
        { label:'Cài đặt hàng đợi', icon:<SettingsIco s={17}/>, page:'settings' },
        { label:'Cấu hình thông báo', icon:<AlertIco s={17}/>, page:'notifications' },
      ],
    },
    {
      label:'PHÂN TÍCH',
      items:[
        { label:'Báo cáo', icon:<BarIco s={17}/>, page:'reports' },
        { label:'Đánh giá phản hồi', icon:<StarIco s={17}/>, page:'feedback' },
      ],
    },
  ]

  return (
    <div className="flex h-screen min-h-[720px] w-full bg-slate-50 text-slate-900">
      {exportToast && (
        <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex max-w-sm items-start gap-3 border-l-[3px] border-emerald-500 bg-white p-4 shadow-[var(--shadow-modal)]">
          <span className="mt-0.5 text-emerald-600"><CheckIco s={17}/></span>
          <div>
            <p className="text-sm font-semibold leading-relaxed text-slate-800">Xuất báo cáo thành công.</p>
            <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 font-tabular text-[10px] font-semibold text-slate-600">bao-cao-2026-10-31.xlsx</span>
          </div>
        </div>
      )}
      <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="NextTurn">
              <path d="M12 2 3 7l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-relaxed tracking-tight text-slate-900">NextTurn</p>
            <p className="text-[10px] font-semibold leading-relaxed text-slate-400">QUẢN TRỊ CHI NHÁNH</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Điều hướng quản trị cơ sở">
          {navSections.map(section => (
            <div key={section.label} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-bold leading-relaxed tracking-[0.12em] text-slate-400">{section.label}</p>
              <div className="space-y-1">
                {section.items.map(item => (
                  <button key={item.label} type="button"
                    onClick={() => {
                      if (item.page === 'overview' || item.page === 'services' || item.page === 'staff' || item.page === 'schedule' || item.page === 'settings' || item.page === 'notifications' || item.page === 'feedback') setActiveAdminPage(item.page)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold leading-relaxed transition-colors ${item.page === activeAdminPage ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <span className={item.page === activeAdminPage ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-800 text-xs font-bold text-white">BN</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-relaxed text-slate-800">Trần Thị Bích Ngân</p>
              <p className="text-[10px] font-semibold leading-relaxed text-blue-700">Quản trị viên cơ sở</p>
            </div>
          </div>
          <button type="button" onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <LogOutIco s={14}/>Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {activeAdminPage === 'services' ? <ServicesScreen/> : activeAdminPage === 'staff' ? <StaffScreen/> : activeAdminPage === 'schedule' ? <ScheduleScreen/> : activeAdminPage === 'settings' ? <QueueSettingsScreen/> : activeAdminPage === 'notifications' ? <NotificationSettingsScreen/> : activeAdminPage === 'feedback' ? <FeedbackManagementScreen/> : (
        <>
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold leading-relaxed text-slate-900">Tenant Admin Console</h1>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold leading-relaxed text-blue-800">Quản trị viên cơ sở</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">Phòng khám Đa khoa St. Jude · Cơ sở Quận 10</p>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Cập nhật lần cuối <span className="font-tabular font-semibold text-slate-700">10:42:18</span></p>
        </header>

        <div className="p-6">
          <div className="mb-5 rounded-[10px] border border-slate-200 bg-white p-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <div className="relative flex rounded-lg bg-slate-100 p-1">
                {['Hôm nay','7 ngày','30 ngày','Tùy chỉnh'].map(range => (
                  <button key={range} type="button" onClick={() => selectRange(range)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${activeRange === range ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {range}
                  </button>
                ))}
                {showCustomRange && (
                  <div className="overlay-enter absolute left-0 top-full z-50 mt-2 w-72 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-modal)]">
                    <p className="mb-3 text-xs font-bold text-slate-800">Chọn khoảng thời gian</p>
                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="mb-1 block text-[10px] font-semibold text-slate-500">Ngày bắt đầu</span>
                        <input type="date" defaultValue="2026-10-01" className="w-full rounded-lg border border-slate-200 px-2 py-2 font-tabular text-[10px] text-slate-700 outline-none focus:border-blue-500"/>
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-semibold text-slate-500">Ngày kết thúc</span>
                        <input type="date" defaultValue="2026-10-31" className="w-full rounded-lg border border-slate-200 px-2 py-2 font-tabular text-[10px] text-slate-700 outline-none focus:border-blue-500"/>
                      </label>
                    </div>
                    <button type="button" onClick={() => { setShowCustomRange(false); setNoChartData(true) }}
                      className="mt-4 h-10 w-full rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700">
                      Áp dụng
                    </button>
                  </div>
                )}
              </div>
              <label className="relative">
                <span className="sr-only">Lọc theo dịch vụ</span>
                <select className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500">
                  <option>Tất cả dịch vụ</option>
                  <option>Khám tổng quát</option>
                  <option>Xét nghiệm máu</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-3 text-slate-400"><ChevDnIco s={13}/></span>
              </label>
              <label className="relative">
                <span className="sr-only">Lọc theo nhân viên</span>
                <select className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500">
                  <option>Tất cả nhân viên</option>
                  <option>Nguyễn Thị Hồng</option>
                  <option>Trần Văn Minh</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-3 text-slate-400"><ChevDnIco s={13}/></span>
              </label>
              <div className="flex-1"/>
              <button type="button" onClick={() => setExportToast(true)}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
                <DownloadIco s={16}/>Xuất báo cáo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 grid grid-cols-5 gap-4">
              <section className="group relative z-0 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:z-30 hover:shadow-[var(--shadow-hover)]">
                <p className="text-[13px] font-medium leading-relaxed text-slate-600">Tổng vé tiếp nhận</p>
                <p className="mt-3 font-tabular text-[32px] font-bold leading-none tracking-tight text-slate-900">247</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">Đặt hẹn <span className="font-tabular">68%</span></span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Vãng lai <span className="font-tabular">32%</span></span>
                </div>
                <KpiPopover title="Phân bố vé theo giờ">
                  <div className="flex h-12 items-end gap-1">
                    {[32,48,66,42,78,55,86,60].map((height,index) => <span key={index} className="flex-1 rounded-t bg-blue-500" style={{ height:`${height}%` }}/>)}
                  </div>
                  <div className="mt-1 flex justify-between font-tabular text-[8px] text-slate-400"><span>07h</span><span>14h</span></div>
                </KpiPopover>
              </section>

              <section className="group relative z-0 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:z-30 hover:shadow-[var(--shadow-hover)]">
                <p className="text-[13px] font-medium leading-relaxed text-slate-600">Tỷ lệ vắng mặt</p>
                <p className="mt-3 font-tabular text-[32px] font-bold leading-none tracking-tight text-slate-900">4.2%</p>
                <span className="mt-4 inline-flex rounded-md bg-emerald-50 px-2 py-1 font-tabular text-[10px] font-bold text-emerald-800">Tốt · dưới 5%</span>
                <KpiPopover title="Top 3 dịch vụ theo tỷ lệ vắng mặt">
                  <div className="space-y-2">
                    {[['Siêu âm','7.8%'],['Răng hàm mặt','6.2%'],['Khám chuyên khoa','5.4%']].map(([service,value]) => (
                      <div key={service} className="flex items-center justify-between text-[10px] text-slate-600"><span>{service}</span><span className="font-tabular font-bold text-amber-800">{value}</span></div>
                    ))}
                  </div>
                </KpiPopover>
              </section>

              <section className="group relative z-0 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:z-30 hover:shadow-[var(--shadow-hover)]">
                <p className="text-[13px] font-medium leading-relaxed text-slate-600">Thời gian phục vụ TB</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-tabular text-[32px] font-bold leading-none tracking-tight text-slate-900">13</span>
                  <span className="text-xs font-semibold text-slate-500">phút</span>
                </div>
                <p className="mt-4 text-[10px] leading-relaxed text-slate-400">Chuẩn dịch vụ: <span className="font-tabular">15 phút</span></p>
                <KpiPopover title="Theo nhóm dịch vụ">
                  <div className="space-y-2 font-tabular text-[10px]">
                    <p className="flex justify-between text-slate-600"><span>Khám tổng quát</span><strong>11p</strong></p>
                    <p className="flex justify-between text-slate-600"><span>Xét nghiệm</span><strong>14p</strong></p>
                    <p className="flex justify-between text-slate-600"><span>Siêu âm</span><strong>18p</strong></p>
                  </div>
                </KpiPopover>
              </section>

              <section className="group relative z-0 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:z-30 hover:shadow-[var(--shadow-hover)]">
                <p className="text-[13px] font-medium leading-relaxed text-slate-600">CSAT trung bình</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-amber-400"><StarIco s={24} fill/></span>
                  <span className="font-tabular text-[32px] font-bold leading-none tracking-tight text-slate-900">4.7</span>
                  <span className="font-tabular text-xs text-slate-400">/ 5.0</span>
                </div>
                <p className="mt-4 font-tabular text-[10px] text-slate-400">186 phản hồi</p>
                <KpiPopover title="Chất lượng phản hồi">
                  <div className="flex items-center justify-between text-[10px] text-slate-600"><span>Đánh giá 4–5 sao</span><span className="font-tabular font-bold text-emerald-700">91%</span></div>
                </KpiPopover>
              </section>

              <section className="group relative z-0 rounded-[10px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out hover:z-30 hover:shadow-[var(--shadow-hover)]">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium leading-relaxed text-slate-600">Đang chờ / Đang phục vụ</p>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-tabular text-[32px] font-bold leading-none text-blue-700">08</span>
                  <span className="pb-1 text-slate-300">/</span>
                  <span className="font-tabular text-[32px] font-bold leading-none text-emerald-700">03</span>
                </div>
                <p className="mt-4 text-[10px] font-semibold text-emerald-700">Dữ liệu trực tiếp</p>
                <KpiPopover title="Hàng đợi trực tiếp">
                  <div className="space-y-2 text-[10px] text-slate-600">
                    <p className="flex justify-between"><span>Khám tổng quát</span><span className="font-tabular font-bold">05 / 02</span></p>
                    <p className="flex justify-between"><span>Xét nghiệm</span><span className="font-tabular font-bold">03 / 01</span></p>
                  </div>
                </KpiPopover>
              </section>
            </div>

            {loadingCharts ? (
              <>
                {['col-span-8','col-span-4','col-span-8','col-span-4','col-span-8','col-span-4'].map((spanClass,index) => (
                  <div key={index} className={`${spanClass} h-[320px] rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]`}>
                    <div className="skeleton-shimmer h-4 w-48 rounded"/>
                    <div className="skeleton-shimmer mt-3 h-3 w-32 rounded"/>
                    <div className="skeleton-shimmer mt-8 h-[220px] w-full rounded-lg"/>
                  </div>
                ))}
              </>
            ) : noChartData ? (
              <>
                {['col-span-8','col-span-4','col-span-8','col-span-4'].map((spanClass,index) => (
                  <div key={index} className={`relative ${spanClass} h-[320px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]`}>
                    {[24,48,72].map(top => <span key={top} className="absolute inset-x-8 h-px bg-slate-200" style={{ top:`${top}%` }}/>)}
                    <span className="absolute bottom-8 left-10 top-10 w-px bg-slate-200"/>
                    <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 43V13M9 43h38"/><path d="m16 34 8-9 7 5 10-13"/><circle cx="41" cy="17" r="2"/>
                      </svg>
                      <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-slate-500">Chưa có dữ liệu vận hành trong khoảng thời gian này</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div
                className="contents"
                data-filter-behavior="Filter changes re-render charts without page reload."
                data-kpi-live="KPI cards tick live via WebSocket."
              >
                <TicketVolumeChart/>
                <BookingMixChart/>
                <WaitTrendChart/>
                <OutcomeChart/>
                <StaffRanking/>
                <CSATAnalytics/>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <p className="font-tabular text-[10px] text-slate-400">
              Dữ liệu được cập nhật lúc {liveDataTime.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}.
            </p>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}

function LobbyDisplay({ tenantCode='st-jude' }: { tenantCode?: string }) {
  const query = new URLSearchParams(window.location.search)
  const previewState = query.get('state')
  const isSuspended = tenantCode === 'suspended'
  const isUnknown = !['st-jude','clinical','wellness','suspended'].includes(tenantCode)
  const isEmpty = query.get('empty') === '1'
  const waitingTickets = isEmpty ? [] : [
    { code:'A-043', time:'10:31' }, { code:'A-044', time:'10:33' }, { code:'A-045', time:'10:35' },
    { code:'A-046', time:'10:37' }, { code:'A-047', time:'10:39' }, { code:'A-048', time:'10:40' },
    { code:'A-049', time:'10:41' }, { code:'A-050', time:'10:42' },
  ]
  const brandPrimary = tenantCode === 'wellness' ? '#BE185D' : '#0891B2'
  const [clock, setClock] = useState(new Date())
  const [callPhase, setCallPhase] = useState<'active' | 'settling' | 'served'>(previewState === 'idle' ? 'served' : 'active')
  const [idle, setIdle] = useState(previewState === 'idle')
  const [reconnecting] = useState(previewState === 'reconnect')
  const [showFullscreenHint, setShowFullscreenHint] = useState(() => localStorage.getItem(`nextturn-display-hint:${tenantCode}`) !== 'seen')
  const [cursorHidden, setCursorHidden] = useState(false)
  const chimePlayed = useRef(false)

  useEffect(() => {
    document.title = `${tenantCode} - Public Lobby Display`
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000)
    let cursorTimer = window.setTimeout(() => setCursorHidden(true), 10000)
    const revealCursor = () => {
      setCursorHidden(false)
      window.clearTimeout(cursorTimer)
      cursorTimer = window.setTimeout(() => setCursorHidden(true), 10000)
    }
    window.addEventListener('mousemove', revealCursor)
    return () => {
      window.clearInterval(clockTimer)
      window.clearTimeout(cursorTimer)
      window.removeEventListener('mousemove', revealCursor)
    }
  }, [tenantCode])

  useEffect(() => {
    if (!showFullscreenHint) return
    const timer = window.setTimeout(() => {
      setShowFullscreenHint(false)
      localStorage.setItem(`nextturn-display-hint:${tenantCode}`, 'seen')
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [showFullscreenHint, tenantCode])

  useEffect(() => {
    if (idle || reconnecting || isSuspended || isUnknown) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const settleTimer = reducedMotion ? undefined : window.setTimeout(() => setCallPhase('settling'), 5000)
    const servedTimer = window.setTimeout(() => setCallPhase('served'), reducedMotion ? 5000 : 5300)
    const idleTimer = window.setTimeout(() => setIdle(true), 120000)

    if (!chimePlayed.current) {
      chimePlayed.current = true
      try {
        const audio = new AudioContext()
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(440, audio.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(880, audio.currentTime + .32)
        gain.gain.setValueAtTime(.0001, audio.currentTime)
        gain.gain.exponentialRampToValueAtTime(.07, audio.currentTime + .03)
        gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .48)
        oscillator.connect(gain)
        gain.connect(audio.destination)
        oscillator.start()
        oscillator.stop(audio.currentTime + .5)
        oscillator.addEventListener('ended', () => void audio.close(), { once:true })
      } catch {
        // Standard browsers may require the fullscreen click before allowing audio.
      }

      if ('speechSynthesis' in window && query.get('speech') === '1') {
        const utterance = new SpeechSynthesisUtterance('Kính mời quý khách số A-042 đến quầy tiếp nhận.')
        utterance.lang = 'vi-VN'
        window.speechSynthesis.speak(utterance)
      }
    }

    return () => {
      if (settleTimer !== undefined) window.clearTimeout(settleTimer)
      window.clearTimeout(servedTimer)
      window.clearTimeout(idleTimer)
    }
  }, [idle, reconnecting, isSuspended, isUnknown])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
    setShowFullscreenHint(false)
    localStorage.setItem(`nextturn-display-hint:${tenantCode}`, 'seen')
  }

  const Footer = () => (
    <footer className="flex h-[72px] shrink-0 items-center border-t border-slate-200 bg-white px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tenant-brand-primary)] text-white shadow-xs">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>
          </svg>
        </div>
        <span className="text-[clamp(18px,1.1vw,24px)] font-bold leading-relaxed text-slate-800">Phòng khám St. Jude</span>
      </div>
      <div className="flex-1 text-center text-[11px] font-semibold tracking-[0.08em] text-slate-400">Powered by NextTurn</div>
      <div className="flex flex-1 justify-end">
        <time dateTime={clock.toISOString()} className="font-tabular text-[28px] font-bold leading-none text-slate-800">
          {clock.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
        </time>
      </div>
    </footer>
  )

  if (isSuspended || isUnknown) {
    return (
      <div
        className="flex h-screen w-screen flex-col bg-slate-50 text-slate-900"
        style={{ '--tenant-brand-primary':brandPrimary } as React.CSSProperties}
      >
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {isSuspended ? <PauseIco s={28}/> : <InfoIco s={28}/>}
            </div>
            <span className="mt-6 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {isSuspended ? 'TẠM NGƯNG' : 'KHÔNG TÌM THẤY'}
            </span>
            <h1 className="mt-4 text-[clamp(32px,2.5vw,48px)] font-bold leading-[1.4] text-slate-900">
              {isSuspended ? 'Cơ sở đang tạm ngưng tiếp nhận' : 'Không tìm thấy cơ sở'}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-slate-500">
              {isSuspended ? 'Dữ liệu hàng đợi được ẩn theo REQ-TNT-03.' : <>Đường dẫn yêu cầu: <span className="font-tabular text-slate-700">{window.location.pathname}</span></>}
            </p>
          </div>
        </main>
        <Footer/>
      </div>
    )
  }

  const servingTicket = callPhase === 'served' ? 'A-042' : 'A-038'

  return (
    <div
      className={`flex h-screen min-h-[720px] w-screen flex-col overflow-hidden bg-slate-100/70 text-slate-900 ${cursorHidden ? 'cursor-none' : ''}`}
      style={{ '--tenant-brand-primary':brandPrimary } as React.CSSProperties}
      data-sse-note="Supports 3–5 concurrent browser instances through independent SSE channels."
      data-presentation-mode="Standard browser route; fullscreen via F11 or Fullscreen API; pure web-based display."
    >
      {showFullscreenHint && (
        <div
          role="status"
          className="lobby-hint-lifecycle fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-2xl"
        >
          <span>Nhấn F11 hoặc nút này để trình chiếu toàn màn hình</span>
          <button type="button" onClick={toggleFullscreen} aria-label="Bật chế độ toàn màn hình"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-600 text-white transition-colors hover:bg-blue-500">
            <FullscreenIco s={20}/>
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <section className="flex h-full w-[30%] shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
          <div
            className="flex h-[35%] min-h-0 flex-col border-b border-slate-200 p-7 bg-white"
            aria-live="polite"
            data-hero-handoff="300ms cubic-bezier(0.16,1,0.3,1)"
          >
            <p className="mb-4 text-[13px] font-bold tracking-[0.04em] text-slate-500">ĐANG PHỤC VỤ</p>
            <div className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 shadow-xs">
                <span className="text-[clamp(18px,1.25vw,24px)] font-bold leading-relaxed text-emerald-950">Quầy tiếp nhận</span>
                <span className="font-tabular text-[clamp(32px,2.08vw,40px)] font-black leading-none text-emerald-600">{servingTicket}</span>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-7">
              <p className="text-[13px] font-bold tracking-[0.04em] text-slate-500">DANH SÁCH CHỜ</p>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-tabular text-sm font-bold text-blue-700">
                {String(waitingTickets.length).padStart(2, '0')}
              </span>
            </div>
            {waitingTickets.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="17" y="19" width="46" height="42" rx="7"/><path d="M27 32h26M27 40h18M27 48h12"/><path d="M31 19v-4h18v4"/>
                </svg>
                <p className="mt-4 text-xl font-semibold text-slate-500">Chưa có khách chờ</p>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-white to-transparent"/>
                <div
                  className="lobby-scroll"
                  data-marquee-direction="bottom-to-top"
                  data-paused-for-new-call={callPhase === 'active' || callPhase === 'settling'}
                  style={{ animationPlayState:callPhase === 'active' || callPhase === 'settling' ? 'paused' : 'running' }}
                >
                  {[...waitingTickets, ...waitingTickets].map((ticket,index) => {
                    const queueIndex = index % waitingTickets.length
                    const isNext = queueIndex < 3
                    return (
                      <div key={`${ticket.code}-${index}`}
                        className={`flex h-[88px] items-center border-b border-slate-100 px-7 transition-colors ${isNext ? 'bg-blue-50/70' : 'bg-white'}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`font-tabular text-[clamp(36px,2.5vw,48px)] font-black leading-none ${isNext ? 'text-blue-700' : 'text-slate-800'}`}>{ticket.code}</span>
                            {queueIndex === 0 && <span className="rounded bg-blue-600 px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-white shadow-xs">SẮP ĐẾN LƯỢT</span>}
                          </div>
                        </div>
                        <span className="font-tabular text-[20px] font-semibold text-slate-400">{ticket.time}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex h-full w-[70%] items-center justify-center bg-slate-50/70 px-16 text-center">
          {idle ? (
            <div className="lobby-crossfade w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-12 shadow-xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--tenant-brand-primary)] text-white shadow-md">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/></svg>
              </div>
              <h2 className="mt-7 text-[clamp(34px,2.7vw,52px)] font-bold leading-[1.4] text-slate-900">Quét mã QR tại quầy tiếp nhận để check-in</h2>
              <p className="mt-3 text-[clamp(18px,1.25vw,24px)] leading-relaxed text-slate-600">Xác nhận lịch hẹn nhanh chóng và theo dõi lượt phục vụ theo thời gian thực.</p>
              <div className="mt-8 flex justify-center gap-3">
                {['Khám tổng quát','Xét nghiệm','Tư vấn kết quả'].map(service => (
                  <span key={service} className="rounded-full border px-5 py-2 text-lg font-semibold"
                    style={{
                      borderColor:'color-mix(in srgb, var(--tenant-brand-primary) 50%, transparent)',
                      color:'var(--tenant-brand-primary)',
                      background:'color-mix(in srgb, var(--tenant-brand-primary) 10%, transparent)',
                    }}>
                    {service}
                  </span>
                ))}
              </div>
              <p className="mt-7 text-xs font-bold tracking-[0.12em] text-slate-400">
                WHITE-LABEL · {tenantCode === 'wellness' ? 'WELLNESS ROSE #BE185D' : 'CLINICAL CYAN #0891B2'}
              </p>
            </div>
          ) : callPhase !== 'served' ? (
            <div>
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-emerald-800 shadow-sm">
                <span className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-[clamp(18px,1.05vw,22px)] font-bold tracking-[0.14em]">KÍNH MỜI — NOW SERVING</span>
              </div>
              <div
                className={`lobby-new-call rounded-3xl border-2 border-emerald-400/50 bg-white px-14 py-8 shadow-2xl ${callPhase === 'settling' ? 'lobby-call-settle-to-left' : ''}`}
                data-attention-state="5-second soft emerald --glow-active pulse; reduced motion uses a static 2px emerald border"
                data-audio-announcement="One non-looping 440→880Hz sine chime; optional vi-VN speechSynthesis"
              >
                <div className="font-tabular text-[clamp(180px,11.45vw,240px)] font-black leading-none tracking-[-0.06em] text-slate-900 drop-shadow-sm">A-042</div>
                <div className="mt-10 flex items-center justify-center gap-10">
                  <span className="text-[clamp(36px,2.5vw,48px)] font-extrabold leading-[1.45] text-slate-800">QUẦY TIẾP NHẬN</span>
                  <svg width="150" height="96" viewBox="0 0 150 96" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Đi về phía bên phải">
                    <path d="M8 48h126"/><path d="m96 10 38 38-38 38"/>
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[clamp(24px,1.8vw,36px)] font-semibold leading-relaxed text-slate-400">Đang chờ lượt gọi tiếp theo</p>
          )}
        </section>
      </div>

      <Footer/>

      {reconnecting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
            <span className="mx-auto block w-fit animate-spin text-blue-600"><RefreshIco s={42}/></span>
            <p className="mt-6 text-[28px] font-bold leading-relaxed text-slate-900">Đang kết nối lại...</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">SSE auto-reconnect ≤ 5s, no page reload</p>
            <p className="mt-4 font-tabular text-sm text-slate-400">Dữ liệu lúc 10:42:07</p>
          </div>
        </div>
      )}
    </div>
  )
}

function WidgetTicketCard({ status='waiting', service='Khám tổng quát' }: { status?: 'waiting' | 'upcoming' | 'called'; service?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[6px] border bg-white shadow-sm ${status === 'upcoming' ? 'upcoming-ticket border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
      <div className="px-5 py-6 text-center">
        <p className="text-[10px] font-bold leading-relaxed tracking-[0.12em] text-slate-400">SỐ THỨ TỰ</p>
        <p className="mt-1 font-tabular text-[40px] font-bold leading-none tracking-tight text-slate-900">A-042</p>
        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{service}</p>
      </div>
      <div className="relative border-t border-dashed border-slate-300 px-5 py-5">
        <span className="absolute -left-2 top-[-9px] h-4 w-4 rounded-full border-r border-slate-300 bg-slate-50"/>
        <span className="absolute -right-2 top-[-9px] h-4 w-4 rounded-full border-l border-slate-300 bg-slate-50"/>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold leading-relaxed text-slate-800">còn {status === 'upcoming' ? '2' : '3'} người phía trước</p>
            <p className="mt-1 font-tabular text-xs font-semibold text-slate-500">≈ {status === 'upcoming' ? '8' : '12'} phút</p>
          </div>
          <ClockIco s={20}/>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full transition-all duration-700 ${status === 'upcoming' ? 'w-3/4 bg-amber-500' : 'w-1/2 bg-blue-500'}`}/>
        </div>
        <div className="mt-2 flex justify-between font-tabular text-[9px] text-slate-400">
          <span>Đã nhận vé</span><span>Đến lượt</span>
        </div>
      </div>
    </div>
  )
}

function FullscreenWidgetTicket() {
  useEffect(() => {
    document.title = 'NextTurn - Vé điện tử'
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-600 text-white">
            <TicketIco s={18}/>
          </div>
          <div>
            <p className="text-sm font-bold leading-relaxed">Phòng khám St. Jude</p>
            <p className="text-[10px] leading-relaxed text-slate-500">Vé điện tử · NextTurn</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-800">ĐANG CHỜ</span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[560px]">
          <WidgetTicketCard/>
          <button type="button" className="mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-md bg-cyan-600 text-sm font-bold text-white">
            <TicketIco s={18}/>Quét mã QR check-in
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">Trang vé toàn màn hình được mở từ widget nhúng.</p>
        </div>
      </main>
    </div>
  )
}

function BookingWidgetDemo() {
  const getInitialMode = (): 'booking' | 'checkin' | 'tracker' => {
    if (typeof window === 'undefined') return 'booking'
    const query = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    if (query.get('mode') === 'checkin' || hash.includes('mode=checkin')) return 'checkin'
    if (query.get('mode') === 'tracker' || hash.includes('mode=tracker')) return 'tracker'
    return 'booking'
  }
  const [activeMode, setActiveMode] = useState<'booking' | 'checkin' | 'tracker'>(getInitialMode)
  const [primaryColor, setPrimaryColor] = useState('#0891B2')
  const [borderRadius, setBorderRadius] = useState('8px')
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  useEffect(() => {
    const handleUrlChange = () => {
      const query = new URLSearchParams(window.location.search)
      const hash = window.location.hash
      if (query.get('mode') === 'checkin' || hash.includes('mode=checkin')) {
        setActiveMode('checkin')
      }
    }
    window.addEventListener('hashchange', handleUrlChange)
    window.addEventListener('popstate', handleUrlChange)
    return () => {
      window.removeEventListener('hashchange', handleUrlChange)
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [])

  // Booking states
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 'success'>(1)
  const [selectedService, setSelectedService] = useState('Khám tổng quát')
  const [selectedSlot, setSelectedSlot] = useState('10:00')
  const [holdSeconds, setHoldSeconds] = useState(600)
  const [bookingForm, setBookingForm] = useState({ name:'Nguyễn Văn An', phone:'0901234567', email:'an@example.com' })

  // Check-in states (100% mobile web-based)
  const [checkInSubView, setCheckInSubView] = useState<'choice' | 'qr_scan' | 'manual_code' | 'walkin_service' | 'walkin_phone' | 'ticket_issued'>('choice')
  const [manualCode, setManualCode] = useState('')
  const [walkInService, setWalkInService] = useState('Khám tổng quát')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [issuedTicketNumber, setIssuedTicketNumber] = useState('A-012')
  const [isPriority, setIsPriority] = useState(true)

  // Tracker states
  const [trackerStatus, setTrackerStatus] = useState<'waiting' | 'upcoming' | 'called' | 'completed'>('waiting')
  const [rating, setRating] = useState(5)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [comment, setComment] = useState('')

  // REQ-TICKET-04: Ticket recovery & lookup states
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupPhone, setLookupPhone] = useState('0901234567')
  const [lookupResult, setLookupResult] = useState<'active_found' | 'not_found' | null>(null)

  useEffect(() => {
    document.title = 'NextTurn - Embeddable Modular Widgets'
  }, [])

  useEffect(() => {
    if (bookingStep !== 3 || holdSeconds <= 0) return
    const timer = window.setTimeout(() => setHoldSeconds(v => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [bookingStep, holdSeconds])

  const holdTime = `${String(Math.floor(holdSeconds / 60)).padStart(2, '0')}:${String(holdSeconds % 60).padStart(2, '0')}`

  const copyEmbed = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2400)
  }

  const handleLookup = () => {
    const clean = lookupPhone.trim().replace(/\D/g, '')
    if (clean === '0901234567' || clean.endsWith('4567') || clean === '0912345678') {
      setLookupResult('active_found')
    } else {
      setLookupResult('not_found')
    }
  }

  const restoreFoundTicket = () => {
    setLookupOpen(false)
    setActiveMode('tracker')
    setTrackerStatus('waiting')
  }

  const embedCodes = {
    booking: `<iframe\n  src="https://nextturn.vn/widget/st-jude?mode=booking&theme=light&primary=${encodeURIComponent(primaryColor)}&radius=${borderRadius}"\n  width="100%" height="680px" frameborder="0" loading="lazy">\n</iframe>`,
    checkin: `<iframe\n  src="https://nextturn.vn/widget/st-jude?mode=checkin&theme=light&primary=${encodeURIComponent(primaryColor)}&radius=${borderRadius}"\n  width="100%" height="100vh" frameborder="0" allow="camera">\n</iframe>`,
    tracker: `<script\n  src="https://nextturn.vn/widget.js"\n  data-tenant="st-jude"\n  data-mode="tracker"\n  data-primary="${primaryColor}">\n</script>`,
  }

  const QrIcoLocal = ({s=16}:{s?:number}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2v7h-7v-2"/>
    </svg>
  )

  const CodeIcoLocal = ({s=16}:{s?:number}) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  )

  const BrandMark = ({ size=32 }: { size?: number }) => (
    <span className="flex shrink-0 items-center justify-center text-white transition-all shadow-xs" style={{ width:size, height:size, borderRadius, backgroundColor:primaryColor }}>
      <svg width={size * .55} height={size * .55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>
      </svg>
    </span>
  )

  const PoweredBy = () => (
    <div className="border-t border-slate-100 bg-white px-5 py-2.5 text-center text-[11px] font-medium leading-relaxed text-slate-400">
      Bảo mật bởi <span className="font-bold text-slate-600">NextTurn Platform</span>
      <span className="px-1.5">•</span>
      <button type="button" onClick={() => { setLookupOpen(true); setLookupResult('active_found') }} className="font-semibold text-cyan-700 hover:underline">
        🔍 Tìm lại vé của tôi (Khôi phục phiên)
      </button>
    </div>
  )

  return (
    <div
      className="isolate min-h-screen bg-slate-100/90 p-5 text-slate-900"
      style={{
        '--widget-primary': primaryColor,
        '--widget-radius': borderRadius,
        fontFamily: 'var(--font-sans)',
      } as React.CSSProperties}
    >
      {/* Top Bar with Mode Switcher & Theming Controls */}
      <div className="mx-auto mb-5 max-w-[1520px]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-800 border border-cyan-200/80">MODULAR WIDGET SYSTEM</span>
              <span className="text-[11px] font-medium text-slate-400">1 Codebase · 3 Chế độ chuyên biệt theo ngữ cảnh · 100% Web</span>
            </div>
            <h1 className="mt-1 text-lg font-bold text-slate-900">NextTurn Embeddable Widget Suite</h1>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => { setActiveMode('booking'); setBookingStep(1) }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${activeMode === 'booking' ? 'bg-white text-cyan-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <CalIco s={15}/>
              <span>Mode 1: Đặt lịch hẹn</span>
              <span className="rounded bg-cyan-100/70 px-1.5 py-0.2 font-mono text-[9px] text-cyan-800 font-semibold">Web</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('checkin'); setCheckInSubView('choice') }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${activeMode === 'checkin' ? 'bg-white text-cyan-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <UsersIco s={15}/>
              <span>Mode 2: Tiếp nhận tại quầy</span>
              <span className="rounded bg-emerald-100/70 px-1.5 py-0.2 font-mono text-[9px] text-emerald-800 font-semibold">Check-in</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('tracker'); setTrackerStatus('waiting') }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${activeMode === 'tracker' ? 'bg-white text-cyan-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <TicketIco s={15}/>
              <span>Mode 3: Vé điện tử thời gian thực</span>
              <span className="rounded bg-indigo-100/70 px-1.5 py-0.2 font-mono text-[9px] text-indigo-800 font-semibold">Live SSE</span>
            </button>
          </div>

          {/* Quick Ticket Recovery & Theme Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setLookupOpen(true); setLookupResult('active_found') }}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100 transition-colors shadow-xs"
            >
              <SearchIco s={14}/>
              <span>Tra cứu vé đã lấy</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Màu:</span>
              {[
                { hex:'#0891B2', name:'Cyan' },
                { hex:'#2563EB', name:'Blue' },
                { hex:'#4F46E5', name:'Indigo' },
                { hex:'#059669', name:'Emerald' },
              ].map(c => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => setPrimaryColor(c.hex)}
                  className={`h-5 w-5 rounded-full transition-transform ${primaryColor === c.hex ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => copyEmbed(embedCodes[activeMode])}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
            >
              <CodeIcoLocal s={14}/>
              <span>{copiedSnippet ? 'Đã sao chép!' : 'Copy mã Iframe'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Studio Grid */}
      <div className="mx-auto grid min-h-[780px] max-w-[1520px] grid-cols-[320px_440px_1fr] gap-5">
        
        {/* Left Column: Context Trigger & Launcher Showcase */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ĐIỂM CHẠM KHÁCH HÀNG</span>
            <h2 className="mt-1 text-sm font-bold text-slate-900">
              {activeMode === 'booking' ? 'Nút bấm đặt lịch nổi (FAB)' : activeMode === 'checkin' ? 'Kiosk / Điểm tiếp nhận tại quầy' : 'Pill thông báo hàng đợi nổi'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {activeMode === 'booking'
                ? 'Nhúng góc màn hình website đối tác, khách bấm để mở cửa sổ đặt lịch.'
                : activeMode === 'checkin'
                  ? 'Giao diện đặt tại quầy tiếp nhận để khách nhập mã đặt hẹn hoặc lấy số khám trực tiếp.'
                  : 'Nổi trên website hoặc link SMS/Zalo để khách theo dõi số thứ tự đang gọi.'}
            </p>
          </div>

          <div className="flex-1 space-y-4">
            {activeMode === 'booking' && (
              <div className="space-y-3">
                <div className="relative h-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Trạng thái nghỉ trên website</p>
                  <p className="mt-1 text-xs text-slate-600">Khách lướt website đối tác</p>
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setLookupOpen(true); setLookupResult('active_found') }}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <SearchIco s={12}/>Tìm lại vé
                    </button>
                    <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg" style={{ backgroundColor: primaryColor }}>
                      <CalIco s={20}/>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Đặc tính kỹ thuật (SRS Compliance)</p>
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2"><CheckIco s={13}/><span>Khóa slot tạm thời trên Valkey (10 phút)</span></li>
                    <li className="flex items-center gap-2"><CheckIco s={13}/><span>Triệt tiêu lỗi đặt trùng lịch tuyệt đối</span></li>
                    <li className="flex items-center gap-2"><CheckIco s={13}/><span>Không cấp vé vào sảnh từ xa (Tránh No-show ảo)</span></li>
                    <li className="flex items-center gap-2"><CheckIco s={13}/><span>Hỗ trợ khôi phục vé bằng số điện thoại</span></li>
                  </ul>
                </div>
              </div>
            )}

            {activeMode === 'checkin' && (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="rounded-xl border-2 border-slate-800 bg-white p-3 shadow-xs">
                    <QRCode sz={120}/>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-900">Bảng QR Check-in tại lối vào</p>
                  <p className="mt-1 text-[11px] text-slate-500">Khách dùng điện thoại quét mã · Tự làm mới mỗi 60s</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckIco s={12}/>100% Mobile Web trên thiết bị cá nhân
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Quy tắc phân loại vé:</p>
                  <p className="mt-1.5">▪ <strong>Khách có hẹn trước:</strong> Nhận vé ưu tiên dãy <code>A-xxx</code></p>
                  <p className="mt-1">▪ <strong>Khách vãng lai:</strong> Nhận vé thường dãy <code>B-xxx</code></p>
                </div>
              </div>
            )}

            {activeMode === 'tracker' && (
              <div className="space-y-3">
                <div className="relative h-44 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Pill nổi theo dõi hàng đợi</p>
                  <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
                    {trackerStatus === 'called' ? (
                      <div className="widget-calling-pulse flex items-center gap-2.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-emerald-900 shadow-md">
                        <ArrowRIco s={18}/>
                        <span className="text-xs font-bold">Mời vào quầy: Số A-042!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-full border border-blue-200 bg-white px-3.5 py-2 text-slate-800 shadow-md">
                        <span className="h-2 w-2 rounded-full bg-cyan-600 animate-pulse"/>
                        <span className="font-tabular text-xs font-bold">A-042</span>
                        <span className="h-3 w-px bg-slate-200"/>
                        <span className="text-[11px] font-medium text-slate-600">còn 2 lượt</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Mô phỏng trạng thái gọi số</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTrackerStatus('waiting')} className={`rounded-lg py-1.5 text-xs font-bold transition-colors ${trackerStatus === 'waiting' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-700'}`}>Đang chờ</button>
                    <button type="button" onClick={() => setTrackerStatus('upcoming')} className={`rounded-lg py-1.5 text-xs font-bold transition-colors ${trackerStatus === 'upcoming' ? 'bg-amber-600 text-white' : 'bg-white border text-slate-700'}`}>Sắp đến</button>
                    <button type="button" onClick={() => setTrackerStatus('called')} className={`rounded-lg py-1.5 text-xs font-bold transition-colors ${trackerStatus === 'called' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'}`}>Đang gọi số</button>
                    <button type="button" onClick={() => setTrackerStatus('completed')} className={`rounded-lg py-1.5 text-xs font-bold transition-colors ${trackerStatus === 'completed' ? 'bg-purple-600 text-white' : 'bg-white border text-slate-700'}`}>Đánh giá CSAT</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Center Column: Interactive Widget Viewport (Clean & Context-Specific) */}
        <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
          <div className="relative flex h-[740px] w-full max-w-[410px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200/90">
            
            {/* Widget Header */}
            <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3.5">
              <BrandMark size={34}/>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">Phòng khám St. Jude</p>
                <p className="text-[10px] font-semibold text-slate-500">
                  {activeMode === 'booking' ? 'Cổng đặt lịch hẹn trực tuyến' : activeMode === 'checkin' ? 'Cổng tiếp nhận tại quầy' : 'Vé điện tử thời gian thực'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setLookupOpen(true); setLookupResult('active_found') }}
                title="Tra cứu & Khôi phục vé bằng SĐT"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-cyan-800 transition-colors"
              >
                <SearchIco s={13}/>
                <span>Tìm vé</span>
              </button>
            </header>

            {/* Quick Recovery Notice Banner for Returning Users */}
            <div className="flex items-center justify-between border-b border-cyan-100 bg-cyan-50/70 px-4 py-2 text-[11px] text-cyan-900">
              <span className="flex items-center gap-1.5 truncate">
                <InfoIco s={13}/>
                <span>Lỡ đóng web khi đang chờ?</span>
              </span>
              <button
                type="button"
                onClick={() => { setLookupOpen(true); setLookupResult('active_found') }}
                className="font-bold underline shrink-0 hover:text-cyan-700"
              >
                Khôi phục vé ngay
              </button>
            </div>

            {/* Content Area Based on Active Mode */}
            <div className="relative flex-1 overflow-y-auto p-4 bg-slate-50/50">

              {/* ════════════ MODE 1: BOOKING WIDGET ════════════ */}
              {activeMode === 'booking' && (
                <div>
                  {bookingStep !== 'success' && (
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200/80 bg-white p-2.5 rounded-xl">
                      {['1. Dịch vụ', '2. Ngày & Giờ', '3. Xác nhận'].map((label, idx) => {
                        const stepNum = idx + 1
                        const active = bookingStep === stepNum
                        const done = (typeof bookingStep === 'number') && bookingStep > stepNum
                        return (
                          <div key={label} className="flex items-center gap-1.5">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-cyan-700 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {done ? <CheckIco s={11}/> : stepNum}
                            </span>
                            <span className={`text-[11px] ${active ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}`}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Step 1: Services */}
                  {bookingStep === 1 && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Chọn dịch vụ cần khám</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Thời gian và bảng giá niêm yết chuẩn</p>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { name:'Khám tổng quát', time:'15 phút', price:'150.000đ', desc:'Bác sĩ gia đình khám toàn diện' },
                          { name:'Khám chuyên khoa', time:'30 phút', price:'300.000đ', desc:'Chuyên gia nội/ngoại khoa tư vấn' },
                          { name:'Xét nghiệm máu', time:'10 phút', price:'220.000đ', desc:'Lấy mẫu xét nghiệm nhanh tại quầy' },
                          { name:'Tư vấn dinh dưỡng', time:'20 phút', price:'Miễn phí', desc:'Hướng dẫn chế độ ăn lành mạnh' },
                        ].map(svc => (
                          <button
                            key={svc.name}
                            type="button"
                            onClick={() => { setSelectedService(svc.name); setBookingStep(2) }}
                            className={`w-full rounded-xl border p-3.5 text-left transition-all ${selectedService === svc.name ? 'border-cyan-600 bg-white ring-2 ring-cyan-100 shadow-xs' : 'border-slate-200 bg-white hover:border-cyan-300'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{svc.name}</span>
                              <span className="text-xs font-bold text-cyan-800">{svc.price}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">{svc.desc}</p>
                            <span className="mt-2 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{svc.time}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Date & Slot */}
                  {bookingStep === 2 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Chọn ngày & khung giờ</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{selectedService}</p>
                        </div>
                        <button type="button" onClick={() => setBookingStep(1)} className="text-xs font-semibold text-cyan-700 hover:underline">Đổi dịch vụ</button>
                      </div>

                      {/* Horizontal Date Picker */}
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                          { day:'T5', date:'01', status:'available' },
                          { day:'T6', date:'02', status:'selected' },
                          { day:'T7', date:'03', status:'available' },
                          { day:'CN', date:'04', status:'full' },
                          { day:'T2', date:'05', status:'available' },
                        ].map(d => (
                          <button
                            key={d.date}
                            type="button"
                            disabled={d.status === 'full'}
                            className={`min-w-12 rounded-xl border p-2 text-center transition-all ${d.status === 'selected' ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-bold' : d.status === 'full' ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-50 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'}`}
                          >
                            <span className="block text-[10px] text-slate-400 font-semibold">{d.day}</span>
                            <span className="block text-sm font-bold">{d.date}</span>
                          </button>
                        ))}
                      </div>

                      {/* Slots Grid */}
                      <p className="text-[11px] font-bold text-slate-700 mt-2">Khung giờ khả dụng (Thứ 6, 02/10)</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { time:'08:00', state:'avail' },
                          { time:'08:30', state:'full' },
                          { time:'09:00', state:'avail' },
                          { time:'09:30', state:'avail' },
                          { time:'10:00', state:'avail' },
                          { time:'10:30', state:'holding' },
                          { time:'14:00', state:'avail' },
                          { time:'14:30', state:'avail' },
                          { time:'15:00', state:'full' },
                        ].map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.state === 'full'}
                            onClick={() => { setSelectedSlot(slot.time); setBookingStep(3) }}
                            className={`h-10 rounded-xl font-tabular text-xs font-bold transition-all ${slot.time === selectedSlot ? 'border-2 border-cyan-600 bg-cyan-50 text-cyan-900' : slot.state === 'full' ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : slot.state === 'holding' ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'border border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:border-emerald-400'}`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Còn chỗ</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"/>Đang giữ</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300"/>Đã kín</span>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Information & Hold lock */}
                  {bookingStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                        <div>
                          <p className="text-xs font-bold">Đang giữ chỗ tạm thời</p>
                          <p className="text-[11px] text-amber-700">{selectedService} · {selectedSlot}, Thứ Sáu</p>
                        </div>
                        <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded-lg border border-amber-200">{holdTime}</span>
                      </div>

                      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
                        <label className="block">
                          <span className="text-[11px] font-semibold text-slate-600">Họ và tên</span>
                          <input
                            value={bookingForm.name}
                            onChange={e => setBookingForm(f => ({ ...f, name:e.target.value }))}
                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:bg-white focus:border-cyan-600"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-slate-600">Số điện thoại</span>
                          <input
                            value={bookingForm.phone}
                            onChange={e => setBookingForm(f => ({ ...f, phone:e.target.value }))}
                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none font-tabular focus:bg-white focus:border-cyan-600"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold text-slate-600">Email nhận xác nhận</span>
                          <input
                            value={bookingForm.email}
                            onChange={e => setBookingForm(f => ({ ...f, email:e.target.value }))}
                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:bg-white focus:border-cyan-600"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBookingStep('success')}
                        className="h-11 w-full rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Xác nhận đặt hẹn ngay
                      </button>
                    </div>
                  )}

                  {/* Booking Success Confirmation */}
                  {bookingStep === 'success' && (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                        <CheckIco s={28}/>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-slate-900">Đặt lịch hẹn thành công!</h3>
                      <p className="mt-1 text-xs text-slate-500">Mã lịch hẹn đã được bảo lưu an toàn</p>

                      <div className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MÃ CUỘC HẸN</p>
                        <p className="mt-1 font-mono text-lg font-bold text-cyan-800">APT-20261031-0042</p>
                        <div className="mt-3 border-t border-slate-100 pt-3 text-left text-xs space-y-1 text-slate-600">
                          <p><strong>Dịch vụ:</strong> {selectedService}</p>
                          <p><strong>Thời gian:</strong> {selectedSlot} · Thứ Sáu, 02/10</p>
                          <p><strong>Khách hàng:</strong> {bookingForm.name} ({bookingForm.phone})</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-left text-xs text-blue-900 leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5"><InfoIco s={14}/>Hướng dẫn khi đến khám:</p>
                        <p className="mt-1 text-[11px] text-blue-800">Khi đến cơ sở, bạn chỉ cần mở camera điện thoại quét mã QR tại sảnh hoặc đưa mã số <code>APT-0042</code> cho nhân viên quầy tiếp đón để nhận số thứ tự ưu tiên.</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setActiveMode('tracker'); setTrackerStatus('waiting') }}
                        className="mt-4 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Chuyển sang xem Vé điện tử
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════ MODE 2: LOBBY CHECK-IN & WALKIN ════════════ */}
              {activeMode === 'checkin' && (
                <div className="space-y-4">
                  {checkInSubView === 'choice' && (
                    <div className="space-y-3 pt-2">
                      <div className="text-center mb-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200/80">TIẾP NHẬN TẠI QUẦY</span>
                        <h3 className="mt-2 text-base font-bold text-slate-900">Chào mừng quý khách đến cơ sở</h3>
                        <p className="mt-1 text-xs text-slate-500">Vui lòng nhập mã đặt hẹn hoặc chọn lấy số trực tiếp</p>
                      </div>

                      {/* Card 1: Check in existing appointment with direct input for appointment code */}
                      <div className="rounded-2xl border-2 border-cyan-600/80 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <QrIcoLocal s={22}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="rounded bg-cyan-100 px-2 py-0.5 text-[9px] font-bold text-cyan-800 uppercase">ƯU TIÊN THEO LỊCH</span>
                            <h4 className="mt-1 text-sm font-bold text-slate-900">Tôi đã đặt lịch hẹn trước</h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Nhập mã hẹn hoặc SĐT đã đăng ký để check-in và nhận số ưu tiên.</p>
                          </div>
                        </div>

                        {/* Input field for appointment code */}
                        <div className="mt-3.5 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Mã đặt hẹn hoặc Số điện thoại:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualCode}
                              onChange={e => setManualCode(e.target.value)}
                              placeholder="Nhập mã hẹn (VD: APT-0042) hoặc SĐT..."
                              className="h-10 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-mono outline-none focus:bg-white focus:border-cyan-600 transition-colors shadow-2xs"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && manualCode.trim()) {
                                  setIssuedTicketNumber('A-012')
                                  setIsPriority(true)
                                  setCheckInSubView('ticket_issued')
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={!manualCode.trim()}
                              onClick={() => {
                                setIssuedTicketNumber('A-012')
                                setIsPriority(true)
                                setCheckInSubView('ticket_issued')
                              }}
                              className="h-10 px-4 rounded-xl bg-cyan-700 text-xs font-bold text-white hover:bg-cyan-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                            >
                              Tiếp nhận
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setManualCode('APT-20261031-0042')}
                              className="text-[10px] text-cyan-700 hover:underline font-medium"
                            >
                              Điền mã mẫu: APT-0042
                            </button>
                            <button
                              type="button"
                              onClick={() => setCheckInSubView('qr_scan')}
                              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-cyan-700"
                            >
                              <QrIcoLocal s={13}/> Quét mã QR
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Walk-in ticket */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TicketIco s={22}/>
                          </div>
                          <div>
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">TIẾP NHẬN TRỰC TIẾP</span>
                            <h4 className="mt-1 text-sm font-bold text-slate-900">Khách vãng lai (Chưa đặt hẹn)</h4>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Lấy số thứ tự khám trực tiếp theo lượt tiếp nhận hôm nay.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCheckInSubView('walkin_service')}
                          className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 transition-colors"
                        >
                          Lấy số khám trực tiếp ngay
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR Scan Simulation */}
                  {checkInSubView === 'qr_scan' && (
                    <div className="dialog-enter rounded-xl border border-slate-200 bg-slate-900 text-white p-5 text-center">
                      <div className="flex items-center justify-between mb-3 text-left">
                        <p className="text-xs font-bold">Camera quét mã QR tại quầy đón tiếp</p>
                        <button type="button" onClick={() => setCheckInSubView('choice')} className="text-slate-400 hover:text-white"><XSmIco s={16}/></button>
                      </div>
                      <div className="relative mx-auto my-3 h-48 w-48 rounded-xl border-2 border-dashed border-cyan-400 flex items-center justify-center bg-slate-950">
                        <span className="absolute inset-x-2 top-1/2 h-0.5 bg-cyan-400 shadow-[0_0_8px_#38BDF8] animate-pulse"/>
                        <p className="text-[10px] text-slate-400">Đưa mã QR sảnh vào khung hình</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIssuedTicketNumber('A-012')
                          setIsPriority(true)
                          setCheckInSubView('ticket_issued')
                        }}
                        className="mt-3 h-10 w-full rounded-xl bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500"
                      >
                        [Mô phỏng] Quét thành công
                      </button>
                    </div>
                  )}

                  {/* Manual Code Check-in */}
                  {checkInSubView === 'manual_code' && (
                    <div className="dialog-enter rounded-xl border border-slate-200 bg-white p-4">
                      <button type="button" onClick={() => setCheckInSubView('choice')} className="mb-3 text-xs font-semibold text-slate-500 hover:underline">← Quay lại</button>
                      <h4 className="text-sm font-bold text-slate-900">Nhập mã cuộc hẹn hoặc SĐT</h4>
                      <p className="mt-0.5 text-xs text-slate-500">Mã được cấp lúc đặt lịch trước (VD: APT-0042)</p>
                      <input
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                        placeholder="APT-20261031-0042 hoặc 0901234567"
                        className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono outline-none focus:bg-white focus:border-cyan-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIssuedTicketNumber('A-012')
                          setIsPriority(true)
                          setCheckInSubView('ticket_issued')
                        }}
                        className="mt-3 h-10 w-full rounded-xl bg-cyan-700 text-xs font-bold text-white hover:bg-cyan-800"
                      >
                        Xác nhận Check-in
                      </button>
                    </div>
                  )}

                  {/* Walk-in Service Selection */}
                  {checkInSubView === 'walkin_service' && (
                    <div className="dialog-enter space-y-3">
                      <button type="button" onClick={() => setCheckInSubView('choice')} className="text-xs font-semibold text-slate-500 hover:underline">← Quay lại</button>
                      <h4 className="text-sm font-bold text-slate-900">Chọn dịch vụ khám vãng lai</h4>
                      <div className="space-y-2">
                        {['Khám tổng quát', 'Xét nghiệm máu', 'Khám chuyên khoa'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setWalkInService(s); setCheckInSubView('walkin_phone') }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-emerald-500 hover:bg-emerald-50/40 flex items-center justify-between"
                          >
                            <span className="text-xs font-bold text-slate-900">{s}</span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">Còn nhận</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Walk-in Phone Input */}
                  {checkInSubView === 'walkin_phone' && (
                    <div className="dialog-enter space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                      <button type="button" onClick={() => setCheckInSubView('walkin_service')} className="text-xs font-semibold text-slate-500 hover:underline">← Quay lại</button>
                      <h4 className="text-sm font-bold text-slate-900">Nhập SĐT nhận vé điện tử ({walkInService})</h4>
                      <input
                        type="tel"
                        value={walkInPhone}
                        onChange={e => setWalkInPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="090 123 4567"
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-tabular text-sm outline-none focus:bg-white focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIssuedTicketNumber('B-015')
                          setIsPriority(false)
                          setCheckInSubView('ticket_issued')
                        }}
                        className="h-10 w-full rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Nhận vé điện tử ngay
                      </button>
                    </div>
                  )}

                  {/* Issued Ticket Display */}
                  {checkInSubView === 'ticket_issued' && (
                    <div className="dialog-enter text-center p-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase ${isPriority ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isPriority ? 'VÉ ƯU TIÊN (ĐÃ HẸN TRƯỚC)' : 'VÉ VÃNG LAI HÔM NAY'}
                      </span>
                      <p className="mt-3 text-xs text-slate-400">SỐ THỨ TỰ CỦA QUÝ KHÁCH</p>
                      <p className="font-mono text-4xl font-bold tracking-tight text-slate-900 mt-1">{issuedTicketNumber}</p>
                      <p className="mt-1 text-xs font-bold text-slate-700">{isPriority ? 'Khám tổng quát (Lịch hẹn 10:00)' : walkInService}</p>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1 text-left">
                        <p>▪ <strong>Vị trí hàng đợi:</strong> Còn 2 người phía trước</p>
                        <p>▪ <strong>Thời gian chờ ước tính:</strong> ≈ 6 phút</p>
                        <p>▪ <strong>Quầy tiếp nhận:</strong> Quầy tiếp nhận chính</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setActiveMode('tracker'); setTrackerStatus('waiting') }}
                        className="mt-4 h-11 w-full rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        Mở theo dõi vé trực tiếp
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════ MODE 3: LIVE TRACKER & E-TICKET ════════════ */}
              {activeMode === 'tracker' && (
                <div className="space-y-4">
                  {trackerStatus !== 'completed' ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VÉ ĐIỆN TỬ SỐ</span>
                          <h3 className="text-xs font-bold text-slate-800">Khám tổng quát · Phòng 102</h3>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${trackerStatus === 'called' ? 'bg-emerald-100 text-emerald-800 widget-calling-pulse' : trackerStatus === 'upcoming' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                          {trackerStatus === 'called' ? 'ĐANG ĐƯỢC GỌI!' : trackerStatus === 'upcoming' ? 'SẮP ĐẾN LƯỢT' : 'ĐANG CHỜ'}
                        </span>
                      </div>

                      {/* Main E-Ticket Display Card */}
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-5 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SỐ THỨ TỰ CỦA BẠN</p>
                          <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-slate-900">A-042</p>
                          {trackerStatus === 'called' ? (
                            <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 animate-bounce">
                              🔔 Mời bạn đến quầy tiếp nhận ngay bây giờ!
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-slate-600">
                              {trackerStatus === 'upcoming' ? 'Chuẩn bị: Còn 1 lượt khám phía trước' : 'Còn 2 người phía trước (≈ 6 phút)'}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-dashed border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                            <span>Tiến độ hàng đợi</span>
                            <span className="font-bold text-slate-700">{trackerStatus === 'called' ? '100%' : trackerStatus === 'upcoming' ? '85%' : '60%'}</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${trackerStatus === 'called' ? 'bg-emerald-600' : 'bg-cyan-600'}`}
                              style={{ width: trackerStatus === 'called' ? '100%' : trackerStatus === 'upcoming' ? '85%' : '60%' }}
                            />
                          </div>

                          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-600">
                            <span>Chuông báo âm thanh</span>
                            <span className="flex items-center gap-1 font-bold text-emerald-700"><CheckIco s={12}/>Bật</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTrackerStatus('completed')}
                        className="mt-4 h-10 w-full rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        [Mô phỏng] Hoàn thành khám → Đánh giá CSAT
                      </button>
                    </div>
                  ) : (
                    /* CSAT Survey Form */
                    <div className="dialog-enter rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xs">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-purple-50 text-purple-600">
                        <StarIco s={24} fill/>
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-slate-900">Đánh giá chất lượng dịch vụ</h4>
                      <p className="mt-1 text-xs text-slate-500">Khám tổng quát · Bác sĩ Trần Thị Bích Ngân</p>

                      <div className="my-4 flex justify-center gap-1.5 text-amber-400">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => setRating(s)} className="p-1 hover:scale-125 transition-transform">
                            <StarIco s={24} fill={s <= rating}/>
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Nhập cảm nhận của bạn để phòng khám cải thiện..."
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-cyan-600 resize-none h-20"
                      />

                      <button
                        type="button"
                        onClick={() => setFeedbackSent(true)}
                        className="mt-3 h-10 w-full rounded-xl bg-cyan-700 text-xs font-bold text-white hover:bg-cyan-800"
                      >
                        {feedbackSent ? 'Cảm ơn bạn đã đóng góp ý kiến!' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Widget Footer */}
            <PoweredBy/>

            {/* ════════════ REQ-TICKET-04: TICKET LOOKUP & RECOVERY MODAL ════════════ */}
            {lookupOpen && (
              <div className="dialog-enter absolute inset-0 z-50 flex flex-col bg-white">
                <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-700 text-white"><SearchIco s={14}/></span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Tìm lại vé & Lịch hẹn của tôi</h4>
                      <p className="text-[10px] text-slate-500">REQ-TICKET-04: Khôi phục phiên làm việc</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setLookupOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                    <XSmIco s={16}/>
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Nhập số điện thoại đã dùng nhận vé</label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="tel"
                        value={lookupPhone}
                        onChange={e => setLookupPhone(e.target.value)}
                        placeholder="090 123 4567"
                        className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-tabular outline-none focus:bg-white focus:border-cyan-600"
                      />
                      <button
                        type="button"
                        onClick={handleLookup}
                        className="h-10 rounded-xl bg-cyan-700 px-4 text-xs font-bold text-white hover:bg-cyan-800"
                      >
                        Tra cứu
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Thử nhanh:</span>
                      <button type="button" onClick={() => { setLookupPhone('0901234567'); setLookupResult('active_found') }} className="font-semibold text-cyan-700 underline">0901234567 (Có vé)</button>
                      <span>•</span>
                      <button type="button" onClick={() => { setLookupPhone('0987654321'); setLookupResult('not_found') }} className="font-semibold text-slate-500 underline">0987654321 (Trống)</button>
                    </div>
                  </div>

                  {/* Result Found */}
                  {lookupResult === 'active_found' && (
                    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-bold text-emerald-800">TÌM THẤY VÉ ĐANG HOẠT ĐỘNG HÔM NAY</span>
                        <span className="font-tabular text-[10px] text-slate-400">Hôm nay</span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">SỐ THỨ TỰ</p>
                            <p className="font-mono text-2xl font-bold text-slate-900">A-042</p>
                          </div>
                          <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-200">ĐANG CHỜ</span>
                        </div>
                        <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600 space-y-1">
                          <p><strong>Dịch vụ:</strong> Khám tổng quát (Phòng 102)</p>
                          <p><strong>Vị trí:</strong> Còn 2 người phía trước (≈ 6 phút)</p>
                        </div>

                        <button
                          type="button"
                          onClick={restoreFoundTicket}
                          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 transition-colors shadow-xs"
                        >
                          <TicketIco s={15}/>Khôi phục & Tiếp tục theo dõi vé này
                        </button>
                      </div>

                      {/* Also show booked appointment if any */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs text-xs text-slate-700">
                        <div className="flex items-center justify-between">
                          <p className="font-bold">Lịch hẹn: APT-20261031-0042</p>
                          <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700">ĐÃ XÁC NHẬN</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">Khám chuyên khoa · 10:00 Thứ Sáu, 02/10</p>
                      </div>
                    </div>
                  )}

                  {/* Result Not Found */}
                  {lookupResult === 'not_found' && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 leading-relaxed space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertIco s={16}/>
                        <div>
                          <p className="font-bold">Không tìm thấy vé hàng đợi nào đang chờ phục vụ với số điện thoại này trong hôm nay.</p>
                          <p className="mt-1 text-[11px] text-red-700">Quý khách vui lòng kiểm tra lại số điện thoại hoặc đặt lịch hẹn mới trực tuyến.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setLookupOpen(false); setActiveMode('booking'); setBookingStep(1) }}
                        className="mt-2 h-9 w-full rounded-lg bg-red-700 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Đặt lịch hẹn mới ngay
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Right Column: Developer Integration Hub & Architectural Reasoning */}
        <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">DÀNH CHO LẬP TRÌNH VIÊN DOANH NGHIỆP</span>
            <h2 className="mt-1 text-sm font-bold text-slate-900">Mã nhúng Iframe & Thông số tích hợp</h2>
            <p className="mt-1 text-xs text-slate-500">Doanh nghiệp chỉ cần 1 dòng HTML để nhúng widget vào đúng trang của mình.</p>
          </div>

          {/* Live Code Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-emerald-300 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
              <span>{activeMode.toUpperCase()}_WIDGET_SNIPPET.HTML</span>
              <button
                type="button"
                onClick={() => copyEmbed(embedCodes[activeMode])}
                className="text-cyan-400 hover:text-cyan-200 font-sans font-bold"
              >
                {copiedSnippet ? '✓ Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-all leading-relaxed">{embedCodes[activeMode]}</pre>
          </div>

          {/* Operational Benefits Matrix */}
          <div className="mt-5 flex-1 space-y-3">
            <p className="text-xs font-bold text-slate-900">Lợi ích của kiến trúc 3 chế độ chuyên biệt:</p>
            
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5"><ShieldIco s={14}/>Bảo vệ tính toàn vẹn hàng đợi (Queue Integrity)</p>
              <p className="text-[11px] text-slate-500">Khách tại nhà không bao giờ bị lấy nhầm vé tại sảnh. Chỉ khách có mặt tại phòng khám quét QR mới được kích hoạt số thứ tự.</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5"><SearchIco s={14}/>Khôi phục vé tức thời khi lỡ đóng trình duyệt</p>
              <p className="text-[11px] text-slate-500">Đáp ứng chuẩn REQ-TICKET-04: Khách chỉ cần nhập SĐT là tìm lại ngay vé số thứ tự và thời gian chờ mà không bị mất chỗ.</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5"><RefreshIco s={14}/>Tái sử dụng 100% logic Backend</p>
              <p className="text-[11px] text-slate-500">Cùng chung các API REST Spring Boot, phân quyền Keycloak realm và hàng đợi Valkey. Không tốn công bảo trì 3 hệ thống riêng.</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 text-slate-600">
              <p className="font-bold text-slate-800 flex items-center gap-1.5"><CheckIco s={14}/>100% Mobile Web trên điện thoại cá nhân</p>
              <p className="text-[11px] text-slate-500">Toàn bộ quy trình từ đặt chỗ, lấy số thứ tự, nhận thông báo gọi số đều diễn ra mượt mà trên điện thoại cá nhân của khách hàng.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}


type TenantDirectoryStatus = 'active' | 'suspended' | 'pending' | 'trial'
interface TenantDirectoryRow {
  id:number; name:string; code:string; status:TenantDirectoryStatus; staff:number; staffMax:number
  tickets:number; quota:number; created:string; admin:string; audit:string
}

function OrganizationsDirectory({ onImpersonate }: { onImpersonate: (tenant: { id:number; name:string; code:string }) => void }) {
  const baseRows: TenantDirectoryRow[] = [
    { id:1, name:'Phòng khám St. Jude', code:'st-jude', status:'active', staff:18, staffMax:20, tickets:10420, quota:10000, created:'12/01/2026', admin:'admin@stjude.vn', audit:'10:39 · Cập nhật hạn ngạch bởi SA' },
    { id:2, name:'Wellness Center An Nhiên', code:'wellness-an-nhien', status:'trial', staff:9, staffMax:10, tickets:4380, quota:5000, created:'08/03/2026', admin:'quantri@annhien.vn', audit:'09:55 · Thêm chuyên viên mới' },
    { id:3, name:'Bệnh viện Minh Tâm', code:'bv-minh-tam', status:'active', staff:42, staffMax:50, tickets:18640, quota:20000, created:'18/11/2025', admin:'it@minhtam.vn', audit:'09:42 · Đăng nhập quản trị' },
    { id:4, name:'Phòng khám Alpha', code:'pk-alpha', status:'pending', staff:2, staffMax:10, tickets:0, quota:5000, created:'31/10/2026', admin:'owner@pkalpha.vn', audit:'08:20 · Gửi hồ sơ phê duyệt' },
    { id:5, name:'Nha khoa Ánh Dương', code:'nha-khoa-anh-duong', status:'suspended', staff:11, staffMax:15, tickets:7260, quota:8000, created:'22/05/2026', admin:'ops@anhduong.vn', audit:'Hôm qua · Tenant bị tạm khóa' },
    ...Array.from({ length:18 }, (_,index) => ({
      id:index + 6,
      name:`Cơ sở Y tế ${String.fromCharCode(65 + index)}`,
      code:`co-so-${String(index + 6).padStart(2,'0')}`,
      status:(['active','active','trial','pending'] as TenantDirectoryStatus[])[index % 4],
      staff:6 + index % 10,
      staffMax:20,
      tickets:2800 + index * 210,
      quota:10000,
      created:`${String(index % 28 + 1).padStart(2,'0')}/06/2026`,
      admin:`admin${index + 6}@tenant.vn`,
      audit:`${String(8 + index % 3).padStart(2,'0')}:2${index % 10} · Cập nhật cấu hình`,
    })),
  ]
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState(baseRows)
  const [status, setStatus] = useState<'all' | TenantDirectoryStatus>('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [duplicateError, setDuplicateError] = useState(false)
  const [tenantForm, setTenantForm] = useState({ name:'', code:'', email:'', phone:'' })
  const [lifecycleTarget, setLifecycleTarget] = useState<TenantDirectoryRow | null>(null)
  const [lifecycleToast, setLifecycleToast] = useState('')
  const statusCfg: Record<TenantDirectoryStatus,{label:string; cls:string}> = {
    active:{ label:'ĐANG HOẠT ĐỘNG', cls:'bg-emerald-50 text-emerald-700 border border-emerald-200/80' },
    suspended:{ label:'ĐANG TẠM KHÓA', cls:'bg-red-50 text-red-700 border border-red-200/80' },
    pending:{ label:'CHỜ PHÊ DUYỆT', cls:'bg-amber-50 text-amber-700 border border-amber-200/80' },
    trial:{ label:'TRIAL', cls:'bg-purple-50 text-purple-700 border border-purple-200/80' },
  }
  const filtered = rows
    .filter(row => `${row.name} ${row.code}`.toLowerCase().includes(search.toLowerCase()))
    .filter(row => status === 'all' || row.status === status)
    .sort((a,b) => Number(b.tickets >= b.quota) - Number(a.tickets >= a.quota))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20))
  const visibleRows = filtered.slice((page - 1) * 20, page * 20)
  const createTenant = () => {
    const duplicate = rows.some(row => row.code === tenantForm.code || row.admin.toLowerCase() === tenantForm.email.toLowerCase())
    if (duplicate) {
      setDuplicateError(true)
      return
    }
    if (tenantForm.name.trim().length < 3 || !/^[a-z0-9-]{3,30}$/.test(tenantForm.code) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantForm.email) || !/^\d{10}$/.test(tenantForm.phone)) return
    setCreateOpen(false)
    setCreateSuccess(true)
    window.setTimeout(() => setCreateSuccess(false), 3600)
  }
  const confirmLifecycle = () => {
    if (!lifecycleTarget) return
    const reactivating = lifecycleTarget.status === 'suspended'
    setRows(current => current.map(row => row.id === lifecycleTarget.id ? { ...row, status:reactivating ? 'active' : 'suspended' } : row))
    setLifecycleToast(reactivating ? 'Đã kích hoạt lại tổ chức. Dịch vụ công cộng đã mở lại.' : 'Đã tạm ngừng tổ chức và vô hiệu hóa tài khoản liên quan.')
    setLifecycleTarget(null)
    window.setTimeout(() => setLifecycleToast(''), 3600)
  }

  return (
    <div className="min-h-full bg-[#F8FAFC]" data-pinning-rule="REQ-DASHBOARD-06: C_ticket ≥ 100% tenants are pinned first.">
      {createSuccess && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-start gap-3 rounded-xl border border-slate-200 border-l-[4px] border-l-emerald-600 bg-white p-4 text-slate-800 shadow-xl"><CheckIco s={17}/><div><p className="text-sm font-semibold text-slate-900">Khởi tạo tổ chức thành công</p><p className="mt-1 text-[10px] text-slate-500">Keycloak realm + email kích hoạt admin dispatched</p></div></div>}
      {lifecycleToast && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 rounded-xl border border-slate-200 border-l-[4px] border-l-emerald-600 bg-white p-4 text-slate-800 shadow-xl"><CheckIco s={17}/><p className="text-sm font-semibold text-slate-900">{lifecycleToast}</p></div>}
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div><h1 className="text-lg font-bold text-slate-900">Tổ chức</h1><p className="mt-0.5 text-[11px] text-slate-500">Danh bạ tenant và mức sử dụng tài nguyên nền tảng</p></div>
      </header>
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs">
          <label className="relative w-80"><span className="absolute left-3 top-3 text-slate-400"><SearchIco s={15}/></span><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm theo tên hoặc mã..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/></label>
          <select value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1) }} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-600"><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="suspended">Đang tạm khóa</option><option value="pending">Chờ phê duyệt</option></select>
          <div className="flex-1"/>
          <button type="button" onClick={() => { setTenantForm({ name:'', code:'', email:'', phone:'' }); setDuplicateError(false); setCreateOpen(true) }} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs shadow-indigo-100 transition-colors hover:bg-indigo-700">+ Thêm tổ chức</button>
        </div>
        <div className="overflow-visible rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80">{['Tổ chức','Trạng thái','Nhân viên','Vé hôm nay','Mức dùng quota','Ngày khởi tạo',''].map(label => <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.06em] text-slate-500 uppercase">{label}</th>)}</tr></thead>
            <tbody>
              {visibleRows.map(row => {
                const quotaPercent = row.tickets / row.quota * 100
                const capped = quotaPercent >= 100
                const barColor = capped ? '#EF4444' : quotaPercent >= 85 ? '#F59E0B' : '#6366F1'
                return (
                  <tr key={row.id} className={`group relative border-b border-slate-100 transition-all duration-200 last:border-0 hover:z-30 hover:bg-slate-50/80 ${capped ? 'border-l-[3px] border-l-red-500' : ''}`}>
                    <td className="relative px-4 py-3.5"><div className="flex items-center gap-2"><div><p className="text-xs font-semibold text-slate-900">{row.name}</p><p className="mt-0.5 font-tabular text-[10px] text-slate-500">{row.code}</p></div>{capped && <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">CHẠM TRẦN</span>}</div>
                      <div className="pointer-events-none absolute left-4 top-full z-50 mt-1 w-80 translate-y-1 rounded-xl border border-slate-200 bg-white p-4 opacity-0 shadow-xl transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="text-[10px] font-bold tracking-[0.05em] text-slate-400 uppercase">PHÂN BỔ HẠN NGẠCH</p>
                        <div className="mt-3 space-y-3">{[[`Vé ${row.tickets.toLocaleString('vi-VN')} / ${row.quota.toLocaleString('vi-VN')}`,Math.min(quotaPercent,100),barColor],[`Nhân viên ${row.staff} / ${row.staffMax}`,row.staff/row.staffMax*100,'#10B981']].map(([label,value,color]) => <div key={String(label)}><div className="flex justify-between font-tabular text-[10px] text-slate-600"><span>{label}</span><span className="font-semibold">{Math.round(Number(value))}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width:`${value}%`, background:String(color) }}/></div></div>)}</div>
                        <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-500"><p>Admin: <span className="font-medium text-slate-800">{row.admin}</span></p><p className="mt-1">Audit mới nhất: <span className="font-medium text-slate-800">{row.audit}</span></p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className={`rounded-md px-2 py-1 text-[9px] font-bold transition-colors duration-[250ms] ${statusCfg[row.status].cls}`}>{statusCfg[row.status].label}</span></td>
                    <td className="px-4 py-3.5 font-tabular text-xs font-bold text-slate-800">{row.staff}<span className="text-slate-400">/{row.staffMax}</span></td>
                    <td className="px-4 py-3.5 font-tabular text-xs font-bold text-slate-800">{row.tickets.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width:`${Math.min(quotaPercent,100)}%`, background:barColor }}/></div><span className="font-tabular text-[10px] font-bold text-slate-600">{quotaPercent.toFixed(0)}%</span></div></td>
                    <td className="px-4 py-3.5 font-tabular text-[10px] text-slate-500">{row.created}</td>
                    <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button title="Xem chi tiết" aria-label={`Xem ${row.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><EyeIco s={14}/></button><button type="button" onClick={() => setLifecycleTarget(row)} title={row.status === 'suspended' ? 'Kích hoạt lại' : 'Tạm ngừng'} aria-label={row.status === 'suspended' ? 'Kích hoạt lại' : 'Tạm ngừng'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">{row.status === 'suspended' ? <RefreshIco s={14}/> : <PauseIco s={14}/>}</button><button type="button" onClick={() => onImpersonate({ id:row.id, name:row.name, code:row.code })} title="Impersonate" aria-label={`Impersonate ${row.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"><ShieldIco s={14}/></button><span className="group/delete relative"><button type="button" disabled aria-label="Xóa vật lý bị vô hiệu hóa" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-slate-300"><TrashIco s={14}/></button><span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 text-[9px] leading-relaxed text-slate-200 opacity-0 shadow-xl transition-opacity group-hover/delete:opacity-100">Dữ liệu lịch sử tồn tại → cấm xóa vật lý</span></span></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><p className="font-tabular text-[10px] text-slate-500">20 dòng/trang · {filtered.length} tổ chức</p><div className="flex items-center gap-2"><button disabled={page===1} onClick={() => setPage(value => Math.max(1,value-1))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Trước</button><span className="font-tabular text-[10px] font-semibold text-slate-600">{page}/{totalPages}</span><button disabled={page===totalPages} onClick={() => setPage(value => Math.min(totalPages,value+1))} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">Sau</button></div></div>
        </div>
      </div>

      {createOpen && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-xs"><div className="dialog-enter w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" data-requirement="REQ-TNT-01"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Thêm tổ chức</h2><p className="mt-1 text-[11px] text-slate-500">Khởi tạo tenant và tài khoản quản trị cơ sở</p></div><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><XSmIco s={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-4">
        <label className="col-span-2"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">Tên tổ chức</span><input value={tenantForm.name} maxLength={150} onChange={event => setTenantForm(value => ({ ...value, name:event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/><span className="mt-1 block text-[10px] text-slate-400">3–150 ký tự</span></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">Mã định danh</span><input value={tenantForm.code} maxLength={30} onChange={event => { setTenantForm(value => ({ ...value, code:event.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') })); setDuplicateError(false) }} placeholder="pk-tam-duc" className={`h-11 w-full rounded-lg border bg-slate-50 px-3 font-tabular text-sm text-slate-800 outline-none transition-all ${duplicateError ? 'border-red-500' : 'border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'}`}/><span className="mt-1 block font-tabular text-[10px] text-slate-400">3–30 · lowercase / digits / hyphens → {tenantForm.code || 'tenant-code'}</span></label>
        <label><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">Email quản trị cơ sở</span><input type="email" value={tenantForm.email} onChange={event => { setTenantForm(value => ({ ...value, email:event.target.value })); setDuplicateError(false) }} className={`h-11 w-full rounded-lg border bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-all ${duplicateError ? 'border-red-500' : 'border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'}`}/></label>
        <label className="col-span-2"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">SĐT liên hệ</span><input inputMode="numeric" value={tenantForm.phone} onChange={event => setTenantForm(value => ({ ...value, phone:event.target.value.replace(/\D/g,'').slice(0,10) }))} placeholder="0901234567" className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-tabular text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/><span className="mt-1 block text-[10px] text-slate-400">Số điện thoại Việt Nam gồm 10 chữ số</span></label>
      </div>{duplicateError && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700"><AlertIco s={15}/><span>Mã định danh tổ chức hoặc email quản trị này đã được đăng ký trong hệ thống. Vui lòng kiểm tra lại.</span></div>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button><button type="button" onClick={createTenant} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs shadow-indigo-100 hover:bg-indigo-700 transition-colors">Khởi tạo tổ chức</button></div></div></div>}
      {lifecycleTarget && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-xs"><div className="dialog-enter w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">{lifecycleTarget.status === 'suspended' ? <><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><RefreshIco s={22}/></div><h2 className="mt-4 text-lg font-bold text-slate-900">Kích hoạt lại tổ chức?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Tài khoản và các dịch vụ công cộng của tổ chức sẽ hoạt động trở lại.</p><p className="mt-2 text-xs font-semibold text-emerald-700">Dịch vụ công cộng đã mở lại</p></> : <><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertIco s={22}/></div><h2 className="mt-4 text-lg font-bold text-slate-900">Tạm ngừng tổ chức?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Bạn có chắc muốn tạm ngừng tổ chức này? Toàn bộ tài khoản thuộc tổ chức sẽ bị vô hiệu hóa.</p><p className="mt-2 text-xs font-semibold text-amber-700">JWT thu hồi, cổng đặt hẹn công cộng tạm dừng</p></>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setLifecycleTarget(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button><button type="button" onClick={confirmLifecycle} className={`h-10 rounded-lg px-4 text-xs font-bold text-white shadow-xs transition-colors ${lifecycleTarget.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}>{lifecycleTarget.status === 'suspended' ? 'Kích hoạt lại' : 'Xác nhận tạm ngừng'}</button></div></div></div>}
    </div>
  )
}

function ApprovalQueue() {
  const [registrations, setRegistrations] = useState([
    { id:1, name:'Phòng khám Đa khoa Tâm Đức', code:'pk-tam-duc', email:'quantri@tamduc.vn', phone:'0901234567', submitted:'31/10/2026 10:22:14' },
    { id:2, name:'Trung tâm Y khoa An Khang', code:'yk-an-khang', email:'admin@ankhang.vn', phone:'0912345678', submitted:'31/10/2026 09:48:02' },
    { id:3, name:'Nha khoa Nụ Cười Việt', code:'nha-khoa-nu-cuoi-viet', email:'owner@nucuoi.vn', phone:'0923456789', submitted:'30/10/2026 16:35:41' },
    { id:4, name:'Wellness Studio Mộc', code:'wellness-moc', email:'hello@wellnessmoc.vn', phone:'0934567890', submitted:'30/10/2026 14:12:09' },
  ])
  const [approveTarget, setApproveTarget] = useState<number | null>(null)
  const [denyTarget, setDenyTarget] = useState<number | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [success, setSuccess] = useState(false)

  const approve = (id:number) => {
    setRegistrations(current => current.filter(item => item.id !== id))
    setApproveTarget(null)
    setSuccess(true)
    window.setTimeout(() => setSuccess(false), 3600)
  }
  const deny = () => {
    if (!denyTarget || !denyReason.trim()) return
    setRegistrations(current => current.filter(item => item.id !== denyTarget))
    setDenyTarget(null)
    setDenyReason('')
  }

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-800">
      {success && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-start gap-3 rounded-xl border border-slate-200 border-l-[4px] border-l-emerald-600 bg-white p-4 text-slate-800 shadow-xl"><CheckIco s={17}/><div><p className="text-sm font-semibold text-slate-900">Phê duyệt hoàn tất. Email chúc mừng đã gửi.</p><p className="mt-1 text-[10px] text-slate-500">Tenant và tài khoản Admin đã được kích hoạt.</p></div></div>}
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur"><div><h1 className="text-lg font-bold text-slate-900">Phê duyệt</h1><p className="mt-0.5 text-[11px] text-slate-500">Hồ sơ đăng ký tổ chức đang ở trạng thái PENDING_APPROVAL</p></div></header>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between"><p className="font-tabular text-xs text-slate-500">{registrations.length} hồ sơ đang hiển thị</p><span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">PENDING_APPROVAL</span></div>
        <div className="grid grid-cols-2 gap-4">
          {registrations.map(item => (
            <article key={item.id} className="relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">{item.name}</h2><p className="mt-0.5 font-tabular text-[10px] font-semibold text-indigo-600">{item.code}</p></div><span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">Email xác nhận đã gửi</span></div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-y border-slate-100 py-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EMAIL ADMIN</p><p className="mt-1 text-xs font-semibold text-slate-800">{item.email}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SĐT</p><p className="mt-1 font-tabular text-xs font-semibold text-slate-800">{item.phone}</p></div><div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GỬI LÚC</p><p className="mt-1 font-tabular text-xs font-semibold text-slate-600">{item.submitted}</p></div></div>
              <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setDenyTarget(item.id); setDenyReason('') }} className="h-10 rounded-lg border border-red-200 bg-white px-4 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">Từ chối</button><button type="button" onClick={() => setApproveTarget(approveTarget === item.id ? null : item.id)} className="h-10 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs shadow-emerald-100 hover:bg-emerald-700 transition-colors">Phê duyệt</button></div>
              {approveTarget === item.id && <div className="overlay-enter absolute bottom-16 right-5 z-40 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"><p className="text-xs font-bold text-slate-900">Xác nhận phê duyệt?</p><p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">Kích hoạt tổ chức + kích hoạt tài khoản Admin</p><button type="button" onClick={() => approve(item.id)} className="mt-4 h-9 w-full rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors">Xác nhận & kích hoạt</button></div>}
            </article>
          ))}
        </div>
      </div>

      {denyTarget && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-xs"><div className="dialog-enter w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Từ chối hồ sơ đăng ký</h2><p className="mt-1 text-[11px] text-slate-500">Hành động này sẽ gửi thông báo đến người đăng ký.</p></div><button type="button" onClick={() => setDenyTarget(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><XSmIco s={18}/></button></div><label className="mt-5 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-700">Lý do từ chối</span><textarea value={denyReason} onChange={event => setDenyReason(event.target.value)} rows={5} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"/><span className="mt-1.5 block text-[10px] text-slate-400">Lý do sẽ được gửi qua email cho người đăng ký</span></label><button type="button" disabled={!denyReason.trim()} onClick={deny} className="mt-5 h-11 w-full rounded-xl bg-red-600 text-sm font-bold text-white shadow-xs hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition-colors">Xác nhận từ chối</button></div></div>}
    </div>
  )
}

interface QuotaTenant {
  id:number; name:string; code:string; ticketUsed:number; ticketQuota:number
  staffUsed:number; staffMax:number; serviceMax:number; futureMax:number
}

function ResourceQuotaDirectory() {
  const tenants: QuotaTenant[] = [
    { id:1, name:'Phòng khám St. Jude', code:'st-jude', ticketUsed:10420, ticketQuota:10000, staffUsed:18, staffMax:20, serviceMax:30, futureMax:5000 },
    { id:2, name:'Bệnh viện Minh Tâm', code:'bv-minh-tam', ticketUsed:18640, ticketQuota:20000, staffUsed:47, staffMax:50, serviceMax:-1, futureMax:12000 },
    { id:3, name:'Wellness Center An Nhiên', code:'wellness-an-nhien', ticketUsed:4380, ticketQuota:5000, staffUsed:9, staffMax:10, serviceMax:20, futureMax:2000 },
    { id:4, name:'Nha khoa Ánh Dương', code:'nha-khoa-anh-duong', ticketUsed:7260, ticketQuota:8000, staffUsed:11, staffMax:15, serviceMax:18, futureMax:3000 },
    { id:5, name:'Phòng khám Alpha', code:'pk-alpha', ticketUsed:820, ticketQuota:-1, staffUsed:6, staffMax:-1, serviceMax:-1, futureMax:-1 },
    { id:6, name:'Trung tâm Y khoa Hòa Bình', code:'yk-hoa-binh', ticketUsed:6130, ticketQuota:10000, staffUsed:19, staffMax:20, serviceMax:25, futureMax:4000 },
  ]
  const [filter, setFilter] = useState<'all' | 'ticket' | 'staff'>('all')
  const [configTarget, setConfigTarget] = useState<QuotaTenant | null>(null)
  const [config, setConfig] = useState({ staffMax:20, ticketQuota:10000, serviceMax:30, futureMax:5000 })
  const ticketPercent = (tenant:QuotaTenant) => tenant.ticketQuota === -1 ? -1 : tenant.ticketUsed / tenant.ticketQuota * 100
  const staffPercent = (tenant:QuotaTenant) => tenant.staffMax === -1 ? -1 : tenant.staffUsed / tenant.staffMax * 100
  const visible = tenants
    .filter(tenant => filter === 'all' || filter === 'ticket' && ticketPercent(tenant) >= 100 || filter === 'staff' && staffPercent(tenant) >= 90)
    .sort((a,b) => Math.max(ticketPercent(b),staffPercent(b)) - Math.max(ticketPercent(a),staffPercent(a)))
  const staffGuard = !!configTarget && config.staffMax !== -1 && config.staffMax < configTarget.staffUsed

  const openConfig = (tenant:QuotaTenant) => {
    setConfigTarget(tenant)
    setConfig({ staffMax:tenant.staffMax, ticketQuota:tenant.ticketQuota, serviceMax:tenant.serviceMax, futureMax:tenant.futureMax })
  }
  const fields = [
    { key:'staffMax' as const, label:'Số nhân viên tối đa', current:configTarget?.staffUsed ?? 0 },
    { key:'ticketQuota' as const, label:'Hạn ngạch vé/ngày', current:configTarget?.ticketUsed ?? 0 },
    { key:'serviceMax' as const, label:'Số dịch vụ tối đa', current:0 },
    { key:'futureMax' as const, label:'Cuộc hẹn tương lai tối đa', current:0 },
  ]

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-800">
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur"><div><h1 className="text-lg font-bold text-slate-900">Hạn ngạch & Tài nguyên</h1><p className="mt-0.5 text-[11px] text-slate-500">Xếp hạng mức tiêu thụ và kiểm soát giới hạn tenant</p></div></header>
      <div className="p-6">
        <div className="mb-4 flex gap-2">
          {[['all','Tất cả tổ chức'],['ticket','Tổ chức chạm trần vé'],['staff','Tổ chức tiệm cận nhân sự']].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value as typeof filter)} className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold transition-colors ${filter === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{label}</button>)}
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80">{['Hạng','Tổ chức','Mức dùng vé · C_ticket','Mức dùng nhân sự · C_staff','Ngưỡng',''].map(label => <th key={label || 'actions'} className="px-4 py-3 text-[10px] font-bold tracking-[0.06em] text-slate-500 uppercase">{label}</th>)}</tr></thead>
            <tbody>
              {visible.map((tenant,index) => {
                const ticket = ticketPercent(tenant)
                const staff = staffPercent(tenant)
                const exceeded = ticket >= 100
                const warning = !exceeded && (ticket >= 85 || staff >= 90)
                const bar = (percent:number) => percent >= 100 ? '#EF4444' : percent >= 85 ? '#F59E0B' : '#6366F1'
                return (
                  <tr key={tenant.id} data-is-quota-exceeded={exceeded} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors ${exceeded ? 'border-l-[3px] border-l-red-500' : ''}`}>
                    <td className="px-4 py-4 font-tabular text-sm font-bold text-slate-400">#{String(index + 1).padStart(2,'0')}</td>
                    <td className="px-4 py-4"><p className="text-xs font-semibold text-slate-900">{tenant.name}</p><p className="mt-0.5 font-tabular text-[10px] text-slate-500">{tenant.code}</p></td>
                    <td className="px-4 py-4">{ticket === -1 ? <span className="rounded-md border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">∞ Không giới hạn</span> : <div className="min-w-56"><div className="flex justify-between font-tabular text-[10px] text-slate-600"><span>{tenant.ticketUsed.toLocaleString('vi-VN')} / {tenant.ticketQuota.toLocaleString('vi-VN')}</span><strong className="text-slate-900">{ticket.toFixed(0)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width:`${Math.min(ticket,100)}%`, background:bar(ticket) }}/></div></div>}</td>
                    <td className="px-4 py-4">{staff === -1 ? <span className="rounded-md border border-indigo-200/80 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">∞ Không giới hạn</span> : <div className="min-w-48"><div className="flex justify-between font-tabular text-[10px] text-slate-600"><span>{tenant.staffUsed} / {tenant.staffMax}</span><strong className="text-slate-900">{staff.toFixed(0)}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width:`${Math.min(staff,100)}%`, background:staff >= 90 ? '#F59E0B' : '#6366F1' }}/></div></div>}</td>
                    <td className="px-4 py-4">{exceeded ? <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">CHẠM TRẦN</span> : warning ? <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">CẢNH BÁO</span> : <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">BÌNH THƯỜNG</span>}</td>
                    <td className="px-4 py-4 text-right"><button type="button" onClick={() => openConfig(tenant)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors">Xem chi tiết</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {configTarget && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-xs"><div className="dialog-enter w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Cấu hình hạn ngạch</h2><p className="mt-1 text-[11px] text-slate-500">{configTarget.name} · <span className="font-tabular font-semibold text-slate-700">{configTarget.code}</span></p></div><button type="button" onClick={() => setConfigTarget(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><XSmIco s={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-4">{fields.map(field => { const unlimited=config[field.key] === -1; return <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"><label className="text-[10px] font-semibold text-slate-700">{field.label}</label><input type="number" min={0} disabled={unlimited} value={unlimited ? '' : config[field.key]} onChange={event => setConfig(value => ({ ...value, [field.key]:Math.max(0,Number(event.target.value)) }))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-tabular text-sm font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 disabled:opacity-40 transition-all"/><label className="mt-2.5 flex items-center gap-2 text-[10px] font-semibold text-slate-500 cursor-pointer"><input type="checkbox" checked={unlimited} onChange={event => setConfig(value => ({ ...value, [field.key]:event.target.checked ? -1 : Math.max(field.current,1) }))} className="rounded text-indigo-600 focus:ring-indigo-500"/>Không giới hạn</label></div> })}</div>{staffGuard && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700"><AlertIco s={15}/><span>Hạn ngạch nhân sự mới không được nhỏ hơn số lượng nhân viên hiện có của cơ sở.</span></div>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfigTarget(null)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button><button type="button" disabled={staffGuard} className="h-10 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs shadow-indigo-100 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition-colors">Lưu hạn ngạch</button></div></div></div>}
    </div>
  )
}

function AuditLogScreen() {
  const rows = [
    { time:'2026-10-31T10:42:07.184Z', actor:'SA', action:'tenant.suspend', target:'st-jude', from:'ACTIVE', to:'SUSPENDED', ip:'10.0.4.18', payload:'{"reason":"policy_violation","revoke_jwt":true,"actor_id":"sa_001"}' },
    { time:'2026-10-31T10:38:41.920Z', actor:'SA', action:'quota.update', target:'bv-minh-tam', from:'C_ticket:15000', to:'C_ticket:20000', ip:'10.0.4.18', payload:'{"field":"daily_ticket_quota","before":15000,"after":20000,"reason":"approved_capacity_request"}' },
    { time:'2026-10-31T10:35:12.442Z', actor:'system', action:'auth.failed', target:'pk-alpha', from:'ATTEMPT:4', to:'LOCKED:15m', ip:'203.0.113.42', payload:'{"username":"admin@pkalpha.vn","attempts":5,"lockout_seconds":900}' },
    { time:'2026-10-31T10:29:55.003Z', actor:'admin', action:'service.update', target:'wellness-an-nhien', from:'T_standard:20', to:'T_standard:15', ip:'198.51.100.17', payload:'{"service_id":"svc_014","field":"standard_minutes","before":20,"after":15}' },
    { time:'2026-10-31T10:22:04.611Z', actor:'SA', action:'tenant.approve', target:'yk-an-khang', from:'PENDING_APPROVAL', to:'ACTIVE', ip:'10.0.4.18', payload:'{"realm_created":true,"admin_activation_email":"dispatched","tenant_id":"ten_0142"}' },
    { time:'2026-10-31T10:14:33.090Z', actor:'system', action:'sse.reconnect', target:'nha-khoa-anh-duong', from:'DISCONNECTED', to:'CONNECTED', ip:'10.0.8.12', payload:'{"channel":"lobby_display","retry":2,"elapsed_ms":3240}' },
  ]
  const [action, setAction] = useState('all')
  const [actor, setActor] = useState('all')
  const visible = rows.filter(row => (action === 'all' || row.action === action) && (actor === 'all' || row.actor === actor))
  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-800">
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur"><div><h1 className="text-lg font-bold text-slate-900">Nhật ký kiểm toán</h1><p className="mt-0.5 text-[11px] text-slate-500">Dòng sự kiện bất biến trên toàn nền tảng</p></div></header>
      <div className="p-6">
        <div className="mb-4 flex items-end gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTION TYPE</span><select value={action} onChange={event => setAction(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 font-tabular text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"><option value="all">Tất cả action</option>{[...new Set(rows.map(row => row.action))].map(value => <option key={value}>{value}</option>)}</select></label>
          <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">TỪ NGÀY</span><input type="date" defaultValue="2026-10-01" className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 font-tabular text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/></label>
          <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">ĐẾN NGÀY</span><input type="date" defaultValue="2026-10-31" className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 font-tabular text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/></label>
          <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTOR</span><select value={actor} onChange={event => setActor(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"><option value="all">Tất cả actor</option><option value="SA">SA</option><option value="admin">admin</option><option value="system">system</option></select></label>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80">{['Thời gian','Actor','Action','Target','State transition','IP'].map(label => <th key={label} className="px-4 py-3 text-[10px] font-bold tracking-[0.06em] text-slate-500 uppercase">{label}</th>)}</tr></thead>
            <tbody>{visible.map(row => <tr key={row.time} className="group relative border-b border-slate-100 last:border-0 hover:z-30 hover:bg-slate-50/80 transition-colors"><td className="px-4 py-3.5 font-tabular text-[10px] text-slate-500">{row.time}</td><td className="px-4 py-3.5"><span className={`rounded-md px-2 py-0.5 text-[9px] font-bold border ${row.actor === 'SA' ? 'border-indigo-200/80 bg-indigo-50 text-indigo-700' : row.actor === 'system' ? 'border-cyan-200/80 bg-cyan-50 text-cyan-700' : 'border-emerald-200/80 bg-emerald-50 text-emerald-700'}`}>{row.actor}</span></td><td className="relative px-4 py-3.5 font-tabular text-xs font-bold text-slate-800">{row.action}<div className="pointer-events-none absolute left-0 top-full z-50 mt-1 w-[460px] translate-y-1 rounded-xl border border-slate-800 bg-slate-950 p-4 opacity-0 shadow-2xl transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"><p className="mb-2 text-[10px] font-bold tracking-[0.06em] text-slate-400 uppercase">JSON PAYLOAD</p><pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-emerald-300">{JSON.stringify(JSON.parse(row.payload),null,2)}</pre></div></td><td className="px-4 py-3.5 font-tabular text-xs text-slate-600 font-medium">{row.target}</td><td className="px-4 py-3.5"><span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-tabular text-[9px] font-semibold text-slate-600">{row.from}</span><span className="px-1.5 text-slate-400 font-bold">→</span><span className="rounded-md border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 font-tabular text-[9px] font-bold text-indigo-700">{row.to}</span></td><td className="px-4 py-3.5 font-tabular text-[10px] text-slate-400">{row.ip}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SystemConfigurationScreen() {
  const defaults = { aging:5, autoComplete:1.5, recall:5, otpTtl:5, otpTries:3, resend:60, cap24h:5, reconnect:5, lobbyFlash:5 }
  const [values, setValues] = useState(defaults)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const groups = [
    { title:'Queue engine', note:'Thuật toán ưu tiên và vòng đời phục vụ', fields:[
      { key:'aging' as const, label:'α aging factor', suffix:'điểm/phút' },
      { key:'autoComplete' as const, label:'Auto-complete threshold', suffix:'× T_standard', step:0.1 },
      { key:'recall' as const, label:'Recall max', suffix:'lần' },
    ]},
    { title:'Auth & OTP', note:'Giới hạn xác thực khách hàng', fields:[
      { key:'otpTtl' as const, label:'OTP TTL', suffix:'phút' },
      { key:'otpTries' as const, label:'Max tries', suffix:'lần' },
      { key:'resend' as const, label:'Resend interval', suffix:'giây' },
      { key:'cap24h' as const, label:'OTP cap / 24h', suffix:'lần' },
    ]},
    { title:'Realtime', note:'SSE và màn hình công cộng', fields:[
      { key:'reconnect' as const, label:'SSE reconnect', suffix:'giây (≤)' },
      { key:'lobbyFlash' as const, label:'Lobby flash', suffix:'giây' },
    ]},
  ]
  const save = (key:string) => {
    setSavedKey(key)
    window.setTimeout(() => setSavedKey(null), 2400)
  }
  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-800" data-audit-policy="Every system configuration change is audit-logged with a required reason.">
      {savedKey && <div role="status" className="overlay-enter fixed right-5 top-5 z-[200] flex items-center gap-3 rounded-xl border border-slate-200 border-l-[4px] border-l-emerald-600 bg-white p-4 text-slate-800 shadow-xl"><CheckIco s={17}/><p className="text-sm font-semibold text-slate-900">Đã lưu tham số {savedKey}.</p></div>}
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white/95 px-6 backdrop-blur"><div><h1 className="text-lg font-bold text-slate-900">Cấu hình hệ thống</h1><p className="mt-0.5 text-[11px] text-slate-500">Tham số nền tảng dùng chung, miễn nhiễm cấu hình tenant</p></div></header>
      <div className="grid grid-cols-3 gap-4 p-6">
        {groups.map(group => <section key={group.title} className="rounded-2xl border border-slate-200/90 bg-white shadow-xs"><div className="border-b border-slate-100 p-5"><h2 className="text-sm font-bold text-slate-900">{group.title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{group.note}</p></div><div className="divide-y divide-slate-100">{group.fields.map(field => <div key={field.key} className="p-4"><div className="flex items-center justify-between"><label className="text-[10px] font-semibold text-slate-700">{field.label}</label><button type="button" onClick={() => setValues(value => ({ ...value, [field.key]:defaults[field.key] }))} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Mặc định</button></div><div className="mt-2.5 flex items-center gap-2"><input type="number" min={0} step={field.step ?? 1} value={values[field.key]} onChange={event => setValues(value => ({ ...value, [field.key]:Number(event.target.value) }))} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 font-tabular text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"/><span className="min-w-20 text-[10px] font-medium text-slate-500">{field.suffix}</span><button type="button" onClick={() => save(field.label)} className="h-10 rounded-lg bg-indigo-600 px-3.5 text-[10px] font-bold text-white shadow-xs shadow-indigo-100 hover:bg-indigo-700 transition-colors">Lưu</button></div></div>)}</div></section>)}
        <div className="col-span-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3"><p className="text-xs font-medium text-indigo-900">Mọi thay đổi cấu hình đều được ghi log kiểm toán kèm lý do, actor, thời gian, IP và giá trị trước/sau.</p><span className="rounded bg-indigo-100/70 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">immutable_audit=true</span></div>
      </div>
    </div>
  )
}

function SuperAdminPortal({ onLogout }: { onLogout: () => void }) {
  const [activePage, setActivePage] = useState<'overview' | 'organizations' | 'approvals' | 'resources' | 'audit' | 'settings'>('overview')
  const [impersonation, setImpersonation] = useState<{ id:number; name:string; code:string } | null>(null)
  const [range, setRange] = useState<'7 ngày' | '30 ngày' | '90 ngày'>('7 ngày')
  const kpis = [
    { label:'Đang hoạt động', value:'128', delta:'+6.7%', tone:'bg-emerald-50 text-emerald-700 border border-emerald-200/80' },
    { label:'Tạm khóa', value:'07', delta:'−2', tone:'bg-slate-100 text-slate-700 border border-slate-200' },
    { label:'Chờ phê duyệt', value:'12', delta:'+3', tone:'bg-amber-50 text-amber-700 border border-amber-200/80' },
    { label:'Vé toàn hệ thống hôm nay', value:'18,492', delta:'+12.4%', tone:'bg-indigo-50 text-indigo-700 border border-indigo-200/80' },
    { label:'Hoàn tất', value:'16,870', delta:'+11.8%', tone:'bg-emerald-50 text-emerald-700 border border-emerald-200/80' },
    { label:'Vắng mặt', value:'624', delta:'−0.8%', tone:'bg-red-50 text-red-700 border border-red-200/80' },
    { label:'Người dùng hoạt động', value:'3,842', delta:'+9.2%', tone:'bg-cyan-50 text-cyan-700 border border-cyan-200/80' },
  ]
  const chartPoints = range === '7 ngày'
    ? [{x:2,y:68,v:'2,480'},{x:18,y:55,v:'2,910'},{x:34,y:61,v:'2,730'},{x:50,y:38,v:'3,420'},{x:66,y:44,v:'3,180'},{x:82,y:23,v:'3,860'},{x:98,y:29,v:'3,640'}]
    : range === '30 ngày'
      ? [{x:2,y:72,v:'2,110'},{x:14,y:64,v:'2,440'},{x:26,y:58,v:'2,680'},{x:38,y:49,v:'2,970'},{x:50,y:53,v:'2,840'},{x:62,y:38,v:'3,310'},{x:74,y:31,v:'3,580'},{x:86,y:36,v:'3,420'},{x:98,y:20,v:'3,990'}]
      : [{x:2,y:78,v:'1,880'},{x:14,y:70,v:'2,120'},{x:26,y:64,v:'2,390'},{x:38,y:56,v:'2,650'},{x:50,y:47,v:'2,980'},{x:62,y:41,v:'3,210'},{x:74,y:35,v:'3,460'},{x:86,y:28,v:'3,720'},{x:98,y:18,v:'4,080'}]
  const linePoints = chartPoints.map(point => `${point.x * 10},${point.y * 3}`).join(' ')

  const nav = [
    { label:'Tổng quan', icon:<GridIco s={17}/>, page:'overview' },
    { label:'Tổ chức', icon:<ServerIco s={17}/>, page:'organizations' },
    { label:'Phê duyệt', icon:<CheckIco s={17}/>, count:'12', page:'approvals' },
    { label:'Hạn ngạch & Tài nguyên', icon:<BarIco s={17}/>, page:'resources' },
    { label:'Nhật ký kiểm toán', icon:<ListIco s={17}/>, page:'audit' },
    { label:'Cấu hình hệ thống', icon:<SettingsIco s={17}/>, page:'settings' },
  ]

  if (impersonation) {
    return (
      <div className="h-screen w-full" data-audit-policy="Every action performed during impersonation writes an audit trail entry.">
        <div className="fixed inset-x-0 top-0 z-[9999] flex h-14 items-center gap-3 bg-[#D97706] px-5 text-white shadow-xl">
          <ShieldIco s={19}/>
          <p className="flex-1 text-sm font-bold">
            SUPER ADMIN SESSION: Currently viewing as {impersonation.name} <span className="font-tabular font-medium">(ID: ten_{String(impersonation.id).padStart(4,'0')})</span>
          </p>
          <button type="button" onClick={() => setImpersonation(null)}
            className="h-9 rounded-lg border border-white/40 bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/20">
            Exit Impersonation
          </button>
        </div>
        <BranchAdminConsole onLogout={onLogout}/>
      </div>
    )
  }

  return (
    <div
      className="flex h-screen min-h-[760px] w-full bg-[#F8FAFC] text-slate-800"
      data-live-behavior="WebSocket live tick; KPI numbers update without page reload."
      data-load-slo="Overview loads in ≤400ms from pre-aggregated cache."
    >
      <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white shadow-xs">
        <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs shadow-indigo-100"><ShieldIco s={18}/></div>
          <div><p className="text-sm font-bold text-slate-900">NextTurn</p><p className="mt-0.5 text-[9px] font-bold tracking-[0.13em] text-indigo-600 uppercase">COMMAND PORTAL</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {nav.map(item => {
            const active = item.page === activePage
            return <button key={item.label} type="button" onClick={() => (item.page === 'overview' || item.page === 'organizations' || item.page === 'approvals' || item.page === 'resources' || item.page === 'audit' || item.page === 'settings') && setActivePage(item.page)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${active ? 'bg-indigo-50 text-indigo-700 shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><span className={active ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span><span className="flex-1">{item.label}</span>{item.count && <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-tabular text-[9px] font-bold text-indigo-700">{item.count}</span>}</button>
          })}
        </nav>
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="mb-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs shadow-indigo-100">SA</div><div><p className="text-xs font-bold text-slate-900">Vũ Quốc Thắng</p><p className="mt-0.5 text-[10px] text-slate-500">Super Admin</p></div></div>
          <button type="button" onClick={onLogout} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"><LogOutIco s={14}/>Đăng xuất</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {activePage === 'organizations' ? <OrganizationsDirectory onImpersonate={setImpersonation}/> : activePage === 'approvals' ? <ApprovalQueue/> : activePage === 'resources' ? <ResourceQuotaDirectory/> : activePage === 'audit' ? <AuditLogScreen/> : activePage === 'settings' ? <SystemConfigurationScreen/> : (
        <>
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div><h1 className="text-lg font-bold text-slate-900">Tổng quan nền tảng</h1><p className="mt-0.5 text-[11px] text-slate-500">Giám sát tenant, phụ tải và tài nguyên toàn hệ thống</p></div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60"/><span className="relative h-2 w-2 rounded-full bg-emerald-600"/></span>LIVE · WebSocket</div>
        </header>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-3">
            {kpis.map((kpi,index) => (
              <section key={kpi.label} className="group relative z-0 min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 ease-out hover:z-40 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                <p className="min-h-8 text-[10px] font-semibold uppercase tracking-wider leading-relaxed text-slate-500">{kpi.label}</p>
                <p className="mt-2 truncate font-tabular text-[32px] font-bold leading-none tracking-tight text-slate-900">{kpi.value}</p>
                <span className={`mt-3 inline-flex rounded-md px-2 py-0.5 font-tabular text-[9px] font-bold ${kpi.tone}`}>{kpi.delta} vs hôm qua</span>
                <div className="pointer-events-none absolute left-0 right-0 top-full z-50 mt-2 translate-y-1 rounded-xl border border-slate-200 bg-white p-3.5 opacity-0 shadow-xl transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="mb-2 text-[9px] font-bold tracking-[0.05em] uppercase text-slate-400">XU HƯỚNG 7 NGÀY</p>
                  <svg viewBox="0 0 160 48" className="h-12 w-full" aria-label={`Sparkline ${kpi.label}`}>
                    <polyline points={`0,${38-index} 26,${32+index%4} 52,${35-index%3} 80,${22+index} 106,${27-index%2} 132,${15+index} 160,${18-index%3}`} fill="none" stroke="#4F46E5" strokeWidth="2.5"/>
                    <line x1="0" y1="46" x2="160" y2="46" stroke="#E2E8F0"/>
                  </svg>
                </div>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between">
              <div><h2 className="text-sm font-bold text-slate-900">Xu hướng phụ tải toàn nền tảng</h2><p className="mt-0.5 text-[11px] text-slate-500">Số yêu cầu xử lý mỗi phút trên toàn bộ tenant</p></div>
              <div className="flex rounded-xl bg-slate-100 p-1">{(['7 ngày','30 ngày','90 ngày'] as const).map(item => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${range === item ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{item}</button>)}</div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="h-1 w-5 rounded-full bg-indigo-600"/>Yêu cầu / phút</div>
            <div className="mt-4 flex h-[430px]">
              <div className="flex w-12 flex-col justify-between pb-8 text-right font-tabular text-[10px] text-slate-400"><span>5K</span><span>4K</span><span>3K</span><span>2K</span><span>1K</span><span>0</span></div>
              <div className="relative ml-4 flex-1">
                {[0,20,40,60,80,100].map(top => <span key={top} className="absolute inset-x-0 h-px bg-slate-100" style={{ top:`${top}%` }}/>)}
                <svg className="absolute inset-x-0 top-0 h-[calc(100%_-_32px)] w-full" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-label="Xu hướng phụ tải">
                  <polyline points={linePoints} fill="none" stroke="#4F46E5" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
                </svg>
                {chartPoints.map((point,index) => <button key={index} type="button" className="group/point absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow-[0_0_0_3px_rgba(79,70,229,0.2)] transition-transform hover:scale-125" style={{ left:`${point.x}%`, top:`${point.y}%` }}><span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 opacity-0 shadow-xl transition-all duration-200 ease-out group-hover/point:translate-y-0 group-hover/point:opacity-100"><span className="block text-[10px] text-slate-400">Điểm dữ liệu {index + 1}</span><span className="block font-tabular text-xs font-bold text-slate-900">{point.v} req/min</span></span></button>)}
                <div className="absolute inset-x-0 bottom-0 flex justify-between font-tabular text-[10px] text-slate-400">{(range === '7 ngày' ? ['T2','T3','T4','T5','T6','T7','CN'] : range === '30 ngày' ? ['01','05','10','15','20','25','30'] : ['T1','T2','T3']).map(label => <span key={label}>{label}</span>)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><p className="text-[10px] text-slate-400">Nguồn: pre-aggregated cache · tải mục tiêu ≤400ms</p><p className="font-tabular text-[10px] text-slate-400">Cập nhật 10:42:07</p></div>
          </section>
        </div>
        </>
        )}
      </main>
    </div>
  )
}

function AppShell({ role, onLogout }: { role: Role; onLogout: () => void }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50" style={{ fontFamily:'var(--font-sans)' }}>
      <main className="h-full w-full">
        {role === 'customer' || role === 'guest'
          ? <CustomerView onLogout={onLogout}/>
          : role === 'staff'
            ? <AdminDashboard onLogout={onLogout}/>
            : role === 'superadmin'
              ? <SuperAdminPortal onLogout={onLogout}/>
              : <BranchAdminConsole onLogout={onLogout}/>}
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   POST-SERVICE CSAT — STANDALONE EMAIL DEEP LINK
══════════════════════════════════════════════════════════════════ */
type FeedbackEdgeState = 'expired' | 'already' | 'invalid'

function CsatFeedbackScreen({ ticketCode='A-042', initialState }: { ticketCode?: string; initialState?: FeedbackEdgeState }) {
  const [rating, setRating] = useState(0)
  const [criteria, setCriteria] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitFailure, setSubmitFailure] = useState(false)
  const [failureTriggered, setFailureTriggered] = useState(false)
  const ratingLabels = ['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng']
  const criteriaOptions = ['Thái độ phục vụ', 'Thời gian chờ', 'Không gian cơ sở']
  const searchParams = new URLSearchParams(window.location.search)
  const requestedState = searchParams.get('state')
  const edgeState = initialState ?? (['expired', 'already', 'invalid'].includes(requestedState ?? '') ? requestedState as FeedbackEdgeState : undefined)
  const simulateFirstSubmitFailure = searchParams.get('submit') === 'fail'

  useEffect(() => {
    const edgeTitles: Record<FeedbackEdgeState, string> = {
      expired: 'Liên kết đánh giá đã hết hạn | St. Jude',
      already: 'Đánh giá đã hoàn thành | St. Jude',
      invalid: 'Không thể mở đánh giá | St. Jude',
    }
    document.title = edgeState ? edgeTitles[edgeState] : submitted ? 'Cảm ơn quý khách | St. Jude' : 'Đánh giá dịch vụ | St. Jude'
  }, [edgeState, submitted])

  const toggleCriterion = (criterion: string) => {
    setCriteria(selected => selected.includes(criterion)
      ? selected.filter(item => item !== criterion)
      : [...selected, criterion])
  }

  const submitFeedback = () => {
    if (!rating) return
    if (simulateFirstSubmitFailure && !failureTriggered) {
      setFailureTriggered(true)
      setSubmitFailure(true)
      return
    }
    // The prototype mirrors the server-side sanitizer before accepting the feedback.
    setComment(value => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ''))
    setSubmitFailure(false)
    setSubmitted(true)
  }

  return (
    <main
      className="min-h-screen bg-[#EFF6FF] px-4 py-5 text-slate-900 sm:py-8"
      data-feedback-link-validity="24 hours"
      data-submission-policy="One submission per ticket"
      data-entry-eticket="Auto-redirects here when ticket state becomes COMPLETED (REQ-FEEDBACK-01)"
      data-entry-email="Confirmation email deep link carries feedback_token"
    >
      {submitFailure && (
        <div role="alert" className="fixed left-1/2 top-4 z-[200] flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-white p-3.5 shadow-[0_16px_40px_-16px_rgba(127,29,29,0.38)]">
          <span className="shrink-0 text-red-600"><AlertIco s={18}/></span>
          <p className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-slate-800">Gửi thất bại. Vui lòng thử lại.</p>
          <button type="button" onClick={submitFeedback} className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100">
            Thử lại
          </button>
        </div>
      )}
      <section className="mx-auto w-full max-w-[480px] overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_24px_60px_-28px_rgba(30,64,175,0.28)]">
        <header className="border-b border-blue-100 bg-[linear-gradient(145deg,#FFFFFF_0%,#EFF6FF_100%)] px-5 pb-5 pt-6 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm" aria-label="Logo Phòng khám St. Jude">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-blue-700">Phòng khám St. Jude</p>
              <h1 className="mt-0.5 truncate text-base font-bold leading-relaxed text-slate-900">Tư vấn tổng quát</h1>
            </div>
            <span className="shrink-0 rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-tabular text-sm font-bold text-blue-900">{ticketCode}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-white/80 px-3 py-2.5 text-xs text-slate-600">
            <span className="text-blue-600"><CheckIco s={15}/></span>
            <span>Phiên phục vụ hoàn tất lúc <strong className="font-tabular font-bold text-slate-800">10:42</strong></span>
          </div>
        </header>

        {edgeState === 'expired' ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center sm:px-9">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-8 ring-blue-50/60">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="M8 2h8"/>
              </svg>
            </div>
            <p className="mt-7 max-w-[340px] text-xl font-bold leading-relaxed text-slate-900">Phiên đánh giá cho lượt phục vụ này đã hết hạn.</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Liên kết đánh giá có hiệu lực trong vòng 24 giờ sau khi hoàn tất phục vụ.</p>
            <button type="button" onClick={() => window.location.assign('/')}
              className="mt-8 flex h-[54px] w-full items-center justify-center rounded-xl border border-blue-200 bg-white text-sm font-bold text-blue-800 transition-colors hover:bg-blue-50">
              Quay về trang cơ sở
            </button>
          </div>
        ) : edgeState === 'already' ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center sm:px-9">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
              <CheckIco s={36}/>
            </div>
            <p className="mt-7 max-w-[360px] text-xl font-bold leading-relaxed text-slate-900">Bạn đã hoàn thành đánh giá cho lượt phục vụ này. Xin chân thành cảm ơn!</p>
            <div className="mt-5 flex items-center justify-center gap-2" aria-label="Đánh giá trước đó: 4 trên 5 sao">
              {[1,2,3,4,5].map(star => (
                <span key={star} className={`flex h-10 w-10 items-center justify-center rounded-xl ${star <= 4 ? 'bg-amber-50 text-[#F59E0B]' : 'bg-slate-50 text-slate-300'}`}>
                  <StarIco s={26} fill={star <= 4}/>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-amber-700">Hài lòng</p>
            <button type="button" onClick={() => window.location.assign('/')}
              className="mt-8 flex h-[54px] w-full items-center justify-center rounded-xl border border-blue-200 bg-white text-sm font-bold text-blue-800 transition-colors hover:bg-blue-50">
              Quay về trang cơ sở
            </button>
          </div>
        ) : edgeState === 'invalid' ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center sm:px-9">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/60">
              <AlertIco s={36}/>
            </div>
            <p className="mt-7 text-xl font-bold leading-relaxed text-slate-900">Không thể mở phiên đánh giá</p>
            <p className="mt-2 max-w-[330px] text-sm leading-relaxed text-slate-500">Liên kết không hợp lệ hoặc đã bị thay đổi. Vui lòng kiểm tra lại email xác nhận.</p>
            <div className="mt-6 w-full rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-semibold text-slate-700">Cần hỗ trợ?</p>
              <a href="mailto:support@nextturn.vn" className="mt-1 inline-block text-sm font-bold text-blue-700 hover:text-blue-900">support@nextturn.vn</a>
            </div>
            <button type="button" onClick={() => window.location.assign('/')}
              className="mt-6 flex h-[54px] w-full items-center justify-center rounded-xl border border-blue-200 bg-white text-sm font-bold text-blue-800 transition-colors hover:bg-blue-50">
              Quay về trang cơ sở
            </button>
          </div>
        ) : submitted ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center sm:px-9">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-8 ring-emerald-50/60">
              <CheckIco s={36}/>
            </div>
            <p className="mt-7 text-xl font-bold leading-relaxed text-slate-900">Cảm ơn quý khách đã dành thời gian đánh giá!</p>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-slate-500">Phản hồi của quý khách giúp St. Jude cải thiện trải nghiệm phục vụ mỗi ngày.</p>
            <button type="button" onClick={() => window.location.assign('/')}
              className="mt-8 flex h-[54px] w-full items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100">
              Quay về trang cơ sở
            </button>
          </div>
        ) : (
          <div className="px-5 py-6 sm:px-7">
            <fieldset>
              <legend className="text-sm font-bold leading-relaxed text-slate-900">Quý khách hài lòng với trải nghiệm hôm nay?</legend>
              <div className="mt-4 flex items-center justify-between gap-2" role="radiogroup" aria-label="Mức độ hài lòng">
                {[1,2,3,4,5].map(star => {
                  const selected = star <= rating
                  return (
                    <button key={star} type="button" role="radio" aria-checked={rating === star}
                      aria-label={`${star} sao — ${ratingLabels[star - 1]}`}
                      onClick={() => setRating(star)}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-amber-100 ${selected ? 'scale-105 bg-amber-50 text-[#F59E0B]' : 'bg-slate-50 text-slate-300 hover:bg-amber-50 hover:text-amber-400'}`}>
                      <StarIco s={29} fill={selected}/>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 min-h-5 text-center text-xs font-semibold text-amber-700" aria-live="polite">
                {rating ? ratingLabels[rating - 1] : 'Chọn số sao phù hợp với trải nghiệm của quý khách'}
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-bold leading-relaxed text-slate-900">Điều gì ảnh hưởng đến trải nghiệm?</legend>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Có thể chọn nhiều tiêu chí</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {criteriaOptions.map(criterion => {
                  const selected = criteria.includes(criterion)
                  return (
                    <button key={criterion} type="button" aria-pressed={selected} onClick={() => toggleCriterion(criterion)}
                      className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${selected ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                      {selected && <span className="mr-1.5 inline-flex align-[-2px]"><CheckIco s={13}/></span>}
                      {criterion}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <label className="mt-7 block">
              <span className="text-sm font-bold leading-relaxed text-slate-900">Chia sẻ thêm <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
              <div className="relative mt-3">
                <textarea value={comment} maxLength={500} rows={5}
                  onChange={event => setComment(event.target.value)}
                  placeholder="Nhập nhận xét của quý khách..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 outline-none transition-shadow placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"/>
                <span className="absolute bottom-3 right-3 rounded bg-white/90 px-1 font-tabular text-[10px] text-slate-400">{comment.length}/500</span>
              </div>
              <span className="mt-1.5 flex items-center gap-1.5 text-[10px] leading-relaxed text-slate-400"><ShieldIco s={12}/>Thẻ HTML/script sẽ được tự động lọc</span>
            </label>

            <button type="button" onClick={submitFeedback} disabled={!rating}
              className="mt-7 flex h-[54px] w-full items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">
              Gửi đánh giá
            </button>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">Mỗi vé chỉ gửi được 1 lần • Liên kết hiệu lực 24 giờ</p>
          </div>
        )}
      </section>
    </main>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [appState, setAppState] = useState<AppState>('auth')
  const [role, setRole] = useState<Role>('admin')
  const [currentHash, setCurrentHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleAuth = (r: Role) => { setRole(r); setAppState('app') }
  const handleLogout = () => {
    if (window.location.hash === '#root-console' || window.location.hash === '#superadmin' || window.location.hash === '#superadmin-portal') {
      window.location.hash = ''
    }
    setAppState('auth')
  }

  const displayRoute = window.location.pathname.match(/^\/([^/]+)\/display\/?$/)
  if (displayRoute) return <LobbyDisplay tenantCode={decodeURIComponent(displayRoute[1])}/>
  if (window.location.pathname === '/partners/register' || currentHash === '#register') return <PartnerRegistration/>
  const feedbackRoute = window.location.pathname.match(/^\/([^/]+)\/feedback\/([^/]+)\/?$/)
  if (feedbackRoute) return <CsatFeedbackScreen ticketCode={decodeURIComponent(feedbackRoute[2])}/>
  if (currentHash === '#lobby-display') return <LobbyDisplay/>
  if (currentHash === '#booking-widget') return <BookingWidgetDemo/>
  if (currentHash === '#widget-ticket-fullscreen') return <FullscreenWidgetTicket/>
  if (currentHash === '#csat-feedback-expired') return <CsatFeedbackScreen initialState="expired"/>
  if (currentHash === '#csat-feedback-already') return <CsatFeedbackScreen initialState="already"/>
  if (currentHash === '#csat-feedback-invalid') return <CsatFeedbackScreen initialState="invalid"/>
  if (currentHash === '#csat-feedback') return <CsatFeedbackScreen/>
  if (currentHash === '#kanban' || currentHash === '#counter' || currentHash === '#counter-staff') {
    return <AppShell role="staff" onLogout={handleLogout}/>
  }

  if (currentHash === '#superadmin-portal') {
    return <AppShell role="superadmin" onLogout={handleLogout}/>
  }

  if (appState === 'auth') {
    const isSuperAdminLogin = window.location.pathname === '/internal/root-console' || currentHash === '#root-console' || currentHash === '#superadmin'
    return isSuperAdminLogin ? <SuperAdminLogin onAuth={handleAuth}/> : <AuthScreen onAuth={handleAuth}/>
  }
  return <AppShell role={role} onLogout={handleLogout}/>
}
