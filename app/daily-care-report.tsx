// ============================================================================
// DAILY CARE REPORT - Standardized Clinical Summary
// PDF-first, print-friendly report for family/professional sharing
// Single-column, skimmable - readable in under 60 seconds
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

import { Colors, Spacing, BorderRadius } from '../theme/theme-tokens';
import { getMedications, Medication } from '../utils/medicationStorage';
import { getUpcomingAppointments, Appointment } from '../utils/appointmentStorage';
import {
  getTodayVitalsLog,
  getTodayMoodLog,
  getTodayMealsLog,
  getTodayNotesLog,
} from '../utils/centralStorage';
import { getCareActivities, CareActivity } from '../utils/collaborativeCare';

// ============================================================================
// TYPES
// ============================================================================

interface ReportData {
  // Header
  patientName: string;
  caregiverName: string;
  generatedAt: Date;

  // Completion summary
  summary: {
    medsCompleted: number;
    medsTotal: number;
    vitalsLogged: boolean;
    mealsLogged: number;
    appointmentsToday: number;
  };

  // Medications
  medications: {
    name: string;
    dose: string;
    scheduledTime: string;
    status: 'taken' | 'missed' | 'pending';
    timeTaken?: string;
  }[];

  // Vitals
  vitals: {
    type: string;
    value: string;
    unit: string;
    time: string;
    withinRange: boolean | null;
  }[];

  // Appointments
  appointments: {
    type: string;
    provider: string;
    time: string;
    date: string;
    isToday: boolean;
  }[];

  // Notes
  notes: {
    text: string;
    timestamp: string;
  }[];

