import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { LmsLiveTest, LmsLiveTestSubmission } from '../../models/lms';

export const LiveTestExporter = {
  buildExcelBase64(test: LmsLiveTest, ranked: LmsLiveTestSubmission[]): string {
    const rows = ranked.map((r, i) => ({
      Rank: r.rank > 0 ? r.rank : i + 1,
      'Student Name': r.studentName,
      Phone: r.phoneNumber,
      Email: r.email,
      Location: r.location,
      Correct: r.correctCount,
      Wrong: r.wrongCount,
      Attempted: r.attemptedCount,
      'Total Questions': r.totalQuestions,
      'Marks Obtained': r.marksObtained,
      Percentage: Number(r.percentage.toFixed(1)),
      'Submitted At': new Date(r.submittedAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  },

  async shareExcel(test: LmsLiveTest, ranked: LmsLiveTestSubmission[]): Promise<void> {
    const base64 = this.buildExcelBase64(test, ranked);
    const safeTitle = test.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileUri = `${FileSystem.cacheDirectory}${safeTitle}_Results.xlsx`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `${test.title} Ranked Results (.xlsx)`,
      });
    }
  },

  async shareOrPrintPdf(test: LmsLiveTest, ranked: LmsLiveTestSubmission[]): Promise<void> {
    const rowsHtml = ranked
      .map((r, i) => {
        const rank = r.rank > 0 ? r.rank : i + 1;
        return `
          <tr>
            <td>#${rank}</td>
            <td>${escapeHtml(r.studentName)}</td>
            <td>${escapeHtml(r.phoneNumber)}</td>
            <td>${escapeHtml(r.location)}</td>
            <td>${r.correctCount}</td>
            <td>${r.wrongCount}</td>
            <td>${r.marksObtained.toFixed(0)}</td>
            <td>${r.percentage.toFixed(1)}%</td>
            <td>${new Date(r.submittedAt).toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0F172A; }
            h1 { font-size: 18px; color: #0B2545; margin-bottom: 4px; }
            p { font-size: 11px; color: #475569; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #0B2545; color: white; padding: 6px; text-align: left; }
            td { border: 1px solid #EADBBE; padding: 6px; }
            tr:nth-child(even) { background-color: #FAF7EE; }
          </style>
        </head>
        <body>
          <h1>Tenali Exams Publishers — Live Test Merit List</h1>
          <p>${escapeHtml(test.title)} | Date: ${new Date(test.testDate).toDateString()} | Questions: ${test.questionCount} | Submissions: ${ranked.length}</p>
          <table>
            <thead>
              <tr>
                <th>Rank</th><th>Name</th><th>Phone</th><th>Location</th>
                <th>Correct</th><th>Wrong</th><th>Marks</th><th>%</th><th>Submitted</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${test.title} Merit List`,
      });
    }
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
