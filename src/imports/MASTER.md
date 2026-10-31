# Design System Master Specification: NextTurn (MASTER.md)

> **HIERARCHICAL RETRIEVAL NOTICE:**
> When building or styling a specific view or page, inspect `design-system/pages/[page-name].md` first.
> If a page-specific specification exists, its granular rules **override** this Master file.
> If no page override exists, this document acts as the **Universal Source of Truth** for NextTurn.

---

## 1. System Vision & Architecture
**NextTurn** is an intermediate multi-tenant platform (*nền tảng trung gian đa khách thuê*) engineered for online appointment scheduling, digital ticketing, and real-time virtual queue orchestration (*điều phối hàng đợi ảo thời gian thực*). 

The platform adapts dynamically to diverse business verticals—ranging from high-throughput healthcare clinics and financial counters to luxury beauty spas, dining venues, and public service bureaus—while maintaining an uncompromising standard of **calm authority, nuanced depth, and ergonomic precision**.

### 4-Tier Stakeholder Spectrum (*Hệ phân cấp 4 nhóm vai trò người dùng*)
The system is explicitly partitioned across four distinct operational personas to guarantee strict multi-tenant isolation (*sự cô lập dữ liệu giữa các khách thuê*), operational velocity, and intuitive hierarchy:

| Stakeholder Role | Primary Interface | Core Operational Need | Design Priority |
| :--- | :--- | :--- | :--- |
| **1. Super Admin** *(Platform Owner / Operator)* | Super Admin Command Portal | Global tenant lifecycle, platform-wide telemetry, subscription tiers, SLA enforcement, audit logs & tenant impersonation (*chế độ đăng nhập giả lập để hỗ trợ khách thuê*). | Obsidian dark console (`#0B0F19`), dense tabular monitoring, persistent safety impersonation banners, high-contrast KPI cards. |
| **2. Tenant Admin** *(Business Owner / Branch Manager)* | Multi-Branch Operations Hub | Single-tenant venue configuration, staff & counter assignments, service catalog, business hours, local queue velocity, custom tenant branding (*gán nhãn thương hiệu riêng*). | Bento-grid analytics, multi-branch quick switcher, brand override previewer, service configuration matrices. |
| **3. Staff / Teller** *(Counter Operator / Desk Attendant)* | Counter Desk Console (Tablet / Desktop POS) | Repetitive high-velocity ticket actions (Call, Hold, Serve, Skip, Transfer) across continuous 8-hour shifts. | Fitts's law touch targets ($\ge 54\text{px}$), keyboard shortcuts, eye-strain reducing dark mode, zero layout shifting. |
| **4. Public Customer** *(Client / Patient / Guest)* | Mobile Web App / PWA / Ticket Tracking View | Instant clarity on wait time, friction-free booking, low anxiety while waiting. | Ergonomic thumb-zone, ambient pulse indicators, high sunlight readability, Screen WakeLock (*khóa màn hình luôn sáng*). |

---

## 2. Design Philosophy: Nuanced Swiss Precision
NextTurn marries **Swiss Modernism 2.0** (strict mathematical rhythm, modular grid structures, pure visual hierarchy) with **Evolved Soft UI** (delicate multi-layer elevation, tactile feedback, and restrained border halos).

- **Calm Reassurance over Clutter:** Queueing generates cognitive anxiety (*sự âu lo về thời gian chờ đợi*). The interface avoids aggressive alarms, loud full-screen banners, and chaotic animations.
- **Tabular Precision:** Every counter number, wait-time ticker, and queue code uses monospaced/tabular figures (`font-variant-numeric: tabular-nums`) to prevent numeric jitter (*hiện tượng nhảy giật chữ số khi cập nhật số giây/số vé*).
- **Multi-Tenant White-Labeling (*Khả năng gán nhãn thương hiệu linh hoạt*):** Tenant brands can inject their primary color hue and border-radius tokens without breaking the underlying accessibility contrast, typographic hierarchy, or semantic queue state engine.
- **Administrative Clear Boundary:** The Super Admin command interface uses a distinctive Obsidian Slate theme with Electric Iris accents to prevent visual confusion between platform-level administration and individual tenant operations.

