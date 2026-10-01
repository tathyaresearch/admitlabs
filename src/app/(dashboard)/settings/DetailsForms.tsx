'use client';

// What an institution adds about itself and each program ("Added by you"). Every field is
// optional, one Save per form. The server checks every value again.

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import {
  DETAIL_LIMITS,
  HOSTEL_LABELS,
  HOSTEL_OPTIONS,
  NAAC_GRADES,
  NAAC_LABELS,
  SKILLING_LABELS,
  SKILLING_RECOGNITIONS,
  type InstitutionDetails,
  type ProgramDetails,
} from '@/domain/details';
import type { InstitutionType } from '@/domain/types';
import { saveInstitutionDetailsAction, saveProgramDetailsAction, type DetailsFormState } from './details-actions';
import styles from './settings.module.css';

const START: DetailsFormState = { attempt: 0, status: 'idle', message: null, errors: {} };

const NOT_SET = { value: '', label: 'Not added' };
const YES_NO = [NOT_SET, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const yesNo = (value: boolean | null) => (value === null ? '' : value ? 'yes' : 'no');
const str = (value: string | number | null) => (value === null ? '' : String(value));

function Status({ state }: { state: DetailsFormState }) {
  if (!state.message) return null;
  return (
    <p className={styles.status} role="status" data-status={state.status}>
      {state.message}
    </p>
  );
}

export function InstitutionDetailsForm({ initial, institutionType }: { initial: InstitutionDetails; institutionType: InstitutionType }) {
  const [state, action, pending] = useActionState(saveInstitutionDetailsAction, START);
  const errors = state.errors;
  const skilling = institutionType === 'skilling';
  return (
    <form action={action} className={styles.form} noValidate>
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>{skilling ? 'Recognition' : 'Approvals and recognition'}</legend>
        {skilling ? (
          <div className={styles.choiceList}>
            {SKILLING_RECOGNITIONS.map((value) => (
              <Checkbox
                key={value}
                id={`skilling-${value}`}
                name="skilling_recognition"
                value={value}
                label={SKILLING_LABELS[value]}
                defaultChecked={initial.skillingRecognition.includes(value)}
              />
            ))}
          </div>
        ) : (
          <>
            <div className={styles.pair}>
              <SelectField
                id="naac_grade"
                name="naac_grade"
                label="NAAC grade"
                defaultValue={initial.naacGrade ?? ''}
                options={[NOT_SET, ...NAAC_GRADES.map((grade) => ({ value: grade, label: NAAC_LABELS[grade] }))]}
              />
              <SelectField id="ugc_recognised" name="ugc_recognised" label="UGC recognised" defaultValue={yesNo(initial.ugcRecognised)} options={YES_NO} />
            </div>
            <div className={styles.pair}>
              <TextField id="nirf_rank" name="nirf_rank" label="NIRF rank" inputMode="numeric" defaultValue={str(initial.nirfRank)} error={errors.nirfRank} />
              <TextField id="nirf_year" name="nirf_year" label="NIRF year" inputMode="numeric" placeholder="2026" defaultValue={str(initial.nirfYear)} error={errors.nirfYear} />
            </div>
          </>
        )}
        <div className={styles.pair}>
          <SelectField id="aicte_approved" name="aicte_approved" label="AICTE approved" defaultValue={yesNo(initial.aicteApproved)} options={YES_NO} />
          <TextField
            id="other_approvals"
            name="other_approvals"
            label="Other approvals"
            placeholder="INC, PCI"
            maxLength={DETAIL_LIMITS.otherApprovals}
            defaultValue={initial.otherApprovals ?? ''}
            error={errors.otherApprovals}
          />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Campus and contact</legend>
        <TextField
          id="campus_address"
          name="campus_address"
          label="Campus address"
          maxLength={DETAIL_LIMITS.campusAddress}
          defaultValue={initial.campusAddress ?? ''}
          error={errors.campusAddress}
        />
        <div className={styles.pair}>
          <TextField
            id="admissions_phone"
            name="admissions_phone"
            label="Admissions phone"
            type="tel"
            placeholder="+91 98765 43210"
            defaultValue={initial.admissionsPhone ?? ''}
            error={errors.admissionsPhone}
          />
          <TextField
            id="admissions_email"
            name="admissions_email"
            label="Admissions email"
            type="email"
            placeholder="admissions@college.edu"
            defaultValue={initial.admissionsEmail ?? ''}
            error={errors.admissionsEmail}
          />
        </div>
        <SelectField
          id="hostel"
          name="hostel"
          label="Hostel"
          defaultValue={initial.hostel ?? ''}
          options={[NOT_SET, ...HOSTEL_OPTIONS.map((value) => ({ value, label: HOSTEL_LABELS[value] }))]}
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>About you</legend>
        <TextField id="founded_year" name="founded_year" label="Year founded" inputMode="numeric" defaultValue={str(initial.foundedYear)} error={errors.foundedYear} />
        <TextAreaField
          id="scholarships"
          name="scholarships"
          label="Scholarships"
          hint={`Up to ${DETAIL_LIMITS.scholarships} characters.`}
          rows={2}
          maxLength={DETAIL_LIMITS.scholarships}
          defaultValue={initial.scholarships ?? ''}
          error={errors.scholarships}
        />
        <TextAreaField
          id="difference"
          name="difference"
          label="What makes you different"
          hint={`Up to ${DETAIL_LIMITS.difference} characters.`}
          rows={3}
          maxLength={DETAIL_LIMITS.difference}
          defaultValue={initial.difference ?? ''}
          error={errors.difference}
        />
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" loading={pending}>
          Save details
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ProgramDetailsForm({ programId, programName, initial }: { programId: string; programName: string; initial: ProgramDetails }) {
  const [state, action, pending] = useActionState(saveProgramDetailsAction.bind(null, programId), START);
  const errors = state.errors;
  const id = (name: string) => `${programId}-${name}`;
  return (
    <form action={action} className={styles.form} noValidate aria-label={`Details for ${programName}`}>
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Basics</legend>
        <div className={styles.pair}>
          <div className={styles.inline}>
            <TextField id={id('duration_value')} name="duration_value" label="Duration" inputMode="numeric" defaultValue={str(initial.durationValue)} error={errors.durationValue} />
            <SelectField
              id={id('duration_unit')}
              name="duration_unit"
              label="Unit"
              defaultValue={initial.durationUnit ?? 'years'}
              options={[
                { value: 'years', label: 'Years' },
                { value: 'months', label: 'Months' },
              ]}
            />
          </div>
          <TextField id={id('seats')} name="seats" label="Seats" inputMode="numeric" defaultValue={str(initial.seats)} error={errors.seats} />
        </div>
        <div className={styles.inline}>
          <TextField id={id('fees_amount')} name="fees_amount" label="Fees, in rupees" inputMode="numeric" placeholder="120000" defaultValue={str(initial.feesAmount)} error={errors.feesAmount} />
          <SelectField
            id={id('fees_period')}
            name="fees_period"
            label="Per"
            defaultValue={initial.feesPeriod ?? 'year'}
            options={[
              { value: 'year', label: 'A year' },
              { value: 'total', label: 'In total' },
            ]}
          />
        </div>
        <TextField
          id={id('eligibility')}
          name="eligibility"
          label="Eligibility"
          placeholder="12th pass with 50% marks"
          maxLength={DETAIL_LIMITS.eligibility}
          defaultValue={initial.eligibility ?? ''}
          error={errors.eligibility}
        />
        <TextField
          id={id('specialisations')}
          name="specialisations"
          label="Specialisations"
          hint="Separate with commas. Up to 5."
          defaultValue={initial.specialisations.join(', ')}
          error={errors.specialisations}
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Placements</legend>
        <div className={styles.pair}>
          <TextField id={id('placement_year')} name="placement_year" label="Batch year" inputMode="numeric" placeholder="2026" defaultValue={str(initial.placementYear)} error={errors.placementYear} />
          <TextField id={id('placed_percent')} name="placed_percent" label="Students placed, in %" inputMode="numeric" defaultValue={str(initial.placedPercent)} error={errors.placedPercent} />
        </div>
        <div className={styles.pair}>
          <TextField
            id={id('average_package')}
            name="average_package"
            label="Average package, ₹ lakh a year"
            inputMode="decimal"
            defaultValue={str(initial.averagePackage)}
            error={errors.averagePackage}
          />
          <TextField
            id={id('highest_package')}
            name="highest_package"
            label="Highest package, ₹ lakh a year"
            inputMode="decimal"
            defaultValue={str(initial.highestPackage)}
            error={errors.highestPackage}
          />
        </div>
        <TextField
          id={id('top_recruiters')}
          name="top_recruiters"
          label="Top recruiters"
          hint="Separate with commas. Up to 5."
          defaultValue={initial.topRecruiters.join(', ')}
          error={errors.topRecruiters}
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Admissions</legend>
        <div className={styles.pair}>
          <TextField id={id('applications_open')} name="applications_open" label="Applications open" type="date" defaultValue={initial.applicationsOpen ?? ''} error={errors.applicationsOpen} />
          <TextField
            id={id('applications_close')}
            name="applications_close"
            label="Applications close"
            type="date"
            defaultValue={initial.applicationsClose ?? ''}
            error={errors.applicationsClose}
          />
        </div>
        <TextField
          id={id('page_url')}
          name="page_url"
          label="Program page"
          hint="A page on your own website."
          inputMode="url"
          defaultValue={initial.pageUrl ?? ''}
          error={errors.pageUrl}
        />
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="secondary" loading={pending}>
          Save {programName} details
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}
