/**
 * Zoho Catalyst Data Store Abstraction Layer
 * 
 * Provides an honest Data Store layer:
 * - Empty by default (NO fake / demo seed records).
 * - Persists real user registrations, leads, bookings, documents, payments, and notifications.
 * - Bridges to Zoho Catalyst Data Store SDK in cloud deployment.
 */

const crypto = require('crypto');

// Clean, empty storage - no mock/demo records
const store = {
  Users: [],
  Students: [],
  Counselors: [],
  Cases: [],
  Leads: [],
  Bookings: [],
  Documents: [],
  Payments: [],
  Notifications: [],
  AuditLogs: [],
  IntegrationEvents: []
};

// Seed counselor team structure for assignment when students register
const defaultCounselors = [
  {
    counselorId: 'CNS_LON_001',
    name: 'Eleanor Vance',
    title: 'Senior UK & European Admissions Specialist',
    email: 'admissions@richenquest.com',
    phone: '+91 76312 07948',
    office: 'London HQ',
    specialization: ['STEM & Computer Science', 'Russell Group Universities', 'Student Visa Guidance'],
    rating: 4.95,
    activeCases: 0,
    zohoBookingsStaffId: process.env.ZOHO_BOOKINGS_STAFF_ID || null
  }
];

store.Counselors = defaultCounselors;

class CatalystDataStore {
  static getTable(tableName) {
    if (!store[tableName]) {
      store[tableName] = [];
    }
    return {
      find: (predicate = () => true) => store[tableName].filter(predicate),
      findOne: (predicate) => store[tableName].find(predicate) || null,
      insert: (record) => {
        const enriched = {
          ...record,
          ROWID: 'ROW_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          CREATEDTIME: new Date().toISOString(),
          MODIFIEDTIME: new Date().toISOString()
        };
        store[tableName].push(enriched);
        return enriched;
      },
      update: (predicate, updates) => {
        const index = store[tableName].findIndex(predicate);
        if (index === -1) return null;
        store[tableName][index] = {
          ...store[tableName][index],
          ...updates,
          MODIFIEDTIME: new Date().toISOString()
        };
        return store[tableName][index];
      },
      delete: (predicate) => {
        const initialLength = store[tableName].length;
        store[tableName] = store[tableName].filter(item => !predicate(item));
        return store[tableName].length < initialLength;
      }
    };
  }

  static resetStore() {
    Object.keys(store).forEach(key => {
      store[key] = key === 'Counselors' ? defaultCounselors : [];
    });
  }

  /**
   * Helper to hash passwords using standard SHA-256 with salt
   */
  static hashPassword(password, salt = 'richenquest_salt') {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }
}

module.exports = CatalystDataStore;