---

## 3. Global Color Token System

The color architecture is built around calibrated lightness scales and strict contrast ratios (WCAG AAA for text, AA for visual indicators).

### 3.1 Foundation Palette (Platform Light & Dark Mode)
```css
:root {
  /* Surface & Canvas (Light Mode) */
  --surface-canvas: #F8FAFC;        /* Slate-50: Crisp, clean back-surface */
  --surface-card: #FFFFFF;          /* Pure White: Primary elevated container */
  --surface-subtle: #F1F5F9;        /* Slate-100: Secondary card / muted slot */
  --surface-inset: #E2E8F0;         /* Slate-200: Input backgrounds / dividers */

  /* Neutral Typography & Borders (Light Mode) */
  --text-primary: #0F172A;          /* Slate-900: High-contrast primary copy (15.8:1) */
  --text-secondary: #475569;        /* Slate-600: Secondary labels, subtitles (6.2:1) */
  --text-tertiary: #94A3B8;         /* Slate-400: Metadata, timestamps, placeholders */
  --border-subtle: #E2E8F0;         /* Slate-200: Standard 1px card boundaries */
  --border-strong: #CBD5E1;         /* Slate-300: Active states, interactive inputs */

  /* Core Brand Tokens (NextTurn Global Sapphire - Tenant & Public Default) */
  --brand-primary: #1E40AF;         /* Deep Trust Sapphire */
  --brand-accent: #2563EB;          /* Luminous Interaction Blue */
  --brand-hover: #1D4ED8;           /* Hover Interaction Blue */
  --brand-tint: #EFF6FF;            /* Soft Brand Background Tint */
  --brand-contrast: #FFFFFF;        /* Text on Brand Accent */

  /* Super Admin Command Portal Tokens (Platform Oversight Layer) */
  --super-admin-bg: #0B0F19;         /* Obsidian Midnight Void */
  --super-admin-surface: #111827;    /* Slate Dark Card */
  --super-admin-accent: #6366F1;     /* Electric Iris / Indigo (Differentiates Super Admin) */
  --super-admin-hover: #4F46E5;
  --super-admin-border: #1E293B;
  
  /* Impersonation Safety Warning Bar (When Super Admin acts as Tenant) */
  --impersonation-bar-bg: #D97706;   /* Amber-600 Persistent Header */
  --impersonation-bar-text: #FFFFFF;
}

/* Dark Mode / Kiosk & Display Screen Mode (OLED Optimized) */
[data-theme="dark"], .theme-dark {
  --surface-canvas: #090D16;        /* Deep midnight void */
  --surface-card: #111827;          /* Gray-900: Primary container surface */
  --surface-subtle: #1E293B;        /* Slate-800: Secondary nested slot */
  --surface-inset: #0F172A;         /* Recessed field surface */

  --text-primary: #F8FAFC;          /* Slate-50: High-contrast readable typography */
  --text-secondary: #94A3B8;        /* Slate-400: Muted subtitles */
  --text-tertiary: #64748B;         /* Slate-500: Deep metadata */
  --border-subtle: #1E293B;         /* Slate-800: Low-strain container edge */
  --border-strong: #334155;         /* Slate-700: Focus indicators */

  --brand-primary: #3B82F6;         /* Elevated Sky Blue for high legibility */
  --brand-accent: #60A5FA;          /* Electric Cobalt */
  --brand-hover: #93C5FD;
  --brand-tint: rgba(59, 130, 246, 0.12);
  --brand-contrast: #0F172A;
}
```

### 3.2 Semantic Queue State Color Engine
Real-time queues require unambiguous semantic states (*trạng thái nghiệp vụ trực quan*). Colors must never be used alone; always accompany them with textual chips and SVG status glyphs.

