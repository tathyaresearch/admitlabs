'use client';

// Interactive pieces for the design system page. All content here is sample content.

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ResultBar } from '@/components/ui/Results';
import { SourceLine } from '@/components/ui/Data';
import { Difficulty } from '@/components/ui/Results';
import { Dialog, SidePanel } from '@/components/ui/Overlay';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tabs } from '@/components/ui/Tabs';
import styles from './design-system.module.css';

export function SegmentedDemo() {
  const [scope, setScope] = useState('city');
  const [program, setProgram] = useState('bba');
  return (
    <div className={styles.stack}>
      <SegmentedControl
        label="How wide to look"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'city', label: 'City' },
          { value: 'state', label: 'State' },
          { value: 'india', label: 'All India' },
        ]}
      />
      <SegmentedControl
        label="Program"
        size="sm"
        value={program}
        onChange={setProgram}
        options={[
          { value: 'bba', label: 'BBA' },
          { value: 'bca', label: 'BCA' },
          { value: 'bcom', label: 'B.Com' },
        ]}
      />
      <p className={styles.caption}>
        Selected: {scope}, {program}. Arrow keys move between options.
      </p>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs
      label="Audit sections"
      items={[
        { id: 'working', label: "What's working", content: <p className={styles.caption}>Top strengths appear here first.</p> },
        { id: 'fix', label: 'What to fix', content: <p className={styles.caption}>Gaps ranked by the points they could add.</p> },
        { id: 'area', label: 'Area by area', content: <p className={styles.caption}>Every check, with what was found and where.</p> },
      ]}
    />
  );
}

export function OverlayDemo() {
  const [panel, setPanel] = useState(false);
  const [dialog, setDialog] = useState(false);
  return (
    <div className={styles.row}>
      <Button variant="secondary" icon="arrowRight" onClick={() => setPanel(true)}>
        Open side panel
      </Button>
      <Button variant="secondary" onClick={() => setDialog(true)}>
        Open dialog
      </Button>

      <SidePanel
        open={panel}
        onClose={() => setPanel(false)}
        title="Fees shown"
        description="Chosen pillar. Sample check detail."
        footer={
          <Button variant="primary" onClick={() => setPanel(false)}>
            Done
          </Button>
        }
      >
        <div className={styles.stack}>
          <ResultBar result="weak" size="lg" />
          <div className={styles.panelBlock}>
            <p className={styles.panelLabel}>What we found</p>
            <p>The BBA page says &quot;Contact us for fees&quot;. No amounts are shown anywhere on the site.</p>
          </div>
          <div className={styles.panelBlock}>
            <p className={styles.panelLabel}>Why it matters to a student</p>
            <p>Fees are the first thing students and parents compare. A clear number keeps you on their list.</p>
          </div>
          <div className={styles.panelBlock}>
            <p className={styles.panelLabel}>How to fix it</p>
            <p>Add the full yearly fee, with tuition, exams and hostel listed separately.</p>
            <Difficulty value="easy" />
          </div>
          <SourceLine url="https://northbank-college.example/programs/bba#fees" checkedAt="2026-09-10T04:30:00Z" />
        </div>
      </SidePanel>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Change your rivals?"
        description="Sample dialog."
        footer={
          <>
            <Button variant="quiet" onClick={() => setDialog(false)}>
              Keep them
            </Button>
            <Button onClick={() => setDialog(false)}>Change rivals</Button>
          </>
        }
      >
        <p>On Paid you can change your rivals once a month. Your next change is possible from 15 October.</p>
      </Dialog>
    </div>
  );
}
