export function calculateRisk(structured = {}, patientTypeRaw = 'general') {
  const {
    feverDays = null,
    highBP = false,
    swelling = false,
    bleeding = false,
    breathingIssue = false,
    symptoms = [],
  } = structured;

  const patientType = (patientTypeRaw || 'general').toLowerCase();
  const symptomSet = new Set((symptoms || []).map((s) => String(s).toLowerCase()));

  const hasBleeding = Boolean(bleeding) || symptomSet.has('bleeding');
  const hasBreathingIssue =
    Boolean(breathingIssue) ||
    symptomSet.has('breathing issue') ||
    symptomSet.has('breathing problem') ||
    symptomSet.has('shortness of breath');

  if (patientType === 'pregnant') {
    if (hasBleeding) return 'Critical';
    if (highBP && swelling) return 'High';
    if ((Number(feverDays) || 0) >= 4) return 'Medium';
    if (swelling) return 'Medium';
    return 'Low';
  }

  if (hasBleeding) return 'High';

  if (patientType === 'child') {
    if (hasBreathingIssue) return 'High';
    if ((Number(feverDays) || 0) >= 4) return 'Medium';
    return 'Low';
  }

  if (patientType === 'elder') {
    if (hasBreathingIssue) return 'High';
    if ((Number(feverDays) || 0) >= 3) return 'Medium';
    return 'Low';
  }

  if (hasBreathingIssue) return 'High';
  if ((Number(feverDays) || 0) >= 5) return 'Medium';

  return 'Low';
}

export default calculateRisk;