| Queue State | Light Hex (BG / Border / Text) | Dark Hex (BG / Text) | Semantics & Real-World Meaning |
| :--- | :--- | :--- | :--- |
| **`STATE_SERVING`** (Now Calling) | `BG: #ECFDF5`<br>`Border: #6EE7B7`<br>`Text: #065F46` | `BG: rgba(16,185,129,0.16)`<br>`Text: #34D399` | **Active Turn:** Ticket called to counter. Subtle pulse glow applied. |
| **`STATE_UPCOMING`** (Your Turn Next) | `BG: #FFFBEB`<br>`Border: #FCD34D`<br>`Text: #92400E` | `BG: rgba(245,158,11,0.16)`<br>`Text: #FBBF24` | **Prepare to move:** Position ≤ 2 in line. Dynamic countdown amber. |
| **`STATE_WAITING`** (In Queue) | `BG: #EFF6FF`<br>`Border: #BFDBFE`<br>`Text: #1E40AF` | `BG: rgba(37,99,235,0.16)`<br>`Text: #93C5FD` | **Standard Queue:** Orderly progress, shows estimated wait in minutes. |
| **`STATE_HELD`** (On Hold / Delayed) | `BG: #F5F3FF`<br>`Border: #DDD6FE`<br>`Text: #5B21B6` | `BG: rgba(139,92,246,0.16)`<br>`Text: #C4B5FD` | **Customer Pending:** Missing documents, awaiting lab results, or delayed. |
| **`STATE_NOSHOW`** (Skipped / Expired) | `BG: #FEF2F2`<br>`Border: #FECACA`<br>`Text: #991B1B` | `BG: rgba(239,68,68,0.16)`<br>`Text: #FCA5A5` | **Turn Missed:** Ticket recalled or cancelled. Allows grace period reclaim. |
| **`STATE_COMPLETED`** (Finished) | `BG: #F8FAFC`<br>`Border: #E2E8F0`<br>`Text: #475569` | `BG: rgba(255,255,255,0.06)`<br>`Text: #94A3B8` | **Service Concluded:** Archive receipt, optional rating prompt. |

### 3.3 Tenant Status Badges (Super Admin Layer)
| Tenant Status | Token & Hex | Semantic Usage |
| :--- | :--- | :--- |
| **Active / Verified** | `BG: #ECFDF5`, `Text: #065F46` | Tenant compliant, subscription active, processing queues normally. |
| **Trial Mode** | `BG: #F5F3FF`, `Text: #5B21B6` | 14-day evaluation period, limited counter slots. |
| **Throttled / Quota Warning** | `BG: #FFFBEB`, `Text: #92400E` | High queue ticket volume approaching monthly tier ceiling. |
| **Suspended / Past Due** | `BG: #FEF2F2`, `Text: #991B1B` | Queue operations paused due to non-payment or compliance flag. |

---

## 4. Multi-Tenant Customization Layer (White-Label Hooks)
To adapt smoothly across industries without code alterations, individual tenants override CSS tokens at their scoped container level. The Super Admin console remains immune to tenant overrides to maintain platform consistency.

```css
/* Scoped Tenant Overrides Injected at Runtime */
.tenant-scope {
  --tenant-brand-primary: var(--brand-primary);
  --tenant-brand-accent: var(--brand-accent);
  --tenant-radius: 10px;           /* 4px for Clinical/Fintech, 16px for Spa/Salon */
  --tenant-font-heading: 'Be Vietnam Pro', sans-serif;
}

/* Tenant Vertical Presets */
/* 1. Clinical / Dental / Diagnostic Center */
[data-vertical="clinical"] {
  --tenant-brand-primary: #0891B2;  /* Medical Cyan */
  --tenant-brand-accent: #0284C7;
  --tenant-radius: 6px;             /* Sterile, precise geometry */
}

/* 2. Spa / Aesthetic Wellness */
[data-vertical="wellness"] {
  --tenant-brand-primary: #BE185D;  /* Rose Quartz */
  --tenant-brand-accent: #8B5CF6;   /* Lavender Hue */
  --tenant-radius: 16px;            /* Gentle organic contours */
}

/* 3. Financial / Legal Desk */
[data-vertical="finance"] {
  --tenant-brand-primary: #0F172A;  /* Deep Bank Slate */
  --tenant-brand-accent: #B45309;   /* Subtle Gold Accent */
  --tenant-radius: 4px;             /* Conservative, structured corners */
}

/* 4. Dining / F&B Fast-Casual */
[data-vertical="hospitality"] {
  --tenant-brand-primary: #C2410C;  /* Warm Terracotta */
  --tenant-brand-accent: #F59E0B;   /* Warm Amber */
  --tenant-radius: 12px;
}
```

