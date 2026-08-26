/**
 * Deterministic tests for codeKitchenScore.js against hand-computed
 * expected values, run with: node functions/shared/codeKitchenScore.test.js
 *
 * CRM is unavailable in this environment (see CATALYST-SUPPORT-REQUEST.md),
 * so these run the pure scoring function directly against synthetic
 * profile objects shaped like a real CRM Lead record — the same input
 * shape the live Deluge engine would receive. This proves the formula
 * itself is correct and deterministic; it does not claim CRM integration
 * is live.
 */
const assert = require('assert');
const { calculate, SCORE_VERSION } = require('./codeKitchenScore');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    pass++; console.log(`PASS  ${name}`);
  } catch (e) {
    fail++; console.log(`FAIL  ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

/* 1. Strong, complete student — every dimension near/at cap, every
 *    completeness field populated. Hand-computed: 30+20+20+15+15 = 100. */
const strong = {
  Last_Name: 'Rao', Email: 'a@x.invalid', Phone: '9', City: 'Pune',
  Current_Education: "Bachelor's", Academic_Percentage: 85,
  English_Status: '7.0', Passport_Status: 'Valid', Budget_Range: '20-35L',
  Interested_Level: 'Masters', Career_Goal: 'Data Science',
  Intended_Intake: 'Autumn 2026', Interested_Country: ['Germany'],
  Funding_Source: 'Self', Parent_Name: 'R', Referred_By_Name: 'F',
  Skills: ['Python', 'SQL', 'React', 'Docker', 'AWS'], Interests: ['AI'],
  Preferred_Domain: 'Computer Science', Project_Count: 3,
  Achievement_Level: 'International', Extracurriculars: ['Sports'],
  Languages_Spoken: ['English', 'Hindi', 'French']
};
const r1 = calculate(strong);
check('1. strong complete: profile_strength', r1.profile_strength, 100);
check('1. strong complete: completeness', r1.profile_completeness, 100);
check('1. strong complete: score_version', r1.score_version, SCORE_VERSION);
check('1. strong complete: no gaps', r1.gaps.length, 0);

/* 2. Weak academic profile — everything else absent too.
 *    45% -> below 60 -> 10; all other dims 0. Total 10. */
const weakAcademic = { Academic_Percentage: 45, Languages_Spoken: ['English'] };
const r2 = calculate(weakAcademic);
check('2. weak academic: profile_strength', r2.profile_strength, 10);
check('2. weak academic: academics evaluation_state', r2.dimensions.academics.evaluation_state, 'EVALUATED');
check('2. weak academic: skills NOT_PROVIDED', r2.dimensions.skills.evaluation_state, 'NOT_PROVIDED');

/* 3. Strong academics, weak projects.
 *    CGPA 8.5 -> 30; skills 3*5=15; projects 0 (Project_Count 0) -> 0;
 *    achievements National -> 12; extracurriculars+languages 8+7=15.
 *    Total 30+15+0+12+15 = 72. */
const strongAcadWeakProj = {
  Academic_Percentage: 8.5, Skills: ['Python', 'SQL', 'Excel'],
  Project_Count: 0, Achievement_Level: 'National',
  Extracurriculars: ['Music'], Languages_Spoken: ['English', 'Hindi']
};
const r3 = calculate(strongAcadWeakProj);
check('3. strong acad/weak proj: profile_strength', r3.profile_strength, 72);
check('3. strong acad/weak proj: projects gap listed', r3.gaps.some(g => g.dimension === 'projects'), true);
check('3. strong acad/weak proj: academics is a strength', r3.strengths.some(s => s.dimension === 'academics'), true);

/* 4. Strong profile, but most completeness fields missing (identity/goals
 *    left blank) -- proves strength and completeness are independent axes.
 *    Strength: 30+20+14+9+15 = 88 (skills 4*5=20, projects 2*7=14). */
const strongIncomplete = {
  Academic_Percentage: 90, Skills: ['A', 'B', 'C', 'D'], Project_Count: 2,
  Achievement_Level: 'State', Extracurriculars: ['Debate'],
  Languages_Spoken: ['English', 'Spanish']
};
const r4 = calculate(strongIncomplete);
check('4. strong but incomplete: profile_strength', r4.profile_strength, 88);
check('4. strong but incomplete: completeness is low', r4.profile_completeness < 50, true);
check('4. strong but incomplete: strength != completeness', r4.profile_strength !== r4.profile_completeness, true);

/* 5. Insufficient data -- nothing recorded at all. Matches the source
 *    doc's own live example: "D 0 (nothing recorded)". */
const empty = {};
const r5 = calculate(empty);
check('5. insufficient data: profile_strength', r5.profile_strength, 0);
check('5. insufficient data: completeness', r5.profile_completeness, 0);
check('5. insufficient data: all dims NOT_PROVIDED', Object.values(r5.dimensions).every(d => d.evaluation_state === 'NOT_PROVIDED'), true);
check('5. insufficient data: 5 gaps (every dimension)', r5.gaps.length, 5);

/* 6. Excellent profile strength, but opportunity-specific eligibility is
 *    explicitly out of scope for this engine -- proves the two are never
 *    blended. Same input as (1); assert no eligibility/match field leaks
 *    into this response at all. */
const r6 = calculate(strong);
check('6. excellent profile: no eligibility field present', 'eligibility_status' in r6, false);
check('6. excellent profile: no match_score field present', 'match_score' in r6, false);
check('6. excellent profile: no confidence field present', 'confidence' in r6, false);

/* Determinism: same input, same output, every time. */
const d1 = calculate(strong);
const d2 = calculate(strong);
check('determinism: two calls on identical input match (ignoring timestamp)',
  JSON.stringify({ ...d1, calculated_at: null }), JSON.stringify({ ...d2, calculated_at: null }));

/* "None yet" special case from the source: a skill/extracurricular list
 * that literally contains "None yet" scores the same as empty. */
const noneYet = { Skills: ['None yet'], Extracurriculars: ['None yet'] };
const r7 = calculate(noneYet);
check('"None yet" treated as no skills', r7.dimensions.skills.score, 0);
check('"None yet" treated as no extracurriculars', r7.dimensions.extracurriculars_and_languages.score, 0);

/* Achievement label exact string match, including the compound label. */
check('achievement "School / College" -> 3', calculate({ Achievement_Level: 'School / College' }).dimensions.achievements.score, 3);
check('unrecognised achievement label -> 0', calculate({ Achievement_Level: 'Something Else' }).dimensions.achievements.score, 0);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
