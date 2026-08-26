/**
 * Code Kitchen Score — profile strength + completeness engine.
 *
 * SOURCE OF TRUTH
 *   This is a faithful Node port of the real Deluge function
 *   `standalone.studentIntelligence` (richenquest-platform repo,
 *   functions/src/studentIntelligence.dg, "canonical profile v1.0",
 *   version 2.0 / 2026-08-23). Every threshold, weight, capped multiplier,
 *   and literal string comparison below (including the "None yet" and
 *   "School / College" special cases) is copied from that source, not
 *   invented. When CRM/AppSail access is restored, the live Deluge engine
 *   is the actual system of record — this module exists so the same
 *   methodology can run locally today and produces byte-identical numbers
 *   to what the Deluge function computes from the same field values.
 *
 * WHAT "PROFILE STRENGTH" MEANS HERE, PRECISELY
 *   The source calls this axis `profile_strength`. Externally in this
 *   product it is surfaced as "Code Kitchen Score" — same number, same
 *   formula, product-facing name only. It is the student's own standing,
 *   independent of any opportunity: academics 30, skills 20, projects 20,
 *   achievements 15, extracurriculars+languages 15, total 100. It is
 *   never blended with `matchOpportunities`' FIT score, never a
 *   probability, and never used to rank students against each other —
 *   the source is explicit on all three points.
 *
 * WHAT THIS MODULE DOES NOT DO
 *   It does not define score bands/levels ("Strong"/"Weak" tiers) — the
 *   source has none. The Deluge file's own header assigns "band" to a
 *   different function (caseState) for a different axis (case risk, not
 *   profile strength), so inventing one here would misattribute someone
 *   else's concept. It does not compute opportunity eligibility or match
 *   confidence — those belong to `matchOpportunities`/`sortByScore` and
 *   are surfaced separately, never collapsed into this score.
 */

const SCORE_VERSION = 'studentIntelligence-2.0';

/* The exact 22-field completeness checklist from the Deluge source. */
const COMPLETENESS_FIELDS = [
  'Last_Name', 'Email', 'Phone', 'City', 'Current_Education',
  'Academic_Percentage', 'English_Status', 'Passport_Status', 'Budget_Range',
  'Interested_Level', 'Career_Goal', 'Intended_Intake', 'Interested_Country',
  'Funding_Source', 'Parent_Name', 'Referred_By_Name', 'Skills', 'Interests',
  'Preferred_Domain', 'Project_Count', 'Achievement_Level', 'Extracurriculars'
];

const ACHIEVEMENT_POINTS = {
  International: 15, National: 12, State: 9, District: 6, 'School / College': 3
};

function isEmptyList(v) {
  return !Array.isArray(v) || v.length === 0;
}

/**
 * @param {object} profile - plain field values from a CRM Lead/Contact
 *   record, using the exact CRM field names (Academic_Percentage,
 *   Skills, Project_Count, Achievement_Level, Extracurriculars,
 *   Languages_Spoken, plus the completeness-checklist fields above).
 */