---

## 5. Typography Engine (Vietnamese & Multilingual Ergonomics)

Typography balances corporate authority, high-speed digital readability, and **flawless Vietnamese diacritic rendering (*hiển thị dấu tiếng Việt hoàn hảo, không bị xén hoặc đè dấu*)**.

### 5.1 Font Stacks
NextTurn adopts **Be Vietnam Pro** as its primary typeface—a modern neo-grotesque sans-serif custom-crafted by Vietnamese typographers specifically to resolve diacritic stacking (*dấu thanh kết hợp dấu mũ/móc như ể, ở, ẫ, ặ, ễ*). For tabular countdowns and ticket tickers, **JetBrains Mono** guarantees jitter-free alignment.

```css
/* Google Fonts Import: Be Vietnam Pro (400-800) + JetBrains Mono */
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=JetBrains+Mono:wght@500;700&display=swap');

:root {
  /* Primary Sans Stack: Be Vietnam Pro with Inter & System Fallbacks */
  --font-sans: 'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Monospace & Tabular Figures Stack */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 5.2 Type Hierarchy Scale (Diacritic-Safe Line Heights)
> **VIETNAMESE LINE-HEIGHT RULE:** Standard English line heights (1.1 - 1.2) cause Vietnamese compound diacritics (e.g., `ẩ`, `ử`, `ễ`, `ệ`) to clip or collide with uppercase letters on preceding lines. NextTurn expands line heights by `+0.05` to `+0.1` and softens letter-tracking to ensure pristine rendering.

| Token | Font Size | Safe Line Height | Weight | Tracking | Primary Usage (English / Tiếng Việt) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display-kiosk` | `56px` (`3.5rem`) | `1.15` | `800` | `-0.015em` | Kiosk & TV Call Number (`A-042`, `QUẦY 03`) |
| `text-ticket-hero` | `40px` (`2.5rem`) | `1.2` | `700` | `-0.015em` | Mobile Screen: Số thứ tự vé của bạn |
| `text-heading-1` | `28px` (`1.75rem`) | `1.3` | `700` | `-0.01em` | Portal Landing / Danh sách cơ sở & chi nhánh |
| `text-heading-2` | `22px` (`1.375rem`) | `1.35` | `600` | `-0.008em` | Section Titles, Nhãn quầy giao dịch |
| `text-heading-3` | `18px` (`1.125rem`) | `1.45` | `600` | `0` | Modal titles, Các bước đặt lịch |
| `text-body-base` | `15px` (`0.9375rem`)| `1.6` | `400 / 500` | `0` | Standard instructions, form field inputs |
| `text-body-sm` | `13px` (`0.8125rem`)| `1.5` | `500` | `+0.01em` | Thời lượng dịch vụ, tên nhân viên, địa chỉ |
| `text-mono-ticker` | `14px` (`0.875rem`)| `1.2` | `600` | `+0.02em` | Real-time countdowns (`08:45 phút`, `font-variant-numeric: tabular-nums`) |
| `text-micro-badge` | `11px` (`0.6875rem`)| `1.3` | `700` | `+0.04em` | Status badges (`ĐANG PHỤC VỤ`, `ƯU TIÊN`) |

### 5.3 Vietnamese Diacritic Rendering Safeguards (*Quy chuẩn hiển thị dấu Tiếng Việt an toàn*)
1. **Vertical Clipping Guard (*Chống xén dấu trong các phần tử có overflow*):**
   - Interactive components (`.btn`, `.badge`, `.card`) with `overflow: hidden` must maintain at least `4px` top/bottom padding to prevent clipping the peaks of capitalized accented vowels (`Đ`, `Ấ`, `Ắ`, `Ế`, `Ố`, `Ớ`, `Ứ`).
