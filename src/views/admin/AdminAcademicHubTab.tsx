'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from '../../components/ui/Button';

type AcademicTab = 'teachers' | 'subjects' | 'resources';

interface Props {
  teachersContent: ReactNode;
  subjectsContent: ReactNode;
  resourcesContent: ReactNode;
}

export default function AdminAcademicHubTab({
  teachersContent,
  subjectsContent,
  resourcesContent
}: Props) {
  const [activeTab, setActiveTab] = useState<AcademicTab>('subjects');
  const tabs: { id: AcademicTab; label: string }[] = [
    { id: 'teachers', label: 'الدكاترة والشعب' },
    { id: 'subjects', label: 'المواد والمقررات' },
    { id: 'resources', label: 'المصادر والروابط' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>
          الأكاديميا الموحدة
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          إدارة الدكاترة والمواد والمصادر من صفحة واحدة
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 88%, var(--bg-subtle))'
        }}
        role="tablist"
        aria-label="أقسام الأكاديميا"
      >
        {tabs.map(tab => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'accent' : 'ghost'}
            size="md"
            rounded="xl"
            className="min-w-0 w-full min-h-11 px-1.5 text-[10px] leading-tight min-[380px]:text-[11px] sm:px-3 sm:text-xs"
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span className="whitespace-normal">{tab.label}</span>
          </Button>
        ))}
      </div>

      <div>
        {activeTab === 'teachers'
          ? teachersContent
          : activeTab === 'subjects'
            ? subjectsContent
            : resourcesContent}
      </div>
    </div>
  );
}