function calculate(profile) {
  const p = profile || {};
  const dims = {};
  let profileStrength = 0;
  const breakdown = [];

  /* Academics — 30. A value <= 10 is a CGPA, never converted to a
   * percentage (the conversion factor varies by university and is never
   * guessed); a value > 10 is a percentage. Missing entirely scores 0,
   * not the lowest band — that distinction is the source's own, not
   * added here (compare "no percentage or CGPA recorded" vs "below the
   * usual bar" in the Deluge source). */
  const pctVal = p.Academic_Percentage;
  let academicsScore = 0;
  let academicsState = 'NOT_PROVIDED';
  let academicsNote = 'No percentage or CGPA recorded';
  if (pctVal !== null && pctVal !== undefined && pctVal !== '') {
    const v = Number(pctVal);
    academicsState = 'EVALUATED';
    if (v <= 10) {
      if (v >= 8) { academicsScore = 30; academicsNote = `CGPA ${v} is strong`; }
      else if (v >= 6.5) { academicsScore = 20; academicsNote = `CGPA ${v} is solid`; }
      else { academicsScore = 10; academicsNote = `CGPA ${v} is below the usual bar`; }
    } else {
      if (v >= 75) { academicsScore = 30; academicsNote = `${v}% is strong`; }
      else if (v >= 60) { academicsScore = 20; academicsNote = `${v}% is solid`; }
      else { academicsScore = 10; academicsNote = `${v}% is below the usual bar`; }
    }
  }
  profileStrength += academicsScore;
  breakdown.push(`Academics ${academicsScore}/30 — ${academicsNote}`);
  dims.academics = { score: academicsScore, max: 30, evaluation_state: academicsState, evidence: academicsNote };

  /* Skills — 5 per skill, capped at 20. "None yet" is a literal picklist
   * value meaning the student explicitly answered "none", not an
   * unanswered field — treated the same as empty either way. */
  const skills = p.Skills;
  let skillsScore = 0;
  let skillsState = 'NOT_PROVIDED';
  let skillsNote = 'None recorded yet';
  if (!isEmptyList(skills) && !skills.includes('None yet')) {
    skillsScore = Math.min(skills.length * 5, 20);
    skillsState = 'EVALUATED';
    skillsNote = `${skills.length} recorded: ${skills.join(', ')}`;
  }
  profileStrength += skillsScore;
  breakdown.push(`Skills ${skillsScore}/20 — ${skillsNote}`);
  dims.skills = { score: skillsScore, max: 20, evaluation_state: skillsState, evidence: skillsNote };

  /* Projects — 7 per project, capped at 20. */
  const projectCount = p.Project_Count;
  let projectsScore = 0;
  let projectsState = 'NOT_PROVIDED';
  let projectsNote = 'None recorded yet';
  if (projectCount !== null && projectCount !== undefined && Number(projectCount) > 0) {
    projectsScore = Math.min(Number(projectCount) * 7, 20);
    projectsState = 'EVALUATED';
    projectsNote = `${projectCount} project(s)`;
  }
  profileStrength += projectsScore;
  breakdown.push(`Projects ${projectsScore}/20 — ${projectsNote}`);
  dims.projects = { score: projectsScore, max: 20, evaluation_state: projectsState, evidence: projectsNote };

  /* Achievements — highest level only, exact literal labels. Unrecognised
   * or absent values default to 0, matching the source (no "else" branch
   * exists there either). */
  const achievementLevel = p.Achievement_Level;
  const achievementsScore = ACHIEVEMENT_POINTS[achievementLevel] || 0;
  profileStrength += achievementsScore;
  breakdown.push(`Achievements ${achievementsScore}/15 — highest level: ${achievementLevel || 'none recorded'}`);
  dims.achievements = {
    score: achievementsScore, max: 15,
    evaluation_state: achievementLevel ? 'EVALUATED' : 'NOT_PROVIDED',
    evidence: achievementLevel ? `Highest level: ${achievementLevel}` : 'No achievement level recorded'
  };

  /* Extracurriculars + languages — 15, as two independent sub-awards
   * (8 for any extracurricular activity, 7 for two or more languages),
   * not scaled by count. Both, either, or neither can apply. */
  const extracurriculars = p.Extracurriculars;
  const languages = p.Languages_Spoken;
  let ecLangScore = 0;
  const ecLangParts = [];
  const hasExtracurriculars = !isEmptyList(extracurriculars) && !extracurriculars.includes('None yet');
  if (hasExtracurriculars) { ecLangScore += 8; ecLangParts.push('activities recorded (+8)'); }
  const hasTwoLanguages = Array.isArray(languages) && languages.length >= 2;
  if (hasTwoLanguages) { ecLangScore += 7; ecLangParts.push('2+ languages spoken (+7)'); }
  profileStrength += ecLangScore;
  const ecLangNote = ecLangParts.length ? ecLangParts.join(', ') : 'No extracurriculars or additional languages recorded';
  breakdown.push(`Extracurriculars and languages ${ecLangScore}/15 — ${ecLangNote}`);
  dims.extracurriculars_and_languages = {
    score: ecLangScore, max: 15,
    evaluation_state: (hasExtracurriculars || hasTwoLanguages) ? 'EVALUATED' : 'NOT_PROVIDED',
    evidence: ecLangNote
  };

  /* Completeness — the exact 22-field checklist, independent of strength. */
  const missingFields = [];
  let present = 0;
  for (const field of COMPLETENESS_FIELDS) {
    const v = p[field];
    const populated = v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    if (populated) present += 1; else missingFields.push(field);
  }
  const completeness = Math.round((present / COMPLETENESS_FIELDS.length) * 100);

  /* Strengths / gaps / recommendations — derived directly from the
   * dimension breakdown above, not a separate judgement layer. A gap is
   * any dimension that scored below half its available points; a
   * strength is any dimension at or above 80% of its max. */
  const dimEntries = Object.entries(dims);
  const strengths = dimEntries
    .filter(([, d]) => d.score >= d.max * 0.8)
    .map(([key, d]) => ({ dimension: key, evidence: d.evidence }));
  const gaps = dimEntries
    .filter(([, d]) => d.score < d.max * 0.5)
    .map(([key, d]) => ({
      dimension: key,
      state: d.evaluation_state,
      evidence: d.evidence
    }));

  const RECOMMENDATION_COPY = {
    academics: 'Add your academic percentage or CGPA to your profile.',
    skills: 'Add the skills you have to your profile.',
    projects: 'Record any projects you have worked on.',
    achievements: 'Add your highest achievement level, if any.',
    extracurriculars_and_languages: 'Add extracurricular activities or additional languages you speak.'
  };
  const recommendations = gaps.map(g => ({
    dimension: g.dimension,
    action: RECOMMENDATION_COPY[g.dimension],
    reason: g.state === 'NOT_PROVIDED'
      ? 'Not enough information to evaluate this dimension yet.'
      : 'Currently below the strong range for this dimension.'
  }));

  return {
    score_version: SCORE_VERSION,
    profile_strength: profileStrength,
    profile_strength_max: 100,
    profile_strength_meaning: "The student's own standing out of 100, independent of any opportunity. Academics 30, skills 20, projects 20, achievements 15, extracurriculars and languages 15. It is NOT a match score and NOT a probability of anything.",
    profile_strength_breakdown: breakdown,
    dimensions: dims,
    profile_completeness: completeness,
    fields_present: present,
    fields_total: COMPLETENESS_FIELDS.length,
    missing_fields: missingFields,
    completeness_meaning: 'Percentage of intelligence fields populated. Used to tell a student what to complete next. NOT a quality or eligibility judgement and never used to rank students.',
    strengths,
    gaps,
    recommendations,
    calculated_at: new Date().toISOString()
  };
}

module.exports = { calculate, SCORE_VERSION, COMPLETENESS_FIELDS, ACHIEVEMENT_POINTS };