2. **Text-Transform Discipline (*Hạn chế viết hoa toàn bộ câu dài*):**
   - Avoid `text-transform: uppercase` on long Vietnamese phrases because accented uppercase glyphs take up significant vertical room and increase cognitive reading strain.
   - Use `uppercase` exclusively for short status tags ($\le 3$ words, e.g., `ĐANG PHỤC VỤ`, `ĐÃ XÁC NHẬN`) or ticket alphanumeric prefixes (`PK-A01`, `SPA-02`).
3. **Tabular Numerals on Hybrid Queue Tokens:**
   - When ticket identifiers combine Vietnamese service prefixes with digits (e.g. `KHOA-042`, `TIẾP-NHẬN-05`), enforce:
     ```css
     .ticket-code {
       font-family: var(--font-sans);
       font-variant-numeric: tabular-nums;
       font-feature-settings: "tnum" 1, "cv05" 1;
     }
     ```
   - This ensures uniform width across all digits without displacing adjacent Vietnamese characters.

---

## 6. Spatial Matrix & Elevation Geometry

### 6.1 Spacing Scale (4px Base Unit Grid)
```css
:root {
  --space-2xs: 4px;    /* Micro-tag margins, inline icon offset */
  --space-xs:  8px;    /* Compact element spacing, input icon gap */
  --space-sm:  12px;   /* Inner button padding, compact card padding */
  --space-md:  16px;   /* Standard card internal padding, form row gap */
  --space-lg:  24px;   /* Section separation within cards, modal padding */
  --space-xl:  32px;   /* Layout container gutter, screen edge mobile */
  --space-2xl: 48px;   /* Desktop section separation */
  --space-3xl: 64px;   /* Hero separation, Kiosk header margin */
}
```

### 6.2 Nuanced Elevation & Ambient Shadows
No harsh single-layer drop shadows. Shadows use dual-source soft diffusion:
```css
:root {
  /* Level 1: Flat Interactive Card (resting state) */
  --shadow-card: 
    0px 1px 2px rgba(15, 23, 42, 0.05),
    0px 0px 0px 1px var(--border-subtle);

  /* Level 2: Interactive Hover / Active Ticket Elevation */
  --shadow-hover: 
    0px 4px 6px -1px rgba(15, 23, 42, 0.08),
    0px 2px 4px -2px rgba(15, 23, 42, 0.04),
    0px 0px 0px 1px var(--border-strong);

  /* Level 3: Dropdowns, Floating Queue Drawer, Overlays */
  --shadow-modal: 
    0px 20px 25px -5px rgba(15, 23, 42, 0.1),
    0px 8px 10px -6px rgba(15, 23, 42, 0.05),
    0px 0px 0px 1px var(--border-subtle);

  /* Pulse Glow for 'Now Serving' Active State */
  --glow-active: 0px 0px 0px 4px rgba(16, 185, 129, 0.24);
  --glow-urgent: 0px 0px 0px 4px rgba(245, 158, 11, 0.28);
}
```

---

## 7. Signature Component Specifications

### 7.1 The Live Mobile Queue Ticket Card (`<NextTurnTicket />`)
The primary touchpoint for waiting customers. Displays position, dynamic ETA, and a QR validation key.
```html
<div class="nt-ticket-card state-serving">
  <div class="nt-ticket-header">
    <div class="nt-tenant-meta">
      <span class="nt-tenant-name">St. Jude Medical Clinic</span>
      <span class="nt-service-tag">General Consultation - Counter 03</span>
    </div>
    <span class="nt-badge badge-serving">NOW SERVING</span>
  </div>

  <div class="nt-ticket-main">
    <span class="nt-ticket-label">YOUR TICKET NUMBER</span>
    <div class="nt-ticket-number">A-042</div>
    <div class="nt-ticket-countdown">
      <svg class="nt-icon-clock" viewBox="0 0 24 24"><!-- SVG clock --></svg>
      <span>Please proceed to <strong>Counter 3</strong> immediately</span>
    </div>
  </div>

  <div class="nt-ticket-progress-bar">
    <div class="nt-progress-fill" style="width: 100%;"></div>
  </div>

  <div class="nt-ticket-footer">
    <div class="nt-ticket-stat">
      <span class="stat-title">Current Waiting</span>
      <span class="stat-val font-tabular">0 ahead of you</span>
    </div>
    <div class="nt-ticket-qr">
      <!-- High contrast SVG QR for desk scanner -->
    </div>
  </div>
</div>
```