  // Care team activity
  teamActivity: {
    person: string;
    action: string;
    time: string;
  }[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DailyCareReportScreen() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      // Load patient and caregiver names
      const patientName = await AsyncStorage.getItem('@embermate_patient_name') || 'Patient';
      const caregiverName = await AsyncStorage.getItem('@embermate_caregiver_name') || 'Primary Caregiver';

      // Load medications
      const meds = await getMedications();
      const activeMeds = meds.filter(m => m.active);
      const medicationData = activeMeds.map(med => ({
        name: med.name,
        dose: med.dosage || 'As directed',
        scheduledTime: formatTimeSlot(med.timeSlot),
        status: med.taken ? 'taken' as const : isOverdue(med.timeSlot) ? 'missed' as const : 'pending' as const,
        timeTaken: med.taken && med.lastTaken ? format(new Date(med.lastTaken), 'h:mm a') : undefined,
      }));

      // Load vitals
      const vitalsLog = await getTodayVitalsLog();
      const vitalsData: ReportData['vitals'] = [];
      if (vitalsLog) {
        if (vitalsLog.systolic && vitalsLog.diastolic) {
          vitalsData.push({
            type: 'Blood Pressure',
            value: `${vitalsLog.systolic}/${vitalsLog.diastolic}`,
            unit: 'mmHg',
            time: vitalsLog.timestamp ? format(new Date(vitalsLog.timestamp), 'h:mm a') : 'Today',
            withinRange: isBloodPressureNormal(vitalsLog.systolic, vitalsLog.diastolic),
          });
        }
        if (vitalsLog.heartRate) {
          vitalsData.push({
            type: 'Heart Rate',
            value: String(vitalsLog.heartRate),
            unit: 'bpm',
            time: vitalsLog.timestamp ? format(new Date(vitalsLog.timestamp), 'h:mm a') : 'Today',
            withinRange: vitalsLog.heartRate >= 60 && vitalsLog.heartRate <= 100,
          });
        }
        if (vitalsLog.temperature) {
          vitalsData.push({
            type: 'Temperature',
            value: String(vitalsLog.temperature),
            unit: '\u00B0F',
            time: vitalsLog.timestamp ? format(new Date(vitalsLog.timestamp), 'h:mm a') : 'Today',
            withinRange: vitalsLog.temperature >= 97.0 && vitalsLog.temperature <= 99.0,
          });
        }
        if (vitalsLog.oxygenSaturation) {
          vitalsData.push({
            type: 'Oxygen Saturation',
            value: String(vitalsLog.oxygenSaturation),
            unit: '%',
            time: vitalsLog.timestamp ? format(new Date(vitalsLog.timestamp), 'h:mm a') : 'Today',
            withinRange: vitalsLog.oxygenSaturation >= 95,
          });
        }
        if (vitalsLog.weight) {
          vitalsData.push({
            type: 'Weight',
            value: String(vitalsLog.weight),
            unit: 'lbs',
            time: vitalsLog.timestamp ? format(new Date(vitalsLog.timestamp), 'h:mm a') : 'Today',
            withinRange: null, // No standard range for weight
          });
        }
      }

      // Load appointments
      const allAppointments = await getUpcomingAppointments();
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const appointmentData = allAppointments.slice(0, 5).map(appt => ({
        type: appt.specialty || 'Appointment',
        provider: appt.provider || 'Provider',
        time: appt.time || 'Time not set',
        date: format(new Date(appt.date), 'MMM d, yyyy'),
        isToday: appt.date === todayStr,
      }));
      const appointmentsToday = appointmentData.filter(a => a.isToday).length;

      // Load notes
      const notesLog = await getTodayNotesLog();
      const notesData: ReportData['notes'] = [];
      if (notesLog?.notes && Array.isArray(notesLog.notes)) {
        notesLog.notes.forEach((note: any) => {
          if (note.text) {
            notesData.push({
              text: note.text,
              timestamp: note.timestamp ? format(new Date(note.timestamp), 'h:mm a') : 'Today',
            });
          }
        });
      }

      // Load care team activity
      const activities = await getCareActivities(10);
      const todayActivities = activities.filter(a => {
        const actDate = format(new Date(a.timestamp), 'yyyy-MM-dd');
        return actDate === todayStr;
      });
      const teamActivityData = todayActivities.map(act => ({
        person: act.performedBy,
        action: getActivityDescription(act),
        time: format(new Date(act.timestamp), 'h:mm a'),
      }));

      // Calculate summary
      const medsCompleted = medicationData.filter(m => m.status === 'taken').length;
      const mealsLog = await getTodayMealsLog();
      const mealsLogged = mealsLog?.meals?.length || 0;

      setReportData({
        patientName,
        caregiverName,
        generatedAt: new Date(),
        summary: {
          medsCompleted,
          medsTotal: medicationData.length,
          vitalsLogged: vitalsData.length > 0,
          mealsLogged,
          appointmentsToday,
        },
        medications: medicationData,
        vitals: vitalsData,
        appointments: appointmentData,
        notes: notesData,
        teamActivity: teamActivityData,
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlainText = (): string => {
    if (!reportData) return '';

    const lines: string[] = [];
    const divider = '─'.repeat(50);

    // Header
    lines.push(divider);
    lines.push('DAILY CARE REPORT');
    lines.push(divider);
    lines.push(`Patient: ${reportData.patientName}`);
    lines.push(`Generated: ${format(reportData.generatedAt, 'MMMM d, yyyy')} at ${format(reportData.generatedAt, 'h:mm a')}`);
    lines.push(`Prepared by: ${reportData.caregiverName}`);
    lines.push('');

    // Today at a Glance
    lines.push(divider);
    lines.push('TODAY AT A GLANCE');
    lines.push(divider);
    lines.push(`Medications: ${reportData.summary.medsCompleted} of ${reportData.summary.medsTotal} taken`);
    lines.push(`Vitals: ${reportData.summary.vitalsLogged ? 'Recorded' : 'Not recorded'}`);
    lines.push(`Meals: ${reportData.summary.mealsLogged} logged`);
    lines.push(`Appointments today: ${reportData.summary.appointmentsToday}`);
    lines.push('');

    // Medications
    if (reportData.medications.length > 0) {
      lines.push(divider);
      lines.push('MEDICATIONS');
      lines.push(divider);
      reportData.medications.forEach(med => {
        const statusText = med.status === 'taken'
          ? `TAKEN${med.timeTaken ? ` at ${med.timeTaken}` : ''}`
          : med.status === 'missed'
            ? 'MISSED'
            : 'PENDING';
        lines.push(`${med.name} (${med.dose})`);
        lines.push(`  Scheduled: ${med.scheduledTime}`);
        lines.push(`  Status: ${statusText}`);
        lines.push('');
      });
    }

    // Vitals
    if (reportData.vitals.length > 0) {
      lines.push(divider);
      lines.push('VITALS');
      lines.push(divider);
      reportData.vitals.forEach(vital => {
        const rangeText = vital.withinRange === null
          ? ''
          : vital.withinRange
            ? ' (within usual range)'
            : ' (outside usual range)';
        lines.push(`${vital.type}: ${vital.value} ${vital.unit}${rangeText}`);
        lines.push(`  Recorded: ${vital.time}`);
        lines.push('');
      });
    }

    // Appointments
    if (reportData.appointments.length > 0) {
      lines.push(divider);
      lines.push('APPOINTMENTS');
      lines.push(divider);
      reportData.appointments.forEach(appt => {
        const todayMarker = appt.isToday ? ' [TODAY]' : '';
        lines.push(`${appt.type} - ${appt.provider}${todayMarker}`);
        lines.push(`  ${appt.date} at ${appt.time}`);
        lines.push('');
      });
    }

    // Notes
    if (reportData.notes.length > 0) {
      lines.push(divider);
      lines.push('CAREGIVER NOTES');
      lines.push(divider);
      reportData.notes.forEach(note => {
        lines.push(`[${note.timestamp}] ${note.text}`);
        lines.push('');
      });
    }

    // Care Team Activity
    if (reportData.teamActivity.length > 0) {
      lines.push(divider);
      lines.push('CARE TEAM ACTIVITY TODAY');
      lines.push(divider);
      reportData.teamActivity.forEach(act => {
        lines.push(`${act.time} - ${act.person} ${act.action}`);
      });
      lines.push('');
    }

    // Footer
    lines.push(divider);
    lines.push('PRIVACY NOTICE');
    lines.push(divider);
    lines.push('This report was intentionally shared by the primary caregiver.');
    lines.push('Access to care information is controlled and limited to');
    lines.push('authorized family members and care professionals only.');
    lines.push('');
    lines.push(`Report ID: ${format(reportData.generatedAt, 'yyyyMMdd-HHmmss')}`);

    return lines.join('\n');
  };

  const generateHTML = (): string => {
    if (!reportData) return '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daily Care Report - ${reportData.patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 0.5in;
      max-width: 8.5in;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
    }
    .header h1 {
      font-size: 18pt;
      font-weight: 600;
      margin-bottom: 8pt;
    }
    .header-meta {
      font-size: 11pt;
      color: #444;
    }
    .header-meta p {
      margin: 2pt 0;
    }
    .section {
      margin-bottom: 20pt;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #333;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4pt;
      margin-bottom: 10pt;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
    }
    .summary-item {
      font-size: 11pt;
    }
    .summary-label {
      color: #666;
    }
    .summary-value {
      font-weight: 600;
    }
    .med-item, .vital-item, .appt-item, .note-item, .activity-item {
      padding: 8pt 0;
      border-bottom: 1px solid #eee;
    }
    .med-item:last-child, .vital-item:last-child, .appt-item:last-child,
    .note-item:last-child, .activity-item:last-child {
      border-bottom: none;
    }
    .med-name {
      font-weight: 600;
      font-size: 11pt;
    }
    .med-details {
      font-size: 10pt;
      color: #666;
      margin-top: 2pt;
    }
    .status-taken {
      color: #059669;
      font-weight: 600;
    }
    .status-missed {
      color: #dc2626;
      font-weight: 600;
    }
    .status-pending {
      color: #d97706;
      font-weight: 600;
    }
    .vital-value {
      font-weight: 600;
      font-size: 11pt;
    }
    .vital-range {
      font-size: 10pt;
      color: #666;
    }
    .range-normal {
      color: #059669;
    }
    .range-abnormal {
      color: #dc2626;
    }
    .appt-type {
      font-weight: 600;
    }
    .appt-today {
      background: #fef3c7;
      padding: 2pt 6pt;
      font-size: 9pt;
      font-weight: 600;
      color: #92400e;
      margin-left: 6pt;
    }
    .note-time {
      font-size: 10pt;
      color: #666;
    }
    .note-text {
      font-size: 11pt;
      margin-top: 2pt;
    }
    .footer {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      color: #666;
    }
    .footer-title {
      font-weight: 600;
      font-size: 10pt;
      color: #333;
      margin-bottom: 4pt;
    }
    .report-id {
      margin-top: 8pt;
      font-family: monospace;
      font-size: 9pt;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Daily Care Report</h1>
    <div class="header-meta">
      <p><strong>Patient:</strong> ${reportData.patientName}</p>
      <p><strong>Date:</strong> ${format(reportData.generatedAt, 'MMMM d, yyyy')} at ${format(reportData.generatedAt, 'h:mm a')}</p>
      <p><strong>Prepared by:</strong> ${reportData.caregiverName}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Today at a Glance</div>
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">Medications:</span>
        <span class="summary-value">${reportData.summary.medsCompleted} of ${reportData.summary.medsTotal} taken</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Vitals:</span>
        <span class="summary-value">${reportData.summary.vitalsLogged ? 'Recorded' : 'Not recorded'}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Meals logged:</span>
        <span class="summary-value">${reportData.summary.mealsLogged}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Appointments today:</span>
        <span class="summary-value">${reportData.summary.appointmentsToday}</span>
      </div>
    </div>
  </div>

  ${reportData.medications.length > 0 ? `
  <div class="section">
    <div class="section-title">Medications</div>
    ${reportData.medications.map(med => `
      <div class="med-item">
        <div class="med-name">${med.name}</div>
        <div class="med-details">
          ${med.dose} | Scheduled: ${med.scheduledTime} |
          <span class="status-${med.status}">
            ${med.status === 'taken'
              ? `Taken${med.timeTaken ? ` at ${med.timeTaken}` : ''}`
              : med.status === 'missed'
                ? 'Missed'
                : 'Pending'}
          </span>
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportData.vitals.length > 0 ? `
  <div class="section">
    <div class="section-title">Vitals</div>
    ${reportData.vitals.map(vital => `
      <div class="vital-item">
        <span class="vital-value">${vital.type}: ${vital.value} ${vital.unit}</span>
        ${vital.withinRange !== null ? `
          <span class="vital-range ${vital.withinRange ? 'range-normal' : 'range-abnormal'}">
            (${vital.withinRange ? 'within usual range' : 'outside usual range'})
          </span>
        ` : ''}
        <div class="med-details">Recorded: ${vital.time}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportData.appointments.length > 0 ? `
  <div class="section">
    <div class="section-title">Appointments</div>
    ${reportData.appointments.map(appt => `
      <div class="appt-item">
        <span class="appt-type">${appt.type}</span>
        ${appt.isToday ? '<span class="appt-today">TODAY</span>' : ''}
        <div class="med-details">${appt.provider} | ${appt.date} at ${appt.time}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportData.notes.length > 0 ? `
  <div class="section">
    <div class="section-title">Caregiver Notes</div>
    ${reportData.notes.map(note => `
      <div class="note-item">
        <div class="note-time">${note.timestamp}</div>
        <div class="note-text">${note.text}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportData.teamActivity.length > 0 ? `
  <div class="section">
    <div class="section-title">Care Team Activity Today</div>
    ${reportData.teamActivity.map(act => `
      <div class="activity-item">
        <strong>${act.time}</strong> - ${act.person} ${act.action}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-title">Privacy Notice</div>
    <p>This report was intentionally shared by the primary caregiver. Access to care information is controlled and limited to authorized family members and care professionals only.</p>
    <div class="report-id">Report ID: ${format(reportData.generatedAt, 'yyyyMMdd-HHmmss')}</div>
  </div>
</body>
</html>
    `;
  };

  const handleShareText = async () => {
    const text = generatePlainText();
    try {
      await Share.share({
        message: text,
        title: `Daily Care Report - ${reportData?.patientName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSharePDF = async () => {
    const html = generateHTML();
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Daily Care Report - ${reportData?.patientName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'PDF sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try sharing as text instead.');
    }
  };

  const handlePrint = async () => {
    const html = generateHTML();
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Error', 'Failed to print report.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reportData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Unable to load report data</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()} accessibilityLabel="Close report" accessibilityRole="button">
          <Text style={styles.closeIcon}>x</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Care Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Report Preview */}
        <View style={styles.reportPreview}>
          {/* Patient Info */}
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Daily Care Report</Text>
            <View style={styles.reportMeta}>
              <Text style={styles.metaText}>Patient: {reportData.patientName}</Text>
              <Text style={styles.metaText}>
                {format(reportData.generatedAt, 'MMMM d, yyyy')} at {format(reportData.generatedAt, 'h:mm a')}
              </Text>
              <Text style={styles.metaText}>Prepared by: {reportData.caregiverName}</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY AT A GLANCE</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Medications</Text>
                <Text style={styles.summaryValue}>
                  {reportData.summary.medsCompleted}/{reportData.summary.medsTotal} taken
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Vitals</Text>
                <Text style={styles.summaryValue}>
                  {reportData.summary.vitalsLogged ? 'Recorded' : 'Not recorded'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Meals</Text>
                <Text style={styles.summaryValue}>{reportData.summary.mealsLogged} logged</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Appointments</Text>
                <Text style={styles.summaryValue}>{reportData.summary.appointmentsToday} today</Text>
              </View>
            </View>
          </View>

          {/* Medications */}
          {reportData.medications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MEDICATIONS</Text>
              {reportData.medications.map((med, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.itemName}>{med.name}</Text>
                  <Text style={styles.itemDetails}>
                    {med.dose} | {med.scheduledTime}
                  </Text>
                  <Text style={[
                    styles.itemStatus,
                    med.status === 'taken' && styles.statusTaken,
                    med.status === 'missed' && styles.statusMissed,
                    med.status === 'pending' && styles.statusPending,
                  ]}>
                    {med.status === 'taken'
                      ? `Taken${med.timeTaken ? ` at ${med.timeTaken}` : ''}`
                      : med.status === 'missed'
                        ? 'Missed'
                        : 'Pending'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Vitals */}
          {reportData.vitals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VITALS</Text>
              {reportData.vitals.map((vital, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.itemName}>
                    {vital.type}: {vital.value} {vital.unit}
                  </Text>
                  <Text style={styles.itemDetails}>Recorded: {vital.time}</Text>
                  {vital.withinRange !== null && (
                    <Text style={[
                      styles.rangeNote,
                      vital.withinRange ? styles.rangeNormal : styles.rangeAbnormal,
                    ]}>
                      {vital.withinRange ? 'Within usual range' : 'Outside usual range'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Appointments */}
          {reportData.appointments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>APPOINTMENTS</Text>
              {reportData.appointments.map((appt, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.apptHeader}>
                    <Text style={styles.itemName}>{appt.type}</Text>
                    {appt.isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>TODAY</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemDetails}>
                    {appt.provider} | {appt.date} at {appt.time}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          {reportData.notes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CAREGIVER NOTES</Text>
              {reportData.notes.map((note, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.noteTime}>{note.timestamp}</Text>
                  <Text style={styles.noteText}>{note.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Team Activity */}
          {reportData.teamActivity.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CARE TEAM ACTIVITY TODAY</Text>
              {reportData.teamActivity.map((act, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityTime}>{act.time}</Text> - {act.person} {act.action}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Privacy Notice</Text>
            <Text style={styles.footerText}>
              This report was intentionally shared by the primary caregiver. Access to care
              information is controlled and limited to authorized family members and care
              professionals only.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Share Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryAction} onPress={handleSharePDF} accessibilityLabel="Share as PDF" accessibilityRole="button">
          <Text style={styles.primaryActionText}>Share as PDF</Text>
        </TouchableOpacity>
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={handleShareText} accessibilityLabel="Share as text" accessibilityRole="button">
            <Text style={styles.secondaryActionText}>Share as Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={handlePrint} accessibilityLabel="Print report" accessibilityRole="button">
            <Text style={styles.secondaryActionText}>Print</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeSlot(timeSlot: string | undefined): string {
  if (!timeSlot) return 'As needed';
  const slots: Record<string, string> = {
    morning: 'Morning (6-10 AM)',
    midday: 'Midday (10 AM-2 PM)',
    afternoon: 'Afternoon (2-6 PM)',
    evening: 'Evening (6-9 PM)',
    bedtime: 'Bedtime (9 PM-12 AM)',
    overnight: 'Overnight (12-6 AM)',
  };
  return slots[timeSlot] || timeSlot;
}

function isOverdue(timeSlot: string | undefined): boolean {
  if (!timeSlot) return false;
  const now = new Date();
  const hour = now.getHours();

  const slotEndHours: Record<string, number> = {
    morning: 10,
    midday: 14,
    afternoon: 18,
    evening: 21,
    bedtime: 24,
    overnight: 6,
  };

  const endHour = slotEndHours[timeSlot];
  if (endHour === undefined) return false;

  return hour > endHour;
}

function isBloodPressureNormal(systolic: number, diastolic: number): boolean {
  // Normal: <120 systolic AND <80 diastolic
  // Elevated: 120-129 systolic AND <80 diastolic
  // High: >=130 systolic OR >=80 diastolic
  return systolic < 130 && diastolic < 80;
}

function getActivityDescription(activity: CareActivity): string {
  switch (activity.type) {
    case 'vital_logged':
      return `recorded ${activity.details?.vitalType || 'vitals'}`;
    case 'symptom_logged':
      return 'logged symptoms';
    case 'medication_taken':
      return 'logged medication';
    case 'medication_missed':
      return 'noted missed medication';
    case 'note_added':
      return activity.details?.action || 'added a note';
    case 'appointment_scheduled':
      return 'scheduled appointment';
    case 'appointment_completed':
      return 'completed appointment';
    default:
      return 'updated care information';
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  reportPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
  },
  reportHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 12,
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reportMeta: {
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    color: '#444',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemDetails: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statusTaken: {
    color: '#059669',
  },
  statusMissed: {
    color: '#dc2626',
  },
  statusPending: {
    color: '#d97706',
  },
  rangeNote: {
    fontSize: 10,
    marginTop: 2,
  },
  rangeNormal: {
    color: '#059669',
  },
  rangeAbnormal: {
    color: '#dc2626',
  },
  apptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#92400e',
  },
  noteTime: {
    fontSize: 10,
    color: '#666',
  },
  noteText: {
    fontSize: 11,
    color: '#1a1a1a',
    marginTop: 2,
  },
  activityText: {
    fontSize: 11,
    color: '#1a1a1a',
  },
  activityTime: {
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 13,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryAction: {
    backgroundColor: '#5EEAD4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});
