"use client";
import React, { useState } from "react";
import {
  Button,
  Card,
  Chip,
  Progress,
  Modal,
  PageHeader,
  EmptyState,
  Skeleton,
  Stat,
} from "../components/ui";
import {
  BookOpen,
  Sparkles,
  TrendingUp,
  Users,
  Trophy,
  Search,
  Plus,
} from "lucide-react";

export default function DevDesignPage() {
  const [open, setOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={<Sparkles size={20} />}
          breadcrumbs={[
            { label: "Dev", href: "/dev-design" },
            { label: "Design system" },
          ]}
          title="EdTech Design Preview"
          description="Trang nội bộ Phiên A — verify tokens, primitives mới (PageHeader, EmptyState, Skeleton, Stat) và Button intent='brand'."
          action={
            <>
              <Button intent="ghost" size="sm" iconLeft={<Search size={16} />}>
                Tìm
              </Button>
              <Button intent="brand" size="sm" iconLeft={<Plus size={16} />}>
                Tạo mới
              </Button>
            </>
          }
        />

        <Section title="1. Stat row">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat tone="brand"  label="Học sinh" value="1,248"  delta={12} icon={<Users size={16} />} hint="So với tuần trước" />
            <Stat tone="accent" label="Hoàn thành" value="86%"   delta={4}  icon={<TrendingUp size={16} />} />
            <Stat tone="warn"   label="Streak TB" value="5.4"    delta={-2} icon={<Trophy size={16} />} />
            <Stat tone="neutral" label="Tổng từ vựng" value="3,902" icon={<BookOpen size={16} />} />
          </div>
        </Section>

        <Section title="2. Buttons (intent + size)">
          <div className="flex flex-wrap gap-3 mb-3">
            <Button intent="brand">Brand</Button>
            <Button intent="primary">Primary (duo-green)</Button>
            <Button intent="info">Info</Button>
            <Button intent="streak">Streak</Button>
            <Button intent="wrong">Danger</Button>
            <Button intent="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button intent="brand" size="sm">Small</Button>
            <Button intent="brand">Medium</Button>
            <Button intent="brand" size="lg">Large</Button>
            <Button intent="brand" loading>Loading</Button>
            <Button intent="brand" disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="3. PageHeader (variant không icon)">
          <div className="app-card p-5">
            <PageHeader
              title="Vocabulary"
              description="Học và ôn từ vựng theo SRS."
              action={<Button intent="brand" size="sm">Thêm từ</Button>}
              className="mb-0 pb-0 border-0"
            />
          </div>
        </Section>

        <Section title="4. Cards (legacy duo-card vs app-card)">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-bold text-slate-900 mb-1">Duo-card (legacy)</h3>
              <p className="text-sm text-slate-600">Phong cách playful, dùng cho quiz / TestForm.</p>
              <div className="mt-3 flex gap-2">
                <Chip intent="correct">Đúng</Chip>
                <Chip intent="wrong">Sai</Chip>
                <Chip intent="streak">Streak</Chip>
              </div>
            </Card>
            <div className="app-card app-card--hover p-5">
              <h3 className="font-bold text-slate-900 mb-1">App-card (EdTech)</h3>
              <p className="text-sm text-slate-600">Border 1px, shadow nhẹ — phong cách học thuật.</p>
              <Progress value={68} className="mt-4" />
              <p className="mt-1 text-xs text-slate-500">Tiến độ 68%</p>
            </div>
          </div>
        </Section>

        <Section title="5. EmptyState">
          <div className="app-card">
            <EmptyState
              icon={<BookOpen size={28} />}
              title="Chưa có từ vựng nào"
              body="Thêm từ đầu tiên để bắt đầu chuỗi học tập của bạn."
              action={<Button intent="brand" iconLeft={<Plus size={16} />}>Thêm từ</Button>}
            />
          </div>
        </Section>

        <Section title="6. Skeleton">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="app-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton variant="avatar" width={40} />
                <div className="flex-1">
                  <Skeleton width="60%" />
                  <Skeleton width="40%" className="mt-2" />
                </div>
              </div>
              <Skeleton lines={3} />
            </div>
            <Skeleton variant="card" height={140} />
            <Skeleton variant="card" height={140} />
          </div>
        </Section>

        <Section title="7. Modal">
          <Button intent="brand" onClick={() => setOpen(true)}>Mở modal</Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Tiêu đề modal"
            footer={
              <>
                <Button intent="ghost" onClick={() => setOpen(false)}>Hủy</Button>
                <Button intent="brand" onClick={() => setOpen(false)}>Xác nhận</Button>
              </>
            }
          >
            <p className="text-sm text-slate-600 leading-relaxed">
              Padding, border-top header và sticky footer đã chuẩn lại theo design tokens
              EdTech. Trên mobile sẽ render dạng bottom sheet.
            </p>
          </Modal>
        </Section>

        <Section title="8. Typography hierarchy">
          <div className="app-card p-6 space-y-3">
            <p className="text-[40px] leading-[48px] font-bold tracking-tight text-slate-900">
              Display 40 / bold
            </p>
            <p className="text-[28px] leading-9 font-bold tracking-tight text-slate-900">
              H1 28 / bold
            </p>
            <p className="text-[22px] leading-[30px] font-bold text-slate-900">H2 22 / bold</p>
            <p className="text-lg font-semibold text-slate-900">H3 18 / semibold</p>
            <p className="text-[15px] leading-6 text-slate-700">
              Body 15 / normal — đoạn văn mặc định cho nội dung học. Ưu tiên độ đọc, không
              dùng font-black trong content area.
            </p>
            <p className="text-[13px] leading-5 text-slate-600">Body-sm 13 / normal</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Caption 12 / medium / uppercase
            </p>
          </div>
        </Section>

        <Section title="9. Color tokens">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Swatch name="--brand" color="#2563EB" />
            <Swatch name="--brand-dark" color="#1E40AF" />
            <Swatch name="--accent" color="#10B981" />
            <Swatch name="--warn" color="#F59E0B" />
            <Swatch name="--danger" color="#EF4444" />
            <Swatch name="--ink-1" color="#0F172A" />
            <Swatch name="--ink-2" color="#475569" />
            <Swatch name="--line" color="#E2E8F0" />
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <div className="app-card p-3">
      <div className="h-12 rounded-lg" style={{ background: color }} />
      <p className="mt-2 text-xs font-medium text-slate-900">{name}</p>
      <p className="text-xs text-slate-500 tabular-nums">{color}</p>
    </div>
  );
}
