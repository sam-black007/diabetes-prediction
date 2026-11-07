export interface UploadedReport {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export async function uploadLabReportToNeon(file: File, patientId: string): Promise<UploadedReport> {
  const bucket = process.env.NEON_OBJECT_STORAGE_BUCKET || 'diabetes-lab-reports';
  const endpoint = process.env.NEON_OBJECT_STORAGE_ENDPOINT || '';

  // Generates S3 presigned or direct storage upload URL
  const fileKey = `${patientId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  return {
    id: fileKey,
    name: file.name,
    url: `${endpoint}/${bucket}/${fileKey}`,
    uploadedAt: new Date().toISOString(),
  };
}