```css
/* Ticket Component CSS */
.nt-ticket-card {
  background: var(--surface-card);
  border-radius: var(--tenant-radius, 12px);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease;
}

.nt-ticket-card.state-serving {
  border-color: #6EE7B7;
  box-shadow: var(--shadow-hover), var(--glow-active);
  animation: ticketPulse 2.4s infinite ease-in-out;
}

@keyframes ticketPulse {
  0%, 100% { box-shadow: var(--shadow-hover), 0 0 0 0 rgba(16, 185, 129, 0.3); }
  50% { box-shadow: var(--shadow-hover), 0 0 0 8px rgba(16, 185, 129, 0); }
}

.nt-ticket-number {
  font-family: var(--font-sans);
  font-size: var(--text-ticket-hero);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  margin: var(--space-xs) 0;
}
```

### 7.2 Merchant Fast-Action Desk Console (`<NextTurnCounterDesk />`)
Designed for high-throughput counter operators (hospital triage, bank tellers, salon receptionists).
- **Fitts's Law Optimization:** The primary "Call Next Ticket" button spans a minimum height of `54px` with distinct hotkey triggers (`[Space]` = Call Next, `[H]` = Hold, `[S]` = Skip).
- **Latency Resilience:** Optimistic UI state (*cập nhật giao diện lập tức trước khi server phản hồi*) with subtle syncing spinners inside button containers.

```css
/* Counter Desk Velocity Buttons */
.btn-desk-primary {
  min-height: 54px;
  background: var(--brand-accent);
  color: var(--brand-contrast);
  font-size: 16px;
  font-weight: 700;
  border-radius: var(--tenant-radius, 8px);
  padding: 0 var(--space-xl);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  cursor: pointer;
  border: none;
  transition: background 150ms ease, transform 100ms ease;
}

.btn-desk-primary:hover {
  background: var(--brand-hover);
  transform: translateY(-1px);
}

.btn-desk-primary:active {
  transform: translateY(0px) scale(0.99);
}

.btn-desk-secondary {
  min-height: 54px;
  background: var(--surface-subtle);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  font-weight: 600;
  border-radius: var(--tenant-radius, 8px);
  padding: 0 var(--space-lg);
  cursor: pointer;
}
```

### 7.3 Public Display Board (Kiosk & Wall TV Screen Mode)
For in-venue screens (LCD / TV displays hanging in waiting areas):
- Strict **high-contrast dark mode** (`#090D16` backdrop) to prevent backlight glare and display burning.
- Screen split into **Now Serving** (left 60%, massive 56px numerals, counter designation) and **Upcoming Tickets** (right 40%, scrollable list).
- Smooth entry transition whenever a new number is announced.

### 7.4 Super Admin Impersonation Safety Header (`<NextTurnImpersonationBar />`)
Whenever a Super Admin logs into a tenant's console to troubleshoot or assist, a high-visibility persistent banner prevents accidental actions in tenant data:
```html
<aside class="nt-impersonation-bar" role="alert">
  <div class="impersonation-content">
    <svg class="icon-shield" viewBox="0 0 24 24"><!-- Shield Alert SVG --></svg>
    <span>SUPER ADMIN SESSION: Currently viewing as <strong>St. Jude Medical Clinic (ID: ten_8824)</strong></span>
  </div>
  <button class="btn-exit-impersonation">Exit Impersonation</button>
</aside>
```

```css
.nt-impersonation-bar {
  background: var(--impersonation-bar-bg);
  color: var(--impersonation-bar-text);
  padding: 8px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 9999;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.btn-exit-impersonation {
  background: rgba(0, 0, 0, 0.25);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 150ms ease;
}

.btn-exit-impersonation:hover {
  background: rgba(0, 0, 0, 0.4);
}
```

