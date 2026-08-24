/**
 * RichenQuest Intelligence Service
 *
 * Reads the existing Deluge engines through the Node gateway. Every value these
 * endpoints return — FIT, confidence, eligibility, ranking, roadmap, report —
 * is produced by an engine in Zoho. Nothing is computed here, and nothing may be
 * recomputed in a component: a second implementation in React is how the number
 * a student sees stops matching the number the counsellor sees.
 *
 * Note there is no studentId argument anywhere in this file. The backend derives
 * identity from the signed session, so the browser has no id to pass and no id
 * to tamper with.
 */

import apiClient from './apiClient';

class IntelligenceService {
  /** studentDashboard — the whole home screen in one call. */
  async getHome() {
    const response = await apiClient.get('/home');
    return response.data;
  }

  /** studentIntelligence — canonical profile, strength, completeness. */
  async getProfile() {
    const response = await apiClient.get('/profile');
    return response.data;
  }

  /**
   * Only fields the student is allowed to own. The backend enforces the same
   * allowlist — this is a convenience, never the control.
   */
  async updateProfile(fields) {
    const response = await apiClient.post('/profile', fields);
    return response.data;
  }

  /**
   * matchOpportunities — returns `ranked` AND `not_rankable`.
   * `not_rankable` is not an error and must not be hidden: it carries
   * `why_excluded`, which is what makes an empty result honest instead of
   * mysterious.
   */
  async getOpportunities() {
    const response = await apiClient.get('/opportunities');
    return response.data;
  }

  /** studentRoadmap — now / 30d / 3m / 6m. */
  async getRoadmap() {
    const response = await apiClient.get('/roadmap');
    return response.data;
  }

  /** studentReport — student-facing lines, gated by `approved`. */
  async getReport() {
    const response = await apiClient.get('/report');
    return response.data;
  }

  /** matchMentor — verified_mentor_count drives the empty state. */
  async getMentor() {
    const response = await apiClient.get('/mentor');
    return response.data;
  }

  /**
   * Creates a real CRM follow-up task for the counsellor queue.
   * kind: profile_review | opportunity_review | country_guidance |
   *       application_guidance | mentor
   */
  async createRequest(kind, note = '') {
    const response = await apiClient.post('/request', { kind, note });
    return response.data;
  }
}

export const intelligenceService = new IntelligenceService();
export default intelligenceService;
