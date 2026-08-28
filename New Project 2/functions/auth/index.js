/**
 * Zoho Catalyst Function: Auth
 * Handles real authentication, student registration, token verification, password reset, and CRM contact sync.
 */

const crypto = require('crypto');
const CatalystDataStore = require('../shared/dataStore');
const { sendSuccess, sendError } = require('../shared/response');
const ZohoClient = require('../shared/zohoClient');
const consent = require('../shared/consent');

const usersTable = CatalystDataStore.getTable('Users');
const studentsTable = CatalystDataStore.getTable('Students');
const counselorsTable = CatalystDataStore.getTable('Counselors');

// Simple session token generator & verifier for local & production runtime
function generateToken(user) {
  const payload = {
    userId: user.userId,
    studentId: user.studentId,
    email: user.email,
    role: user.role,
    issuedAt: Date.now()
  };
  const str = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', require('../shared/session').signingKey()).update(str).digest('hex');
  return Buffer.from(str).toString('base64') + '.' + signature;
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  try {
    const jsonStr = Buffer.from(parts[0], 'base64').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', require('../shared/session').signingKey()).update(jsonStr).digest('hex');
    if (expectedSig !== parts[1]) return null;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function handleAuth(req, res) {
  const method = req.method;
  const path = req.path || '';

  // POST /api/auth/login
  if (method === 'POST' && (path === '/login' || path === '')) {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Email and password are required.', 400);
    }

    const user = usersTable.findOne(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email address or password.', 401);
    }

    const hashedPassword = CatalystDataStore.hashPassword(password);
    if (user.password !== hashedPassword) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email address or password.', 401);
    }

    // Update last login
    usersTable.update(u => u.userId === user.userId, { lastLogin: new Date().toISOString() });

    const student = studentsTable.findOne(s => s.studentId === user.studentId || s.userId === user.userId);
    const counselor = student?.counselorId ? counselorsTable.findOne(c => c.counselorId === student.counselorId) : null;
    const token = generateToken(user);

    return sendSuccess(res, {
      token,
      user: {
        userId: user.userId,
        studentId: user.studentId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: Boolean(user.isEmailVerified)
      },
      student: student || null,
      counselor: counselor || null
    }, 'Authentication successful.');
  }

  // POST /api/auth/signup
  if (method === 'POST' && path === '/signup') {
    const { fullName, email, password, phone, countryOfCitizenship, targetDegree, targetCountries, consentGiven } = req.body || {};
    if (!fullName || !email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Full name, email, and password are required.', 400);
    }

    /*  WAITING FOR LEGAL APPROVAL — inert while consent.isReady() is false,
     *  which it is today. No behavior change until it flips (see
     *  shared/consent.js). Once it does, no record of any kind — not the
     *  local account, not the CRM Contact — is created without consent;
     *  refusing here means nothing downstream needs its own check. */
    if (consent.isReady() && !consentGiven) {
      return sendError(res, 'CONSENT_REQUIRED',
        'Please review and accept the consent statement to create an account.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = usersTable.findOne(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return sendError(res, 'EMAIL_EXISTS', 'An account with this email address already exists. Please sign in.', 409);
    }

    const studentId = `STU_RQ_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = `USR_${Date.now()}`;
    const caseId = `CASE_RQ_${new Date().getFullYear()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultCounselor = counselorsTable.find()[0];

    const newUser = usersTable.insert({
      userId,
      studentId,
      email: normalizedEmail,
      password: CatalystDataStore.hashPassword(password),
      role: 'student',
      fullName: fullName.trim(),
      isEmailVerified: false,
      verificationToken: crypto.randomBytes(24).toString('hex'),
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });

    const newStudent = studentsTable.insert({
      studentId,
      userId,
      leadId: null,
      caseId,
      counselorId: defaultCounselor?.counselorId || null,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      countryOfCitizenship: countryOfCitizenship || '',
      currentLocation: countryOfCitizenship || '',
      targetDegree: targetDegree || 'Master of Science (MSc)',
      targetMajor: '',
      targetIntake: 'Autumn 2026',
      targetCountries: targetCountries || ['United Kingdom'],
      targetUniversities: [],
      academicHistory: {
        highestQualification: '',
        institution: '',
        cgpa: '',
        graduationYear: '',
        englishProficiency: { test: 'IELTS / TOEFL', overallBand: '' },
        standardizedTest: { test: 'None', score: '' }
      },
      nextAction: {
        id: 'ACT_PROFILE_01',
        title: 'Complete Your Academic Profile',
        description: 'Provide your degree background and university preferences to enable counselor assignment.',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        actionType: 'PROFILE_COMPLETION',
        targetRoute: '/profile',
        priority: 'HIGH'
      },
      journeyStage: 'Profile Onboarding',
      journeyStepIndex: 1,
      totalJourneySteps: 10,
      zohoCrmSyncStatus: {
        synced: false,
        crmContactId: null,
        lastSyncTimestamp: null
      }
    });

    // Create Initial Case record
    CatalystDataStore.getTable('Cases').insert({
      caseId,
      studentId,
      counselorId: defaultCounselor?.counselorId || null,
      status: 'INITIATED',
      stage: 'Profile Onboarding',
      startDate: new Date().toISOString().split('T')[0],
      targetIntake: 'Autumn 2026',
      milestones: [
        { id: 'M1', name: 'Profile Evaluation', completed: false, inProgress: true },
        { id: 'M2', name: 'Counseling Consultation', completed: false },
        { id: 'M3', name: 'University Shortlisting', completed: false },
        { id: 'M4', name: 'Document & SOP Review', completed: false },
        { id: 'M5', name: 'University Application Filing', completed: false },
        { id: 'M6', name: 'Offer Evaluation', completed: false },
        { id: 'M7', name: 'Financial Assessment & CAS', completed: false },
        { id: 'M8', name: 'Visa Application', completed: false },
        { id: 'M9', name: 'Pre-Departure Briefing', completed: false }
      ]
    });

    // Send Welcome Notification
    CatalystDataStore.getTable('Notifications').insert({
      notificationId: `NTF_${Date.now()}`,
      studentId,
      type: 'SYSTEM_NOTIFICATION',
      title: 'Welcome to RichenQuest!',
      message: 'Your student account has been created. Complete your academic details to get matched with your admissions counselor.',
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/profile'
    });

    /*  1. Sync Contact to Zoho CRM (avoiding duplicates).
     *
     *  BUG FIXED HERE, found by tracing the handoff end to end.
     *  On success this only ever recorded zohoCrmSyncStatus on the Students
     *  table. Every route that actually needs the CRM link — /profile-score,
     *  /opportunities, /roadmap, /report, /mentor, /profile, /request, and
     *  payments' invoice path — reads leadId (and crmModule) from the USERS
     *  table via identify()/requireStudent.js, which this callback never
     *  touched. Users never gets a leadId field written anywhere else in
     *  this codebase (confirmed by tracing every write of it). Result:
     *  those routes returned "not yet linked to a student file" forever,
     *  for every student, independent of whether CRM credentials/sync were
     *  actually working — a structural gap, not a credentials problem.
     *  upsertContact() writes to Contacts (crm/v3/Contacts), not Leads, so
     *  crmModule is set to match what was actually synced. */
    /* consent.record() only when the gate is actually on and consent was
     * actually given — spreading {} when not is a no-op, so this line adds
     * nothing to the object while isReady() is false. */
    const contactPayload = consent.isReady() && consentGiven
      ? { ...newStudent, ...consent.record() }
      : newStudent;

    ZohoClient.syncContactToCrm(contactPayload).then(crmRes => {
      if (crmRes?.crmContactId) {
        studentsTable.update(s => s.studentId === studentId, {
          zohoCrmSyncStatus: {
            synced: true,
            crmContactId: crmRes.crmContactId,
            lastSyncTimestamp: new Date().toISOString()
          }
        });
        usersTable.update(u => u.userId === userId, {
          leadId: crmRes.crmContactId,
          crmModule: 'Contacts'
        });
      }
    }).catch(err => console.error('[Auth CRM Sync Error]:', err.message));

    // 2. Emit Zoho Flow Registration Event
    ZohoClient.emitFlowEvent('STUDENT_REGISTERED', {
      studentId,
      userId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone,
      targetDegree,
      targetCountries
    });

    const token = generateToken(newUser);

    return sendSuccess(res, {
      token,
      user: {
        userId: newUser.userId,
        studentId: newUser.studentId,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isEmailVerified: false
      },
      student: newStudent,
      counselor: defaultCounselor || null
    }, 'Student registration completed successfully.', 201);
  }

  // GET /api/me (Current Authenticated User)
  if (method === 'GET' && (path === '/me' || path === '')) {
    const authHeader = req.headers?.authorization;
    const session = verifyToken(authHeader);

    if (!session) {
      return sendError(res, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.', 401);
    }

    const user = usersTable.findOne(u => u.userId === session.userId || u.email.toLowerCase() === session.email.toLowerCase());
    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User record no longer exists.', 404);
    }

    const student = studentsTable.findOne(s => s.studentId === user.studentId || s.userId === user.userId);
    const counselor = student?.counselorId ? counselorsTable.findOne(c => c.counselorId === student.counselorId) : null;

    return sendSuccess(res, {
      user: {
        userId: user.userId,
        studentId: user.studentId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: Boolean(user.isEmailVerified)
      },
      student: student || null,
      counselor: counselor || null
    }, 'Current user profile retrieved.');
  }

  // POST /api/auth/reset-password
  if (method === 'POST' && path === '/reset-password') {
    const { email } = req.body || {};
    if (!email) {
      return sendError(res, 'VALIDATION_ERROR', 'Email address is required.', 400);
    }

    const user = usersTable.findOne(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (user) {
      const resetToken = crypto.randomBytes(24).toString('hex');
      usersTable.update(u => u.userId === user.userId, { resetToken, resetTokenExpiry: Date.now() + 3600000 });

      // Emit Zoho Flow event for password reset email delivery
      ZohoClient.emitFlowEvent('PASSWORD_RESET_REQUESTED', {
        userId: user.userId,
        email: user.email,
        resetToken
      });
    }

    // Always return success for security (prevents user enumeration)
    return sendSuccess(res, {}, 'If an account exists with this email address, a password reset link has been dispatched.');
  }

  // POST /api/auth/verify-email
  if (method === 'POST' && path === '/verify-email') {
    const { token } = req.body || {};
    if (!token) {
      return sendError(res, 'VALIDATION_ERROR', 'Verification token is required.', 400);
    }

    const user = usersTable.findOne(u => u.verificationToken === token);
    if (!user) {
      return sendError(res, 'INVALID_TOKEN', 'Verification token is invalid or has expired.', 400);
    }

    usersTable.update(u => u.userId === user.userId, { isEmailVerified: true, verificationToken: null });
    return sendSuccess(res, {}, 'Email address verified successfully.');
  }

  // POST /api/auth/logout
  if (method === 'POST' && path === '/logout') {
    return sendSuccess(res, {}, 'Logged out successfully.');
  }

  return sendError(res, 'NOT_FOUND', 'Auth endpoint not found.', 404);
}

module.exports = handleAuth;