---

## 8. Real-Time Interaction & Micro-Animation Rules
1. **Duration Standards:**
   - Quick feedback transitions (Button hovers, chip states): `150ms - 200ms` `ease-out`.
   - Card entry & modal pop: `250ms - 300ms` `cubic-bezier(0.16, 1, 0.3, 1)` (anticipatory decel).
   - Real-time countdown meters: Continuous linear step transitions without jerky re-renders.
2. **Audio-Haptic Integration (Mobile Web API):**
   - When a ticket moves to `STATE_UPCOMING` (≤ 2 positions away): Trigger a single soft haptic pulse (`navigator.vibrate([100])`).
   - When ticket reaches `STATE_SERVING`: Trigger dual confirmation pulse (`navigator.vibrate([200, 100, 200])`) paired with a discreet harmonic chime (440Hz → 880Hz soft sine wave).
3. **Accessibility (Reduced Motion):**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
     .nt-ticket-card.state-serving {
       animation: none;
       border-width: 2px;
     }
   }
   ```

---

## 9. Anti-Patterns & Usability Traps (What NEVER To Do)

- ❌ **No Emoji Icons in Core UI:** Never use ⏱️, 🔔, ❌ as functional UI buttons. Use precision SVG icons (Lucide or Heroicons with consistent 1.5px/2px stroke).
- ❌ **No Jittering Numbers:** Never render countdown clocks without `font-variant-numeric: tabular-nums`. Monospace alignment ensures the box doesn't resize every second.
- ❌ **No Ambiguous Queue Progress:** Never show only "You are in line" without either queue position (e.g. `3rd in line`) or estimated arrival timestamp (`Estimated: 10:25 AM`).
- ❌ **No Destructive Action without Grace Period:** "Mark No-Show" or "Cancel Appointment" must provide an immediate 8-second toast undo action (*thao tác hoàn tác tức thì*).
- ❌ **No Silent Tenant Impersonation:** Super Admins must never view or edit tenant data without the persistent warning banner (`--impersonation-bar-bg`) and an audit trail log.
- ❌ **No Aggressive Sound Loops:** Never play loud repeating alarms that irritate customers or counter employees. Use gentle, pleasant acoustic chimes once per state transition.
- ❌ **No Pure Color Signals:** Never rely solely on green vs. red for status (impairs 8% of male colorblind users). Always pair with distinct badge copy (`NOW SERVING`, `DELAYED`) and semantic icons.

---

## 10. Pre-Delivery & Quality Verification Checklist
Every component, screen, or tenant customization must pass this checklist:

### Visual Rigor
- [ ] No layout shift (CLS < 0.05) when tickets update or real-time counters tick.
- [ ] Contrast ratio between text and surface verified at ≥ 4.5:1 (Light and Dark mode).
- [ ] Multi-tenant variables fallback safely to default NextTurn Sapphire tokens.
- [ ] Super Admin portal retains distinct Electric Iris branding and Obsidian canvas.
- [ ] All icon vectors use uniform 20px / 24px viewboxes with matched stroke weights.

### Interaction & Velocity
- [ ] Every clickable card or button exhibits `cursor: pointer` with instant 150ms feedback.
- [ ] Operator counter desk hotkeys tested (`Space`, `H`, `S`).
- [ ] Mobile ticket view fits comfortably in single-hand thumb zones (essential actions in bottom 60% of viewport).

### Responsive Breakpoints
- [ ] **Mobile (375px - 480px):** Single-column ticket focus, sticky bottom status banner.
- [ ] **Tablet / Desk POS (768px - 1024px):** Split-view desk console (Queue list left, active ticket right).
- [ ] **Desktop & Tenant Admin (1280px - 1440px+):** 12-column Bento Grid for operations and throughput metrics.
- [ ] **Super Admin Telemetry (1440px - 1920px):** High-density tabular multi-tenant directory and platform health monitors.
- [ ] **Large Display / TV (1920px+):** High-contrast wall kiosk mode with oversized typography.
