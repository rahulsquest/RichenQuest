import React, { useState } from 'react';
import { User, GraduationCap, Globe, Award, ShieldCheck, Check, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input, Select } from '../../components/Input';
import Button from '../../components/Button';
import { Card } from '../../components/Card';
import { ZohoSyncBadge } from '../../components/FileUpload';
import studentService from '../../services/studentService';
import zohoService from '../../services/zohoService';
import ProfileScoreCard from '../../components/ProfileScoreCard';
import { TARGET_COUNTRIES, DEGREE_LEVELS } from '../../constants/entities';

export default function Profile() {
  const { student, setStudent } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    email: student?.email || '',
    phone: student?.phone || '',
    countryOfCitizenship: student?.countryOfCitizenship || 'India',
    currentLocation: student?.currentLocation || '',
    targetDegree: student?.targetDegree || 'Master of Science (MSc)',
    targetMajor: student?.targetMajor || 'Computer Science',
    targetIntake: student?.targetIntake || 'Autumn 2026',
    highestQualification: student?.academicHistory?.highestQualification || '',
    institution: student?.academicHistory?.institution || '',
    cgpa: student?.academicHistory?.cgpa || '',
    graduationYear: student?.academicHistory?.graduationYear || '',
    ieltsScore: student?.academicHistory?.englishProficiency?.overallBand || '7.5',
    greScore: student?.academicHistory?.standardizedTest?.score || '324'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = {
        fullName: formData.fullName,
        phone: formData.phone,
        countryOfCitizenship: formData.countryOfCitizenship,
        currentLocation: formData.currentLocation,
        targetDegree: formData.targetDegree,
        targetMajor: formData.targetMajor,
        targetIntake: formData.targetIntake,
        academicHistory: {
          ...student?.academicHistory,
          highestQualification: formData.highestQualification,
          institution: formData.institution,
          cgpa: formData.cgpa,
          graduationYear: formData.graduationYear,
          englishProficiency: {
            ...student?.academicHistory?.englishProficiency,
            overallBand: formData.ieltsScore
          },
          standardizedTest: {
            ...student?.academicHistory?.standardizedTest,
            score: formData.greScore
          }
        }
      };

      const updated = await studentService.updateStudent(student?.studentId, updates);
      setStudent(updated);
      addToast('Profile updated successfully and synced with Zoho Data Store.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCrm = async () => {
    setSyncing(true);
    try {
      const res = await zohoService.syncStudent(student?.studentId);
      if (res?.data) {
        setStudent(res.data);
      }
    } catch (err) {
      addToast(err.message || 'CRM service is temporarily unavailable.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header with Zoho CRM Sync status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600">
            Student ID: {student?.studentId}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Student Profile & Academic Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep your academic scores and study interests up to date for counselor evaluation.
          </p>
        </div>

        {/* <div className="flex items-center gap-3">
          <ZohoSyncBadge
            synced={Boolean(student?.zohoCrmSyncStatus?.synced)}
            crmId={student?.zohoCrmSyncStatus?.crmContactId}
          />
          <Button
            size="sm"
            variant="secondary"
            loading={syncing}
            onClick={handleSyncCrm}
            icon={RefreshCw}
            className="text-xs"
          >
            Sync with CRM
          </Button>
        </div> */}
      </div>

      <ProfileScoreCard />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <Card title="1. Personal & Contact Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Email Address"
              name="email"
              value={formData.email}
              disabled
              helperText="Managed via Zoho Authentication"
            />
            <Input
              label="Phone / WhatsApp Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <Select
              label="Country of Citizenship"
              name="countryOfCitizenship"
              value={formData.countryOfCitizenship}
              onChange={handleChange}
              options={TARGET_COUNTRIES}
              required
            />
            <Input
              label="Current Residence City & Country"
              name="currentLocation"
              value={formData.currentLocation}
              onChange={handleChange}
              placeholder="e.g. London, United Kingdom"
            />
          </div>
        </Card>

        {/* Academic Profile */}
        <Card title="2. Academic Qualifications & Test Scores">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Highest Qualification Attained"
              name="highestQualification"
              value={formData.highestQualification}
              onChange={handleChange}
              placeholder="e.g. BTech in Computer Science"
              required
            />
            <Input
              label="College / Institution Name"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              placeholder="e.g. National Institute of Technology"
              required
            />
            <Input
              label="CGPA / Percentage Score"
              name="cgpa"
              value={formData.cgpa}
              onChange={handleChange}
              placeholder="e.g. 8.85 / 10.0"
              required
            />
            <Input
              label="Graduation Year"
              name="graduationYear"
              value={formData.graduationYear}
              onChange={handleChange}
              placeholder="e.g. 2025"
            />
            <Input
              label="English Test Band (IELTS / TOEFL / PTE)"
              name="ieltsScore"
              value={formData.ieltsScore}
              onChange={handleChange}
              placeholder="e.g. IELTS 7.5 (L:8.0, R:8.0, W:7.0, S:7.0)"
            />
            <Input
              label="Standardized Test (GRE / GMAT)"
              name="greScore"
              value={formData.greScore}
              onChange={handleChange}
              placeholder="e.g. GRE 324 (Q:168, V:156)"
            />
          </div>
        </Card>

        {/* Study Intent */}
        <Card title="3. Target Program & Intake Preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Degree Level"
              name="targetDegree"
              value={formData.targetDegree}
              onChange={handleChange}
              options={DEGREE_LEVELS}
              required
            />
            <Input
              label="Target Major / Field of Study"
              name="targetMajor"
              value={formData.targetMajor}
              onChange={handleChange}
              placeholder="e.g. Artificial Intelligence, Finance, LLM"
              required
            />
            <Input
              label="Target Intake"
              name="targetIntake"
              value={formData.targetIntake}
              onChange={handleChange}
              placeholder="e.g. Autumn 2026"
            />
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            loading={loading}
            variant="primary"
            size="lg"
            icon={Save}
          >
            Save & Sync Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
